import { Coordinate } from '@common/interfaces/coordinate';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { PartyService } from '@app/services/party/party.service';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { WsEventClient } from '@common/enums/web-socket-event';
import { ItemType } from '@common/enums/item';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { LogTypeEvent } from '@common/enums/log-type';
import { Container } from 'typedi';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { SendingOptions } from '@common/enums/sending-options';
import { isAtDistanceEdge, sameCoordinate } from '@app/utils/helper';

export class RespawnManager {
    private partyService: PartyService;
    private partyListener: PartyEventListener;

    constructor(
        private partyId: string,
        private mapManager: MapManager,
    ) {
        this.partyService = Container.get(PartyService);
        this.partyListener = Container.get(PartyEventListener);
    }

    replacePlayer(loserId: string): void {
        const loserPlayer = this.partyService.getPlayer(this.partyId, loserId);
        const startPosition = loserPlayer.currentPosition;
        const newPosition = this.determineNewPosition(loserPlayer);
        this.updatePlayerPosition(loserPlayer, newPosition);
        this.notifyPlayerMovement(loserPlayer);
        this.replaceItems(loserId, startPosition);
    }

    teleportPlayer(playerId: string, pos: Coordinate) {
        const player = this.partyService.getPlayer(this.partyId, playerId);
        if (sameCoordinate(player.currentPosition, pos)) return;
        const allPlayers = this.partyService.getPlayers(this.partyId);
        if (this.isPositionOccupied(allPlayers, pos, playerId)) return;
        this.updatePlayerPosition(player, pos);
        this.notifyPlayerMovement(player);
    }

    replaceItem(playerId: string, item: ItemType) {
        const pos = this.partyService.getPlayer(this.partyId, playerId).currentPosition;
        this.partyService.removePlayerItem(this.partyId, playerId, item);
        PartyHelper.sendEvent(this.partyId, WsEventClient.ReplaceItem, { item, position: pos });
        PartyHelper.sendEvent(playerId, WsEventClient.UpdateItem);
        this.mapManager.addItem(item, { x: pos.y, y: pos.x });
        this.partyService.getParty(this.partyId).isChoosingItem = false;
    }

    replaceItems(playerId: string, startingPosition: Coordinate) {
        const items = this.partyService.getPlayerItems(this.partyId, playerId);
        this.sendLossFlagLogSignalIfItemIsFlag(playerId);
        this.partyService.removeAllPlayerItem(this.partyId, playerId);
        const allPlayers = this.partyService.getPlayers(this.partyId);
        items.forEach((item) => {
            this.findGoodPositionAndPlaceTheItemLost(startingPosition, allPlayers, item);
        });
    }

    private findGoodPositionAndPlaceTheItemLost(startingPosition: Coordinate, allPlayers: PlayerInfos[], item: ItemType): void {
        let pos = startingPosition;
        if (this.isPositionOccupied(allPlayers, pos, null, true)) pos = this.findNearestFreePosition(pos, allPlayers);
        PartyHelper.sendEvent(this.partyId, WsEventClient.ReplaceItem, { item, position: pos });
        this.mapManager.addItem(item, { x: pos.y, y: pos.x });
    }

    private sendLossFlagLogSignalIfItemIsFlag(playerId: string): void {
        if (this.partyService.getPlayer(this.partyId, playerId).hasFlag)
            this.partyListener.emit(LogTypeEvent.LossTheFlag, {
                partyId: this.partyId,
                logParameters: { event: LogTypeEvent.LossTheFlag, playerIds: [playerId] },
                options: SendingOptions.Broadcast,
            });
    }

    private determineNewPosition(loserPlayer: PlayerInfos): Coordinate {
        const allPlayers = this.partyService.getPlayers(this.partyId);
        const isStartPositionOccupied = this.isPositionOccupied(allPlayers, loserPlayer.startPosition, loserPlayer.pid);
        return isStartPositionOccupied
            ? this.findNearestFreePosition(loserPlayer.startPosition, allPlayers, loserPlayer.pid)
            : loserPlayer.startPosition;
    }

    private updatePlayerPosition(player: PlayerInfos, newPosition: Coordinate): void {
        this.partyService.updatePlayerPosition(this.partyId, player.pid, { x: newPosition.y, y: newPosition.x });
    }

    private notifyPlayerMovement(player: PlayerInfos): void {
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerMoving, player);
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerEndMoving, this.partyService.getPlayers(this.partyId));
    }

    private isPositionOccupied(
        players: PlayerInfos[],
        position: Coordinate,
        playerId: string = null,
        considerStartingPoint: boolean = false,
    ): boolean {
        const isOccupiedByOtherPlayer = players.some((player) => this.isPositionOccupiedByPlayer(player, position, playerId));
        return this.isInvalidOrBlockedPosition(position, considerStartingPoint) || isOccupiedByOtherPlayer;
    }

    private isInvalidOrBlockedPosition(position: Coordinate, considerStartingPoint: boolean): boolean {
        const pos = { x: position.y, y: position.x };
        const isValidPosition = this.mapManager.isValidPosition(pos);
        const isDoorAtPosition = this.mapManager.isDoor(pos);
        const hasItem = this.mapManager.hasItem(pos);
        const hasStartingPoint = considerStartingPoint ? this.mapManager.hasStartingPoint(pos) : false;
        return !isValidPosition || isDoorAtPosition || hasItem || hasStartingPoint;
    }

    private isPositionOccupiedByPlayer(player: PlayerInfos, position: Coordinate, loserId: string = null): boolean {
        if (this.isInvalidPlayerOrPosition(player, position)) return false;
        const isDifferentFromLoser: boolean = loserId === null ? true : player.pid !== loserId;
        const onSameX: boolean = player.currentPosition?.x === position.x;
        const onSameY: boolean = player.currentPosition?.y === position.y;
        return isDifferentFromLoser && onSameX && onSameY;
    }

    private isInvalidPlayerOrPosition(player: PlayerInfos, position: Coordinate): boolean {
        return !(player && position && !player.isGiveUp);
    }

    private findNearestFreePosition(position: Coordinate, players: PlayerInfos[], loserId: string = null): Coordinate {
        let distance = 1;
        let freePosition: Coordinate | undefined;
        do {
            const positionsToCheck = this.getPositionsAtDistance(position, distance);
            freePosition = positionsToCheck.find((pos) => !this.isPositionOccupied(players, pos, loserId));
            distance++;
        } while (!freePosition);

        return freePosition;
    }

    private getPositionsAtDistance(position: Coordinate, distance: number): Coordinate[] {
        if (distance <= 0) return [];
        const positions: Coordinate[] = [];
        for (let dx = -distance; dx <= distance; dx++) {
            for (let dy = -distance; dy <= distance; dy++) {
                if (isAtDistanceEdge(dx, dy, distance)) {
                    const pos = { x: position.x + dx, y: position.y + dy };
                    if (this.mapManager.isOutOfBounds(pos)) continue;
                    positions.push(pos);
                }
            }
        }
        return positions;
    }
}
