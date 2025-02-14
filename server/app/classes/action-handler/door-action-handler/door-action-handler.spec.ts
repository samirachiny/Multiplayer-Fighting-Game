/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { DoorActionHandler } from './door-action-handler';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { PartyService } from '@app/services/party/party.service';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { Coordinate } from '@common/interfaces/coordinate';
import { TileType, DoorState } from '@common/enums/tile';
import { LogTypeEvent } from '@common/enums/log-type';
import { WsEventClient } from '@common/enums/web-socket-event';
import { BASE_TILE_DECIMAL } from '@app/utils/const';
import { Party } from '@common/interfaces/party';
import { Game } from '@common/interfaces/game';
import { GameEventType } from '@common/enums/game-event-type';

describe('DoorActionHandler', () => {
    let handler: DoorActionHandler;
    let mockMapManager: sinon.SinonStubbedInstance<MapManager>;
    let mockPartyService: sinon.SinonStubbedInstance<PartyService>;
    let mockPartyEventListener: sinon.SinonStubbedInstance<PartyEventListener>;
    let sendEventStub: sinon.SinonStub;

    const mockPartyId = 'testPartyId';
    const mockPlayerId = 'player1';
    const mockPosition: Coordinate = { x: 5, y: 5 };
    const mockGame: Game = {
        gid: 'valid-gid',
        name: 'Valid Game',
        description: 'A valid game description',
        mode: undefined,
        mapSize: 10,
        creationDate: undefined,
        lastEditDate: undefined,
        imageBase64: '',
        isVisible: false,
        gameMap: [
            [10, 10, 10, 10, 10, 30, 18, 15, 10, 10],
            [10, 0, 0, 10, 10, 12, 10, 10, 10, 10],
            [10, 0, 10, 10, 10, 30, 0, 10, 10, 10],
            [10, 0, 10, 0, 10, 10, 10, 10, 10, 10],
            [10, 0, 10, 0, 10, 30, 30, 10, 10, 10],
            [18, 0, 0, 0, 10, 30, 30, 10, 10, 10],
            [10, 0, 0, 0, 10, 30, 30, 10, 10, 10],
            [10, 10, 10, 10, 0, 30, 30, 30, 10, 10],
            [10, 10, 10, 10, 50, 30, 30, 30, 10, 10],
            [10, 10, 10, 10, 0, 30, 10, 10, 10, 10],
        ],
    };

    const mockParty: Party = {
        id: mockPartyId,
        charactersOccupiedIds: new Map(),
        chatMessages: [],
        game: mockGame,
        isLocked: false,
        accessCode: 0,
        logs: [],
        isDebugMode: false,
    };

    beforeEach(() => {
        mockMapManager = sinon.createStubInstance(MapManager);
        mockPartyService = sinon.createStubInstance(PartyService);
        mockPartyEventListener = sinon.createStubInstance(PartyEventListener);

        sendEventStub = sinon.stub(PartyHelper, 'sendEvent');

        handler = new DoorActionHandler(mockPartyId, mockMapManager as unknown as MapManager);
        (handler as any).partyService = mockPartyService;
        (handler as any).partyEventListener = mockPartyEventListener;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('toggleDoor', () => {
        it('should call processDoorToggle and emit a door event', () => {
            const processDoorToggleStub = sinon.stub(handler as any, 'processDoorToggle');
            const resolveDoorEventStub = sinon.stub(handler as any, 'resolveDoorEvent').returns(LogTypeEvent.OpenDoor);

            handler.toggleDoor(mockPlayerId, mockPosition);

            expect(processDoorToggleStub.calledWith(mockPlayerId, mockPosition)).to.equal(true);
            expect(resolveDoorEventStub.calledWith(mockPosition)).to.equal(true);
            expect(mockPartyEventListener.emit.calledWith(LogTypeEvent.OpenDoor)).to.equal(true);
        });
    });

    describe('processDoorToggle', () => {
        it('should decrement remaining actions, update map, and emit events', () => {
            mockPartyService.getParty.returns(mockParty);
            mockMapManager.isOpenDoor.returns(false);
            const resolveDoorValueStub = sinon.stub(handler as any, 'resolveDoorValue').returns(100);
            const resolveDoorStateStub = sinon.stub(handler as any, 'resolveDoorState').returns(DoorState.Closed);
            handler['processDoorToggle'](mockPlayerId, mockPosition);
            expect(mockPartyService.decrementRemainingAction.calledWith(mockPartyId, mockPlayerId)).to.equal(true);
            expect(mockPartyService.updateMap.calledWith(mockPartyId, mockPosition, 100)).to.equal(true);
            expect(resolveDoorValueStub.calledWith(mockPosition)).to.equal(true);
            expect(resolveDoorStateStub.calledWith(mockPosition)).to.equal(true);
            expect(mockPartyEventListener.emit.calledWith(GameEventType.DoorManipulated, { partyId: mockPartyId, coord: mockPosition })).to.equal(
                true,
            );
            expect(sendEventStub.calledWith(mockPartyId, WsEventClient.DoorToggled)).to.equal(true);
        });

        it('should call PartyHelper.sendEvent with correct door position and state', () => {
            mockPartyService.getParty.returns(mockParty);
            mockMapManager.isOpenDoor.returns(false);
            const resolveDoorStateStub = sinon.stub(handler as any, 'resolveDoorState').returns(DoorState.Closed);
            handler['processDoorToggle'](mockPlayerId, mockPosition);
            expect(
                sendEventStub.calledWith(mockPartyId, WsEventClient.DoorToggled, {
                    doorPosition: { x: mockPosition.y, y: mockPosition.x },
                    doorState: DoorState.Closed,
                }),
            ).to.equal(true);
            expect(resolveDoorStateStub.calledWith(mockPosition)).to.equal(true);
        });

        it('should handle a door already open correctly', () => {
            mockPartyService.getParty.returns(mockParty);
            mockMapManager.isOpenDoor.returns(true);
            const resolveDoorStateStub = sinon.stub(handler as any, 'resolveDoorState').returns(DoorState.Open);
            handler['processDoorToggle'](mockPlayerId, mockPosition);
            expect(
                sendEventStub.calledWith(mockPartyId, WsEventClient.DoorToggled, {
                    doorPosition: { x: mockPosition.y, y: mockPosition.x },
                    doorState: DoorState.Open,
                }),
            ).to.equal(true);

            expect(resolveDoorStateStub.calledWith(mockPosition)).to.equal(true);
        });
    });

    describe('resolveDoorValue', () => {
        it('should return DoorClosed value if the door is open', () => {
            mockMapManager.isOpenDoor.returns(true);
            const result = handler['resolveDoorValue'](mockPosition);
            expect(result).to.equal(TileType.DoorClosed * BASE_TILE_DECIMAL);
        });

        it('should return DoorOpen value if the door is closed', () => {
            mockMapManager.isOpenDoor.returns(false);
            const result = handler['resolveDoorValue'](mockPosition);
            expect(result).to.equal(TileType.DoorOpen * BASE_TILE_DECIMAL);
        });
    });

    describe('resolveDoorState', () => {
        it('should return DoorState.Open if the door is open', () => {
            mockMapManager.isOpenDoor.returns(true);
            const result = handler['resolveDoorState'](mockPosition);
            expect(result).to.equal(DoorState.Open);
        });

        it('should return DoorState.Closed if the door is closed', () => {
            mockMapManager.isOpenDoor.returns(false);
            const result = handler['resolveDoorState'](mockPosition);
            expect(result).to.equal(DoorState.Closed);
        });
    });

    describe('resolveDoorEvent', () => {
        it('should return OpenDoor if the door is open', () => {
            mockMapManager.isOpenDoor.returns(true);
            const result = handler['resolveDoorEvent'](mockPosition);
            expect(result).to.equal(LogTypeEvent.OpenDoor);
        });

        it('should return CloseDoor if the door is closed', () => {
            mockMapManager.isOpenDoor.returns(false);
            const result = handler['resolveDoorEvent'](mockPosition);
            expect(result).to.equal(LogTypeEvent.CloseDoor);
        });
    });
});
