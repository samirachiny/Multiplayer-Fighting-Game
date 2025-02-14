import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { PartyService } from '@app/services/party/party.service';
import { PartyInfos } from '@common/interfaces/party';
import { Coordinate } from '@common/interfaces/coordinate';
import { ItemType } from '@common/enums/item';
import { WsEventClient } from '@common/enums/web-socket-event';
import { ActionManager } from '@app/classes/action-manager/action-manager';
import { LogTypeEvent } from '@common/enums/log-type';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { ItemService } from '@app/services/item/item.service';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { VICTORIES_REQUIRED_TO_WIN } from '@app/utils/const';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { GameMode } from '@common/enums/game-infos';
import { Subscription } from 'rxjs';
import { Container } from 'typedi';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { GameEventType } from '@common/enums/game-event-type';
import { SendingOptions } from '@common/enums/sending-options';
import { MovementManager } from '@app/classes/movement-manager/movement-manager';
import { VirtualPlayerManager } from '@app/classes/virtual-player/virtual-player';
import { EventEmitter } from 'events';
import { VirtualPlayerEvent } from '@common/enums/virtual-player-event';
import { sameCoordinate } from '@app/utils/helper';
import { EndFightEvent } from '@common/types/end-fight-event';

export class PartyManager {
    private partyService: PartyService;
    private itemService: ItemService;
    private partyListener: PartyEventListener;
    private turnManager: TurnManager;
    private actionManager: ActionManager;
    private mapManager: MapManager;
    private movementManager: MovementManager;
    private virtualPlayerManager: VirtualPlayerManager;
    private subscriptions: Subscription;
    private eventVirtualPlayer: EventEmitter;

    constructor(private partyId: string) {
        this.partyService = Container.get(PartyService);
        this.itemService = Container.get(ItemService);
        this.partyListener = Container.get(PartyEventListener);
        this.removeRandomItems();
        this.mapManager = new MapManager();
        this.mapManager.setMap(this.partyService.getMap(partyId));
        this.partyListener.emit(GameEventType.PartyBegin, {
            partyId: this.partyId,
            totalWalkableTile: this.mapManager.getTotalWalkableTiles(),
            totalDoor: this.mapManager.getTotalDoors(),
        });
        this.turnManager = new TurnManager(this.partyId);
        this.movementManager = new MovementManager(this.mapManager);
        this.eventVirtualPlayer = new EventEmitter();
        this.actionManager = new ActionManager(partyId, this.turnManager, this.mapManager, this.movementManager);
        this.listenVirtualPlayerEventAndProcess();
        this.virtualPlayerManager = new VirtualPlayerManager(partyId, this.mapManager);
        this.virtualPlayerManager.setVirtualPlayerEvent(this.eventVirtualPlayer);
        this.virtualPlayerManager.listenVirtualPlayerEventAndProcess();
        this.subscriptions = new Subscription();
    }

    destroy(): void {
        this.turnManager.destroyTurnCycle();
        this.subscriptions.unsubscribe();
        this.virtualPlayerManager.destroy();
        this.actionManager.destroy();
        this.eventVirtualPlayer.removeAllListeners();
    }

    startGame(): void {
        this.partyListener.emit(LogTypeEvent.BeginParty, {
            partyId: this.partyId,
            logParameters: { event: LogTypeEvent.BeginParty },
            options: SendingOptions.Broadcast,
        });
        this.partyService.setLock(this.partyId, true);
        this.assignPlayersStartPosition();
        this.subscriptions.add(
            this.actionManager.getFightEndEventSignal().subscribe((data: EndFightEvent) => {
                this.handleGameEnd(data.winnerId);
                if (data.sendEndFightToBot) this.eventVirtualPlayer.emit(VirtualPlayerEvent.EndFight);
            }),
        );
        this.subscriptions.add(
            this.turnManager.isVirtualPlayer$.subscribe((playerId: string) => {
                this.eventVirtualPlayer.emit(VirtualPlayerEvent.BeginRound, playerId);
            }),
        );
        PartyHelper.sendEvent(this.partyId, WsEventClient.PartyStart);
        this.turnManager.initializeTurnCycle();
    }

    listenVirtualPlayerEventAndProcess() {
        this.eventVirtualPlayer.on(VirtualPlayerEvent.StartMoving, async (data: { playerId: string; pos: Coordinate }) => {
            if (!this.partyService.getPlayer(this.partyId, data.playerId).isCurrentPlayer) return;
            await this.movePlayer(data.playerId, data.pos);
            if (this.actionManager.isTurnOver(data.playerId)) return this.endRound(data.playerId);
            this.eventVirtualPlayer.emit(VirtualPlayerEvent.EndMoving);
        });

        this.eventVirtualPlayer.on(VirtualPlayerEvent.StartFight, (data: { playerId: string; pos: Coordinate }) =>
            this.handleVitualPlayerAction(VirtualPlayerEvent.StartFight, data),
        );

        this.eventVirtualPlayer.on(VirtualPlayerEvent.OpenDoor, (data: { playerId: string; pos: Coordinate }) =>
            this.handleVitualPlayerAction(VirtualPlayerEvent.OpenDoor, data),
        );

        this.eventVirtualPlayer.on(VirtualPlayerEvent.EndRound, (playerId) => this.endRound(playerId));
    }

    getFighters(): FightParticipants {
        return this.actionManager.getFighters();
    }

    getPartyInfos(setPartyInfos: (partyInfos: PartyInfos) => void): void {
        const party = this.partyService.getParty(this.partyId);
        if (!party) return;
        setPartyInfos({
            game: party.game,
            players: this.partyService.getOrderPlayers(this.partyId),
        });
    }

    getAccessiblePositions(playerId: string): Coordinate[] {
        return this.movementManager.getAccessiblePositions(playerId, this.partyService.getPlayers(this.partyId));
    }

    getInteractivePositions(playerId: string): Coordinate[] {
        const player = this.partyService.getPlayer(this.partyId, playerId);
        if (!player) return [];
        return this.actionManager.getInteractivePositions(player);
    }

    getPath(playerId: string, endPosition: Coordinate): Coordinate[] {
        return this.movementManager.getPlayerPathTo(this.partyService.getPlayer(this.partyId, playerId), endPosition);
    }

    executeAction(playerId: string, pos: Coordinate) {
        this.actionManager.executeAction(playerId, pos);
    }

    async handleAttack() {
        await this.actionManager.handleAttack();
    }

    async handleEscape() {
        await this.actionManager.handleEscape();
    }

    async handleGiveUpInFight(playerId: string): Promise<boolean> {
        return await this.actionManager.handleGiveUpWithFight(playerId);
    }

    async movePlayer(playerId: string, finalPosition: Coordinate) {
        const isMoveFinished = await this.actionManager.move(playerId, finalPosition);
        if (this.isPartyModeCTF()) this.handleGameEnd(playerId);
        if (this.turnManager.isCurrentPlayer(playerId)) {
            if (!isMoveFinished || this.actionManager.isTurnOver(playerId)) this.endRound(playerId);
            return;
        }
        this.partyService.resetAttributePlayer(this.partyId, playerId);
        PartyHelper.sendEvent(playerId, WsEventClient.AvailableMoveUpdated);
    }

    teleportPlayerTo(playerId: string, pos: Coordinate) {
        this.actionManager.teleportPlayer(playerId, pos);
        if (this.isPartyModeCTF()) this.handleGameEnd(playerId);
    }

    toggleDebugMode(playerId: string) {
        const party = this.partyService.getParty(this.partyId);
        if (!(party && this.partyService.getPlayer(this.partyId, playerId)?.isOrganizer)) return;
        this.partyService.togglePartyMode(this.partyId);
        PartyHelper.sendEvent(this.partyId, WsEventClient.PartyModeToggled, this.partyService.isDebugMode(this.partyId));
        const debugEvent = this.partyService.isDebugMode(this.partyId) ? LogTypeEvent.DebugOn : LogTypeEvent.DebugOff;
        this.partyListener.emit(debugEvent, {
            partyId: this.partyId,
            logParameters: { event: debugEvent, playerIds: [playerId] },
            options: SendingOptions.Broadcast,
        });
    }

    giveUp(playerId: string): boolean {
        return this.actionManager.giveUp(playerId);
    }

    removePlayerItem(playerId: string, item: ItemType): void {
        this.actionManager.removePlayerItem(playerId, item);
        if (this.actionManager.isTurnOver(playerId)) this.endRound(playerId);
    }

    endRound(playerId: string): void {
        this.turnManager.endRound(playerId);
    }

    private handleGameEnd(playerId: string): void {
        if (!(playerId && this.checkIfGameWonBy(playerId))) return;
        this.handleGameWin(playerId);
        this.destroy();
    }

    private isPartyModeCTF(): boolean {
        return this.partyService.getPartyGameMode(this.partyId) === GameMode.Flag;
    }

    private handleGameWin(winnerId: string): void {
        const player: PlayerInfos = this.partyService.getPlayer(this.partyId, winnerId);
        this.partyListener.emit(LogTypeEvent.EndGame, {
            partyId: this.partyId,
            logParameters: { event: LogTypeEvent.EndGame, playerIds: [winnerId] },
            options: SendingOptions.Broadcast,
            winner: player.name,
        });
        PartyHelper.sendEvent(this.partyId, WsEventClient.GameEnd, player);
    }

    private checkIfGameWonBy(playerId: string): boolean {
        const player: PlayerInfos = this.partyService.getPlayer(this.partyId, playerId);
        const hasRequiredVictoryToWinParty = player.wins === VICTORIES_REQUIRED_TO_WIN;
        const isPlayerAtHisStartPosition = sameCoordinate(player.startPosition, player.currentPosition);
        const hasFlagAndCanWinParty = player.hasFlag && isPlayerAtHisStartPosition;
        return hasRequiredVictoryToWinParty || hasFlagAndCanWinParty;
    }

    private assignPlayersStartPosition(): void {
        const startPositions: Coordinate[] = this.partyService.getStartPositions(this.partyId);
        let index = 0;
        this.partyService.getPlayers(this.partyId).forEach((player) => {
            const position = startPositions[index];
            player.startPosition = position;
            player.previousPosition = position;
            player.currentPosition = position;
            this.partyListener.emit(GameEventType.TileVisited, { partyId: this.partyId, playerId: player.pid, coord: position });
            index++;
        });
    }

    private removeRandomItems(): void {
        this.itemService.removeRandomItems(this.partyService.getParty(this.partyId));
    }

    private handleVitualPlayerAction(event: VirtualPlayerEvent, data: { playerId: string; pos: Coordinate }): void {
        if (!this.partyService.getPlayer(this.partyId, data.playerId).isCurrentPlayer) return;
        this.executeAction(data.playerId, data.pos);
        if (event === VirtualPlayerEvent.StartFight) return;
        if (this.actionManager.isTurnOver(data.playerId)) return this.endRound(data.playerId);
        this.eventVirtualPlayer.emit(VirtualPlayerEvent.DoorOpened);
    }
}
