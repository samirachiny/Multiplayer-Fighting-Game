import { MapManager } from '@app/classes/map-manager/map-manager';
import { MovementManager } from '@app/classes/movement-manager/movement-manager';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { PartyService } from '@app/services/party/party.service';
import { Container } from 'typedi';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { WsEventClient } from '@common/enums/web-socket-event';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { Coordinate } from '@common/interfaces/coordinate';
import { MAX_ITEMS, MOVE_TIME_INTERVAL, TIME_WAITING_AFTER_SLIP } from '@app/utils/const';
import { delay, sameCoordinate } from '@app/utils/helper';
import { GameEventType } from '@common/enums/game-event-type';
import { SendingOptions } from '@common/enums/sending-options';
import { LogTypeEvent } from '@common/enums/log-type';

export class MovementActionHandler {
    private partyService: PartyService;
    private partyEventListener: PartyEventListener;
    private respawnManager: RespawnManager;

    constructor(
        private partyId: string,
        private mapManager: MapManager,
        private movementManager: MovementManager,
    ) {
        this.partyService = Container.get(PartyService);
        this.partyEventListener = Container.get(PartyEventListener);
        this.respawnManager = new RespawnManager(partyId, this.mapManager);
    }

    async move(playerId: string, finalPosition: Coordinate): Promise<boolean> {
        const player = this.partyService.getPlayer(this.partyId, playerId);
        this.movementManager.initMove(this.partyService.getPlayers(this.partyId), player.pid);
        for (const pos of this.movementManager.getPlayerPathTo(player, finalPosition)) {
            await this.movePlayerTo(playerId, player, pos);
            this.checkIfPlayerCanWinInMoveAndHandleGameEnd(player);
            this.partyEventListener.emit(GameEventType.TileVisited, { partyId: this.partyId, playerId, coord: pos });
            if (await this.detectSlipped(pos, player)) return false;
            if (this.pickUpItem(pos, player)) return true;
        }
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerEndMoving, this.partyService.getPlayers(this.partyId));
        return true;
    }

    teleportPlayer(playerId: string, pos: Coordinate) {
        this.respawnManager.teleportPlayer(playerId, pos);
        this.partyEventListener.emit(GameEventType.TileVisited, { partyId: this.partyId, coord: pos });
    }

    private checkIfPlayerCanWinInMoveAndHandleGameEnd(player: PlayerInfos): void {
        if (this.hasPlayerReachedStartWithFlag(player)) {
            this.partyEventListener.emit(LogTypeEvent.EndGame, {
                partyId: this.partyId,
                logParameters: { event: LogTypeEvent.EndGame },
                options: SendingOptions.Broadcast,
            });
            PartyHelper.sendEvent(this.partyId, WsEventClient.GameEnd, player.name);
        }
    }

    private hasPlayerReachedStartWithFlag(player: PlayerInfos): boolean {
        return player.hasFlag && sameCoordinate(player.currentPosition, player.startPosition);
    }

    private async movePlayerTo(playerId: string, player: PlayerInfos, position: Coordinate): Promise<void> {
        this.partyService.updatePlayerPosition(this.partyId, playerId, position);
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerMoving, player);
        await delay(MOVE_TIME_INTERVAL);
        this.updatePlayerRemainingMoves(playerId, position);
    }

    private updatePlayerRemainingMoves(playerId: string, position: Coordinate): void {
        const remainingMoves = this.movementManager.getNode(position).remainingMoves;
        this.partyService.setPlayerAvailableMove(this.partyId, playerId, remainingMoves);
    }

    private async detectSlipped(pos: Coordinate, player: PlayerInfos): Promise<boolean> {
        if (this.partyService.isDebugMode(this.partyId)) return false;
        if (this.movementManager.hasSlipped(pos, this.partyService.hasPartyDoubleIceBreak(this.partyId))) {
            PartyHelper.sendEvent(this.partyId, WsEventClient.IceBroken, pos);
            await delay(TIME_WAITING_AFTER_SLIP);
            PartyHelper.sendEvent(this.partyId, WsEventClient.ReplacePlayerAfterIceBroken, player);
            PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerEndMoving, this.partyService.getPlayers(this.partyId));
            return true;
        }
        return false;
    }

    private pickUpItem(pos: Coordinate, player: PlayerInfos): boolean {
        if (this.isUnableToPickupItem(pos, player)) return false;
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerEndMoving, this.partyService.getPlayers(this.partyId));
        this.addItemToPlayer(pos, player);
        if (this.wasInventoryFull(player)) {
            this.partyService.getParty(this.partyId).isChoosingItem = true;
            PartyHelper.sendEvent(player.pid, WsEventClient.ChooseItemToRemove);
        }
        this.updateMap(pos);
        PartyHelper.sendEvent(this.partyId, WsEventClient.RemoveItem, pos);
        return true;
    }

    private isUnableToPickupItem(pos: Coordinate, player: PlayerInfos): boolean {
        return !this.hasItem(pos) || (player.isVirtualPlayer && player.items.length === MAX_ITEMS);
    }

    private hasItem(pos: Coordinate): boolean {
        return this.mapManager.hasItem(pos);
    }

    private wasInventoryFull(player: PlayerInfos): boolean {
        return this.partyService.getPlayerItems(this.partyId, player.pid).length > MAX_ITEMS;
    }

    private updateMap(pos: Coordinate): void {
        this.partyService.updateMap(this.partyId, pos, this.mapManager.getTile(pos));
    }

    private addItemToPlayer(pos: Coordinate, player: PlayerInfos): void {
        this.resolveItemEventAndSendItemLog(pos, player.pid);
        const item = this.mapManager.removeItem(pos);
        this.partyEventListener.emit(GameEventType.ItemCount, { partyId: this.partyId, player, item });
        this.partyService.addPlayerItem(this.partyId, player.pid, item);
        PartyHelper.sendEvent(player.pid, WsEventClient.UpdateItem);
    }

    private resolveItemEventAndSendItemLog(position: Coordinate, playerPid: string): void {
        const itemEvent: LogTypeEvent = this.mapManager.hasFlag(position) ? LogTypeEvent.CollectFlag : LogTypeEvent.CollectItem;
        this.partyEventListener.emit(itemEvent, {
            partyId: this.partyId,
            logParameters: { event: itemEvent, playerIds: [playerPid] },
            options: SendingOptions.Broadcast,
        });
    }
}
