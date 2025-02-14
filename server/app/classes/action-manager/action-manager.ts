import { Coordinate } from '@common/interfaces/coordinate';
import { MovementManager } from '@app/classes/movement-manager/movement-manager';
import { PartyService } from '@app/services/party/party.service';
import { WsEventClient } from '@common/enums/web-socket-event';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { LogTypeEvent } from '@common/enums/log-type';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { ItemType } from '@common/enums/item';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { Container } from 'typedi';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { SendingOptions } from '@common/enums/sending-options';
import { sameCoordinate } from '@app/utils/helper';
import { DoorActionHandler } from '@app/classes/action-handler/door-action-handler/door-action-handler';
import { FightActionHandler } from '@app/classes/action-handler/fight-action-handler/fight-action-handler';
import { Observable } from 'rxjs';
import { MovementActionHandler } from '@app/classes/action-handler/movement-action-handler/movement-action-handler';
import { GiveUpActionHandler } from '@app/classes/action-handler/give-up-action-handler/give-up-action-handler';
import { EndFightEvent } from '@common/types/end-fight-event';

export class ActionManager {
    private partyService: PartyService;
    private partyEventListener: PartyEventListener;
    private respawnManager: RespawnManager;
    private doorAction: DoorActionHandler;
    private fightAction: FightActionHandler;
    private moveAction: MovementActionHandler;
    private giveUpAction: GiveUpActionHandler;

    constructor(
        private partyId: string,
        private turnManager: TurnManager,
        private mapManager: MapManager,
        private movementManager: MovementManager,
    ) {
        this.partyService = Container.get(PartyService);
        this.partyEventListener = Container.get(PartyEventListener);
        this.respawnManager = new RespawnManager(partyId, this.mapManager);
        this.doorAction = new DoorActionHandler(partyId, mapManager);
        this.fightAction = new FightActionHandler(partyId, turnManager, mapManager);
        this.moveAction = new MovementActionHandler(partyId, mapManager, movementManager);
        this.giveUpAction = new GiveUpActionHandler(partyId, turnManager, this.respawnManager);
    }

    destroy() {
        this.fightAction.destroy();
    }

    executeAction(playerId: string, pos: Coordinate): void {
        if (this.isUnableToExecuteAction(playerId, pos)) {
            PartyHelper.sendEvent(this.partyId, WsEventClient.ActionFinished);
            return;
        }
        if (this.hasNeighborEnemy(pos)) {
            this.handleFightAction(playerId, pos);
            return;
        }
        if (this.mapManager.isDoor(pos)) {
            this.handleDoorAction(playerId, pos);
            return;
        }
        PartyHelper.sendEvent(this.partyId, WsEventClient.ActionFinished);
    }

    async handleAttack() {
        await this.fightAction.handleAttack();
    }

    async handleEscape() {
        await this.fightAction.handleEscape();
    }

    async handleGiveUpWithFight(playerId: string): Promise<boolean> {
        await this.fightAction.handleGiveUp(playerId);
        return this.giveUp(playerId);
    }

    getFightEndEventSignal(): Observable<EndFightEvent> {
        return this.fightAction.getFightEndEventSignal();
    }

    getFighters(): FightParticipants {
        return this.fightAction.getFighters();
    }

    async move(playerId: string, finalPosition: Coordinate): Promise<boolean> {
        return this.moveAction.move(playerId, finalPosition);
    }

    teleportPlayer(playerId: string, pos: Coordinate) {
        this.moveAction.teleportPlayer(playerId, pos);
    }

    isTurnOver(playerId: string): boolean {
        const players: PlayerInfos[] = this.partyService.getPlayers(this.partyId);
        const hasAvailableMoves = players.find((p) => p.pid === playerId)?.availableMoves > 0;
        const hasAccessiblePositions = this.movementManager.getAccessiblePositions(playerId, players).length > 1;
        return !(
            (hasAvailableMoves && hasAccessiblePositions) ||
            this.hasActionsLeft(playerId) ||
            this.partyService.getParty(this.partyId)?.isChoosingItem
        );
    }

    giveUp(playerId: string): boolean {
        return this.giveUpAction.giveUp(playerId);
    }

    getInteractivePositions(player: PlayerInfos): Coordinate[] {
        const interactivePositions: Coordinate[] = [];
        this.mapManager.getAllNeighbors({ x: player.currentPosition.y, y: player.currentPosition.x }).forEach((pos) => {
            if (this.isInteractive(pos)) interactivePositions.push(pos);
        });
        return interactivePositions;
    }

    removePlayerItem(playerId: string, item: ItemType) {
        this.respawnManager.replaceItem(playerId, item);
        this.partyService.getParty(this.partyId).isChoosingItem = false;
        this.turnManager.resumeTurnTimer();
        if (item === ItemType.Flag) {
            this.partyEventListener.emit(LogTypeEvent.LossTheFlag, {
                partyId: this.partyId,
                logParameters: { event: LogTypeEvent.LossTheFlag, playerIds: [playerId] },
                options: SendingOptions.Broadcast,
            });
        }
    }

    private handleDoorAction(playerId: string, pos: Coordinate): void {
        this.doorAction.toggleDoor(playerId, pos);
        if (this.isTurnOver(playerId)) this.turnManager.endRound(playerId);
        PartyHelper.sendEvent(this.partyId, WsEventClient.ActionFinished);
    }

    private handleFightAction(playerId: string, pos: Coordinate): void {
        this.fightAction.initFight(playerId, pos, this.isTurnOver(playerId));
        PartyHelper.sendEvent(this.partyId, WsEventClient.ActionFinished);
    }

    private isUnableToExecuteAction(playerId: string, pos: Coordinate): boolean {
        const player: PlayerInfos = this.partyService.getPlayer(this.partyId, playerId);
        if (!player) return true;
        const interactivePositions = this.getInteractivePositions(player);
        const playerPosition = player.currentPosition;
        return (
            !this.hasActionsLeft(playerId) ||
            sameCoordinate(pos, { x: playerPosition.y, y: playerPosition.x }) ||
            !interactivePositions.some((position) => sameCoordinate(pos, position))
        );
    }

    private hasActionsLeft(playerId: string): boolean {
        const player = this.partyService.getPlayer(this.partyId, playerId);
        return player?.remainingAction > 0 && this.isAnyNeighborInteractive(player);
    }

    private isAnyNeighborInteractive(player: PlayerInfos): boolean {
        const neighbors: Coordinate[] = this.mapManager.getAllNeighbors({ x: player.currentPosition.y, y: player.currentPosition.x });
        return neighbors ? neighbors.some((pos) => this.hasNeighborEnemy(pos) || this.mapManager.isDoor(pos)) : false;
    }

    private isInteractive(pos: Coordinate): boolean {
        return this.hasNeighborEnemy(pos) || this.mapManager.isDoor(pos);
    }

    private hasNeighborEnemy(neighborPos: Coordinate): boolean {
        for (const player of this.partyService.getPlayers(this.partyId)) {
            if (!player.currentPosition) return false;
            if (!player.isGiveUp && sameCoordinate(neighborPos, { x: player.currentPosition.y, y: player.currentPosition.x })) return true;
        }
        return false;
    }
}
