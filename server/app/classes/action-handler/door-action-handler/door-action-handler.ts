import { MapManager } from '@app/classes/map-manager/map-manager';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { PartyService } from '@app/services/party/party.service';
import { BASE_TILE_DECIMAL } from '@app/utils/const';
import { GameEventType } from '@common/enums/game-event-type';
import { LogTypeEvent } from '@common/enums/log-type';
import { SendingOptions } from '@common/enums/sending-options';
import { DoorState, TileType } from '@common/enums/tile';
import { WsEventClient } from '@common/enums/web-socket-event';
import { Coordinate } from '@common/interfaces/coordinate';
import { ResponseToggleDoor } from '@common/interfaces/toggle-door-response';
import { Container } from 'typedi';

export class DoorActionHandler {
    private partyService: PartyService;
    private partyEventListener: PartyEventListener;

    constructor(
        private partyId: string,
        private mapManager: MapManager,
    ) {
        this.partyService = Container.get(PartyService);
        this.partyEventListener = Container.get(PartyEventListener);
    }

    toggleDoor(playerId: string, pos: Coordinate): void {
        this.processDoorToggle(playerId, pos);
        const doorEvent = this.resolveDoorEvent(pos);
        this.partyEventListener.emit(doorEvent, {
            partyId: this.partyId,
            logParameters: { event: doorEvent, playerIds: [playerId] },
            options: SendingOptions.Broadcast,
        });
    }

    private processDoorToggle(playerId: string, pos: Coordinate): void {
        this.partyService.decrementRemainingAction(this.partyId, playerId);
        this.partyService.updateMap(this.partyId, pos, this.resolveDoorValue(pos));
        this.partyEventListener.emit(GameEventType.DoorManipulated, { partyId: this.partyId, coord: pos });
        this.mapManager.setMap(this.partyService.getParty(this.partyId).game.gameMap);
        PartyHelper.sendEvent<ResponseToggleDoor>(this.partyId, WsEventClient.DoorToggled, {
            doorPosition: { x: pos.y, y: pos.x },
            doorState: this.resolveDoorState(pos),
        });
    }

    private resolveDoorValue(pos: Coordinate): number {
        return this.mapManager.isOpenDoor(pos) ? TileType.DoorClosed * BASE_TILE_DECIMAL : TileType.DoorOpen * BASE_TILE_DECIMAL;
    }

    private resolveDoorState(pos: Coordinate): DoorState {
        return this.mapManager.isOpenDoor(pos) ? DoorState.Open : DoorState.Closed;
    }

    private resolveDoorEvent(pos: Coordinate): LogTypeEvent {
        return this.mapManager.isOpenDoor(pos) ? LogTypeEvent.OpenDoor : LogTypeEvent.CloseDoor;
    }
}
