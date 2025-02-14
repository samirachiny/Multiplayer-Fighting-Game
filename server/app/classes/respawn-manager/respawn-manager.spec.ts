/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { PartyService } from '@app/services/party/party.service';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { WsEventClient } from '@common/enums/web-socket-event';
import { Coordinate } from '@common/interfaces/coordinate';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { Party } from '@common/interfaces/party';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { ItemType } from '@common/enums/item';
import { LogTypeEvent } from '@common/enums/log-type';
import { SendingOptions } from '@common/enums/sending-options';

describe('RespawnManager', () => {
    let respawnManager: RespawnManager;
    let mockPartyService: sinon.SinonStubbedInstance<PartyService>;
    let mockMapManager: sinon.SinonStubbedInstance<MapManager>;
    let sioStub: any;
    const mockPartyId = 'testPartyId';
    const mockLoserId = 'player1';
    const mockStartPosition: Coordinate = { x: 5, y: 5 };
    const mockNewPosition: Coordinate = { x: 6, y: 6 };
    const mockPlayerId = 'player1';
    const mockItem: ItemType = ItemType.Flag;

    const mockLoserPlayer: PlayerInfos = {
        pid: mockLoserId,
        name: 'Player1',
        startPosition: mockStartPosition,
        currentPosition: mockStartPosition,
        availableMoves: 0,
        isGiveUp: false,
        items: [],
    } as PlayerInfos;

    const mockPlayers = [mockLoserPlayer];

    beforeEach(() => {
        mockPartyService = sinon.createStubInstance(PartyService);
        mockMapManager = sinon.createStubInstance(MapManager);
        sioStub = {
            to: sinon.stub().returnsThis(),
            emit: sinon.stub().returnsThis(),
        };

        mockPartyService.getPlayer.returns(mockLoserPlayer);
        mockPartyService.getPlayers.returns(mockPlayers);
        mockPartyService.getParty.returns({
            game: {
                gameMap: [],
                gid: '',
                name: '',
                mode: undefined,
                mapSize: 0,
                description: '',
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
            },
        } as Party);
        mockMapManager.isValidPosition.returns(true);
        mockMapManager.isClosedDoor.returns(false);
        PartyHelper.init(sioStub);
        respawnManager = new RespawnManager(mockPartyId, mockMapManager);
        respawnManager['partyService'] = mockPartyService;
        respawnManager['mapManager'] = mockMapManager;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('replacePlayer', () => {
        it('should update player position to start position if not occupied', () => {
            const replaceItemsSpy = sinon.spy(respawnManager as any, 'replaceItems');
            sinon.stub(respawnManager as any, 'isPositionOccupied').returns(false);
            mockPartyService.getPlayerItems.returns([]);
            respawnManager.replacePlayer(mockLoserId);
            expect(
                mockPartyService.updatePlayerPosition.calledWith(mockPartyId, mockLoserId, {
                    x: mockStartPosition.y,
                    y: mockStartPosition.x,
                }),
            ).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.PlayerMoving, mockLoserPlayer)).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.PlayerEndMoving, mockPlayers)).to.equal(true);
            expect(replaceItemsSpy.calledWith(mockLoserId, mockStartPosition)).to.equal(true);
        });

        it('should find nearest free position if start position is occupied', () => {
            sinon.stub(respawnManager as any, 'isPositionOccupied').returns(true);
            const findNearestFreePositionStub = sinon.stub(respawnManager as any, 'findNearestFreePosition').returns(mockNewPosition);
            mockPartyService.getPlayerItems.returns([]);
            respawnManager.replacePlayer(mockLoserId);

            expect(findNearestFreePositionStub.calledWith(mockStartPosition, mockPlayers, mockLoserId)).to.equal(true);
            expect(
                mockPartyService.updatePlayerPosition.calledWith(mockPartyId, mockLoserId, {
                    x: mockNewPosition.y,
                    y: mockNewPosition.x,
                }),
            ).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.PlayerMoving, mockLoserPlayer)).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.PlayerEndMoving, mockPlayers)).to.equal(true);
        });
    });

    describe('replaceItem', () => {
        it('should remove the item from the player, notify events, and add item to the map', () => {
            const mockPosition = { x: 5, y: 5 };
            mockPartyService.getPlayer.returns({ currentPosition: mockPosition } as PlayerInfos);
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');
            respawnManager.replaceItem(mockPlayerId, mockItem);
            expect(mockPartyService.removePlayerItem.calledWith(mockPartyId, mockPlayerId, mockItem)).to.equal(true);
            expect(sendEventSpy.calledWith(mockPartyId, WsEventClient.ReplaceItem, { item: mockItem, position: mockPosition })).to.equal(true);
            expect(sendEventSpy.calledWith(mockPlayerId, WsEventClient.UpdateItem)).to.equal(true);
            expect(mockMapManager.addItem.calledWith(mockItem, { x: mockPosition.y, y: mockPosition.x })).to.equal(true);
        });

        it('should call findGoodPositionAndPlaceTheItemLost for each item', () => {
            const mockStartingPosition: Coordinate = { x: 5, y: 5 };
            const mockItems: ItemType[] = [ItemType.Flag, ItemType.SwapOpponentLife];

            const findGoodPositionAndPlaceTheItemLostSpy = sinon.spy(respawnManager as any, 'findGoodPositionAndPlaceTheItemLost');
            const sendLossFlagLogSignalIfItemIsFlagSpy = sinon.spy(respawnManager as any, 'sendLossFlagLogSignalIfItemIsFlag');

            mockPartyService.getPlayerItems.returns(mockItems);
            mockPartyService.getPlayers.returns(mockPlayers);

            respawnManager.replaceItems(mockPlayerId, mockStartingPosition);
            expect(sendLossFlagLogSignalIfItemIsFlagSpy.calledOnceWith(mockPlayerId)).to.equal(true);
            expect(findGoodPositionAndPlaceTheItemLostSpy.callCount).to.equal(mockItems.length);
            mockItems.forEach((item, index) => {
                const args = findGoodPositionAndPlaceTheItemLostSpy.getCall(index).args;
                expect(args[0]).to.deep.equal(mockStartingPosition);
                expect(args[1]).to.deep.equal(mockPlayers);
                expect(args[2]).to.equal(item);
            });
        });

        it('should not call findGoodPositionAndPlaceTheItemLost if there are no items', () => {
            const mockStartingPosition: Coordinate = { x: 5, y: 5 };

            const findGoodPositionAndPlaceTheItemLostSpy = sinon.spy(respawnManager as any, 'findGoodPositionAndPlaceTheItemLost');
            const sendLossFlagLogSignalIfItemIsFlagSpy = sinon.spy(respawnManager as any, 'sendLossFlagLogSignalIfItemIsFlag');

            mockPartyService.getPlayerItems.returns([]);
            mockPartyService.getPlayers.returns(mockPlayers);

            respawnManager.replaceItems(mockPlayerId, mockStartingPosition);

            expect(sendLossFlagLogSignalIfItemIsFlagSpy.calledOnceWith(mockPlayerId)).to.equal(true);
            expect(findGoodPositionAndPlaceTheItemLostSpy.notCalled).to.equal(true);
        });
    });

    describe('teleportPlayer', () => {
        let updatePlayerPositionSpy: any;
        let notifyPlayerMovementSpy: any;
        let isPositionOccupiedStub: any;
        const pos = { x: 1, y: 1 };
        beforeEach(() => {
            updatePlayerPositionSpy = sinon.spy(respawnManager as any, 'updatePlayerPosition');
            notifyPlayerMovementSpy = sinon.spy(respawnManager as any, 'notifyPlayerMovement');
            isPositionOccupiedStub = sinon.stub(respawnManager as any, 'isPositionOccupied');
        });

        afterEach(() => {
            sinon.restore();
        });
        it('should not update position or notify movement if the player is already at the target position', () => {
            mockPartyService.getPlayer.returns({ currentPosition: pos } as PlayerInfos);
            respawnManager.teleportPlayer('playerId', pos);
            expect(updatePlayerPositionSpy.called).to.equal(false);
            expect(notifyPlayerMovementSpy.called).to.equal(false);
        });
        it('should not update position or notify movement if the target position is occupied (case 1)', () => {
            isPositionOccupiedStub.returns(true);
            respawnManager.teleportPlayer('playerId', { x: 0, y: 1 });
            expect(updatePlayerPositionSpy.called).to.equal(false);
            expect(notifyPlayerMovementSpy.called).to.equal(false);
        });
        it('should not update position or notify movement if the target position is occupied (case 2)', () => {
            isPositionOccupiedStub.returns(true);
            respawnManager.teleportPlayer('playerId', { x: 1, y: 0 });
            expect(updatePlayerPositionSpy.called).to.equal(false);
            expect(notifyPlayerMovementSpy.called).to.equal(false);
        });
        it('should update position and notify movement if the target position is free', () => {
            isPositionOccupiedStub.returns(false);
            respawnManager.teleportPlayer('playerId', { x: 1, y: 0 });
            expect(updatePlayerPositionSpy.called).to.equal(true);
            expect(notifyPlayerMovementSpy.called).to.equal(true);
        });
    });

    describe('findGoodPositionAndPlaceTheItemLost', () => {
        it('should find a good position and place the lost item there', () => {
            const mockAllPlayers = [{ currentPosition: { x: 5, y: 5 } } as PlayerInfos, { currentPosition: { x: 6, y: 5 } } as PlayerInfos];
            const mockStartingPosition: Coordinate = { x: 5, y: 5 };

            const isPositionOccupiedStub = sinon.stub(respawnManager as any, 'isPositionOccupied').returns(true);
            const findNearestFreePositionStub = sinon.stub(respawnManager as any, 'findNearestFreePosition').returns(mockNewPosition);
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');

            (respawnManager as any).findGoodPositionAndPlaceTheItemLost(mockStartingPosition, mockAllPlayers, mockItem);

            expect(isPositionOccupiedStub.calledOnceWith(mockAllPlayers, mockStartingPosition, null, true)).to.equal(true);
            expect(findNearestFreePositionStub.calledOnceWith(mockStartingPosition, mockAllPlayers)).to.equal(true);
            expect(sendEventSpy.calledWith(mockPartyId, WsEventClient.ReplaceItem, { item: mockItem, position: mockNewPosition })).to.equal(true);
            expect(mockMapManager.addItem.calledWith(mockItem, { x: mockNewPosition.y, y: mockNewPosition.x })).to.equal(true);
        });

        it('should directly place the item at the starting position if it is not occupied', () => {
            const mockStartingPosition: Coordinate = { x: 5, y: 5 };
            const mockAllPlayers: PlayerInfos[] = [];
            const isPositionOccupiedStub = sinon.stub(respawnManager as any, 'isPositionOccupied').returns(false);
            const findNearestFreePositionStub = sinon.stub(respawnManager as any, 'findNearestFreePosition');
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');

            (respawnManager as any).findGoodPositionAndPlaceTheItemLost(mockStartingPosition, mockAllPlayers, mockItem);
            expect(isPositionOccupiedStub.calledOnceWith(mockAllPlayers, mockStartingPosition, null, true)).to.equal(true);
            expect(findNearestFreePositionStub.notCalled).to.equal(true);
            expect(sendEventSpy.calledOnceWith(mockPartyId, WsEventClient.ReplaceItem, { item: mockItem, position: mockStartingPosition })).to.equal(
                true,
            );
            expect(mockMapManager.addItem.calledOnceWith(mockItem, { x: mockStartingPosition.y, y: mockStartingPosition.x })).to.equal(true);
        });

        it('should find a nearest free position and place the item there if the starting position is occupied', () => {
            const mockStartingPosition: Coordinate = { x: 5, y: 5 };
            const mockAllPlayers: PlayerInfos[] = [
                { currentPosition: { x: 5, y: 5 } } as PlayerInfos,
                { currentPosition: { x: 6, y: 5 } } as PlayerInfos,
            ];

            const isPositionOccupiedStub = sinon.stub(respawnManager as any, 'isPositionOccupied').returns(true);
            const findNearestFreePositionStub = sinon.stub(respawnManager as any, 'findNearestFreePosition').returns(mockNewPosition);
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');

            (respawnManager as any).findGoodPositionAndPlaceTheItemLost(mockStartingPosition, mockAllPlayers, mockItem);
            expect(isPositionOccupiedStub.calledOnceWith(mockAllPlayers, mockStartingPosition, null, true)).to.equal(true);
            expect(findNearestFreePositionStub.calledOnceWith(mockStartingPosition, mockAllPlayers)).to.equal(true);
            expect(sendEventSpy.calledOnceWith(mockPartyId, WsEventClient.ReplaceItem, { item: mockItem, position: mockNewPosition })).to.equal(true);
            expect(mockMapManager.addItem.calledOnceWith(mockItem, { x: mockNewPosition.y, y: mockNewPosition.x })).to.equal(true);
        });
    });

    describe('sendLossFlagLogSignalIfItemIsFlag', () => {
        it('should emit a loss flag log signal if the player has a flag', () => {
            const mockPlayer = { hasFlag: true } as PlayerInfos;
            mockPartyService.getPlayer.returns(mockPlayer);
            const emitSpy = sinon.spy(respawnManager['partyListener'], 'emit');
            (respawnManager as any).sendLossFlagLogSignalIfItemIsFlag(mockPlayerId);
            expect(emitSpy.calledOnceWith(LogTypeEvent.LossTheFlag, sinon.match.object)).to.equal(true);
            const emittedLog = emitSpy.args[0][1];
            expect(emittedLog).to.deep.equal({
                partyId: mockPartyId,
                logParameters: { event: LogTypeEvent.LossTheFlag, playerIds: [mockPlayerId] },
                options: SendingOptions.Broadcast,
            });
        });

        it('should not emit a loss flag log signal if the player does not have a flag', () => {
            const mockPlayer = { hasFlag: false } as PlayerInfos;
            mockPartyService.getPlayer.returns(mockPlayer);
            const emitSpy = sinon.spy(respawnManager['partyListener'], 'emit');
            (respawnManager as any).sendLossFlagLogSignalIfItemIsFlag(mockPlayerId);
            expect(emitSpy.notCalled).to.equal(true);
        });
    });

    describe('isPositionOccupied', () => {
        it('should return true if the position is invalid', () => {
            mockMapManager.isValidPosition.returns(false);
            const result = respawnManager['isPositionOccupied'](mockPlayers, mockStartPosition, mockLoserId);
            expect(result).to.equal(true);
        });

        it('should return true if the position has a closed door', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isDoor.returns(true);
            const result = respawnManager['isPositionOccupied'](mockPlayers, mockStartPosition, mockLoserId);
            expect(result).to.equal(true);
        });

        it('should return true if the position is occupied by another player', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);
            const otherPlayer = { pid: 'player2', currentPosition: mockStartPosition } as PlayerInfos;
            expect(respawnManager['isPositionOccupied']([otherPlayer], mockStartPosition, mockLoserId)).to.equal(true);
        });

        it('should return false if the position is occupied by the same player (loserId)', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);
            const result = respawnManager['isPositionOccupied']([mockLoserPlayer], mockStartPosition, mockLoserId);
            expect(result).to.equal(false);
        });

        it('should return false if the position is not occupied by any player', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);
            const otherPlayer = { pid: 'player2', currentPosition: mockNewPosition } as PlayerInfos;
            expect(respawnManager['isPositionOccupied']([otherPlayer], mockStartPosition, mockLoserId)).to.equal(false);
        });

        it('should return false if there is no player at the position with a different pid than the loser', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);
            const playerAtDifferentX = { pid: 'player2', currentPosition: { x: 4, y: 5 } } as PlayerInfos;
            const playerAtDifferentY = { pid: 'player2', currentPosition: { x: 5, y: 4 } } as PlayerInfos;

            expect(respawnManager['isPositionOccupied']([playerAtDifferentX], mockStartPosition, mockLoserId)).to.equal(false);
            expect(respawnManager['isPositionOccupied']([playerAtDifferentY], mockStartPosition, mockLoserId)).to.equal(false);
        });

        it('should consider the position occupied by another player when playerId is defined', () => {
            const position: Coordinate = { x: 5, y: 5 };
            const isInvalidOrBlockedStub = sinon.stub(respawnManager as any, 'isInvalidOrBlockedPosition').returns(false);
            const isPositionOccupiedByPlayerStub = sinon.stub(respawnManager as any, 'isPositionOccupiedByPlayer').returns(true);

            const result = respawnManager['isPositionOccupied'](mockPlayers, position);

            expect(isInvalidOrBlockedStub.calledOnceWith(position, false)).to.equal(true);
            expect(isPositionOccupiedByPlayerStub.calledOnceWith(mockPlayers[0], position)).to.equal(true);
            expect(result).to.equal(true);
        });

        it('should not consider the position occupied if no players occupy it and playerId is null', () => {
            const position: Coordinate = { x: 5, y: 5 };
            const isInvalidOrBlockedStub = sinon.stub(respawnManager as any, 'isInvalidOrBlockedPosition').returns(false);
            const isPositionOccupiedByPlayerStub = sinon.stub(respawnManager as any, 'isPositionOccupiedByPlayer').returns(false);

            const result = respawnManager['isPositionOccupied'](mockPlayers, position, null);

            expect(isInvalidOrBlockedStub.calledOnceWith(position, false)).to.equal(true);
            expect(isPositionOccupiedByPlayerStub.calledOnceWith(mockPlayers[0], position, null)).to.equal(true);
            expect(result).to.equal(false);
        });

        it('should return true if the position is invalid or blocked', () => {
            // const mockPlayers_: PlayerInfos[] = [];
            const position: Coordinate = { x: 5, y: 5 };
            const isInvalidOrBlockedStub = sinon.stub(respawnManager as any, 'isInvalidOrBlockedPosition').returns(true);

            const result = respawnManager['isPositionOccupied'](mockPlayers, position, null);

            expect(isInvalidOrBlockedStub.calledOnceWith(position, false)).to.equal(true);
            expect(result).to.equal(true);
        });

        it('should return true if the position is occupied by another player', () => {
            // const mockPlayers_: PlayerInfos[] = [{ pid: 'player2', currentPosition: { x: 5, y: 5 } } as PlayerInfos];
            const position: Coordinate = { x: 5, y: 5 };
            const isInvalidOrBlockedStub = sinon.stub(respawnManager as any, 'isInvalidOrBlockedPosition').returns(false);
            const isPositionOccupiedByPlayerStub = sinon.stub(respawnManager as any, 'isPositionOccupiedByPlayer').returns(true);

            const result = respawnManager['isPositionOccupied'](mockPlayers, position, null);

            expect(isInvalidOrBlockedStub.calledOnceWith(position, false)).to.equal(true);
            expect(isPositionOccupiedByPlayerStub.calledOnceWith(mockPlayers[0], position, null)).to.equal(true);
            expect(result).to.equal(true);
        });

        it('should return false if the position is valid and not occupied', () => {
            const position: Coordinate = { x: 5, y: 5 };
            const isInvalidOrBlockedStub = sinon.stub(respawnManager as any, 'isInvalidOrBlockedPosition').returns(false);
            const isPositionOccupiedByPlayerStub = sinon.stub(respawnManager as any, 'isPositionOccupiedByPlayer').returns(false);

            const result = respawnManager['isPositionOccupied'](mockPlayers, position, null);

            expect(isInvalidOrBlockedStub.calledOnceWith(position, false)).to.equal(true);
            expect(isPositionOccupiedByPlayerStub.calledOnceWith(mockPlayers[0], position, null)).to.equal(true);
            expect(result).to.equal(false);
        });
    });

    describe('findNearestFreePosition', () => {
        it('should return the nearest free position', () => {
            const positions = [mockNewPosition, { x: 7, y: 7 }];
            sinon.stub(respawnManager as any, 'getPositionsAtDistance').returns(positions);
            sinon.stub(respawnManager as any, 'isPositionOccupied').returns(false);

            const result = respawnManager['findNearestFreePosition'](mockStartPosition, mockPlayers, mockLoserId);
            expect(result).to.deep.equal(mockNewPosition);
        });
    });

    describe('getPositionsAtDistance', () => {
        it('should generate positions at a given distance', () => {
            const distance = 1;
            const expectedPositions: Coordinate[] = [
                { x: 4, y: 4 },
                { x: 4, y: 5 },
                { x: 4, y: 6 },
                { x: 5, y: 4 },
                { x: 5, y: 6 },
                { x: 6, y: 4 },
                { x: 6, y: 5 },
                { x: 6, y: 6 },
            ];
            const result = respawnManager['getPositionsAtDistance'](mockStartPosition, distance);
            expect(result).to.have.deep.members(expectedPositions);
        });

        it('should exclude positions that are out of bounds', () => {
            const startPosition: Coordinate = { x: 5, y: 5 };
            const distance = 1;
            mockMapManager.isOutOfBounds.callsFake((pos: Coordinate) => pos.x < 0 || pos.y < 0);

            const result = respawnManager['getPositionsAtDistance'](startPosition, distance);
            const expectedPositions = [
                { x: 4, y: 4 },
                { x: 4, y: 5 },
                { x: 4, y: 6 },
                { x: 5, y: 4 },
                { x: 5, y: 6 },
                { x: 6, y: 4 },
                { x: 6, y: 5 },
                { x: 6, y: 6 },
            ];

            expect(result).to.deep.members(expectedPositions);
            expect(result).to.not.include.deep.members([{ x: -1, y: -1 }]);
        });

        it('should include all valid positions at a given distance', () => {
            const startPosition: Coordinate = { x: 5, y: 5 };
            const distance = 2;
            mockMapManager.isOutOfBounds.returns(false);
            const result = respawnManager['getPositionsAtDistance'](startPosition, distance);
            const expectedPositions = [
                { x: 3, y: 3 },
                { x: 3, y: 4 },
                { x: 3, y: 5 },
                { x: 3, y: 6 },
                { x: 3, y: 7 },
                { x: 4, y: 3 },
                { x: 4, y: 7 },
                { x: 5, y: 3 },
                { x: 5, y: 7 },
                { x: 6, y: 3 },
                { x: 6, y: 7 },
                { x: 7, y: 3 },
                { x: 7, y: 4 },
                { x: 7, y: 5 },
                { x: 7, y: 6 },
                { x: 7, y: 7 },
            ];

            expect(result).to.deep.members(expectedPositions);
            expect(result.length).to.equal(16);
        });

        it('should return an empty array for distance 0 or invalid distance', () => {
            const startPosition: Coordinate = { x: 5, y: 5 };
            const resultZero = respawnManager['getPositionsAtDistance'](startPosition, 0);
            expect(resultZero).to.deep.equal([]);
            const resultNegative = respawnManager['getPositionsAtDistance'](startPosition, -1);
            expect(resultNegative).to.deep.equal([]);
        });

        it('should skip positions on the edge if they are out of bounds', () => {
            const startPosition: Coordinate = { x: 5, y: 5 };
            const distance = 1;
            mockMapManager.isOutOfBounds.callsFake((pos: Coordinate) => pos.x === 4 && pos.y === 4);
            const result = respawnManager['getPositionsAtDistance'](startPosition, distance);
            const expectedPositions = [
                { x: 4, y: 5 },
                { x: 4, y: 6 },
                { x: 5, y: 4 },
                { x: 5, y: 6 },
                { x: 6, y: 4 },
                { x: 6, y: 5 },
                { x: 6, y: 6 },
            ];

            expect(result).to.deep.members(expectedPositions);
            expect(result).to.not.include.deep.members([{ x: 4, y: 4 }]);
        });
    });

    describe('isPositionOccupied', () => {
        // Existing tests...

        it('should handle player with undefined currentPosition', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);

            const playerWithoutPosition = { pid: 'player2', currentPosition: undefined } as PlayerInfos;

            const result = respawnManager['isPositionOccupied']([playerWithoutPosition], mockStartPosition, mockLoserId);

            expect(result).to.equal(false);
        });

        it('should handle player with null currentPosition', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);

            const playerWithoutPosition = { pid: 'player2', currentPosition: null } as PlayerInfos;

            const result = respawnManager['isPositionOccupied']([playerWithoutPosition], mockStartPosition, mockLoserId);

            expect(result).to.equal(false);
        });

        it('should handle player with undefined currentPosition.x', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);

            const playerWithUndefinedX = { pid: 'player2', currentPosition: { x: undefined, y: mockStartPosition.y } } as PlayerInfos;

            const result = respawnManager['isPositionOccupied']([playerWithUndefinedX], mockStartPosition, mockLoserId);

            expect(result).to.equal(false);
        });

        it('should handle player with undefined currentPosition.y', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);

            const playerWithUndefinedY = { pid: 'player2', currentPosition: { x: mockStartPosition.x, y: undefined } } as PlayerInfos;

            const result = respawnManager['isPositionOccupied']([playerWithUndefinedY], mockStartPosition, mockLoserId);

            expect(result).to.equal(false);
        });

        it('should return false if x matches but y does not', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);

            const otherPlayer = { pid: 'player2', currentPosition: { x: mockStartPosition.x, y: mockStartPosition.y + 1 } } as PlayerInfos;

            const result = respawnManager['isPositionOccupied']([otherPlayer], mockStartPosition, mockLoserId);

            expect(result).to.equal(false);
        });

        it('should return false if y matches but x does not', () => {
            mockMapManager.isValidPosition.returns(true);
            mockMapManager.isClosedDoor.returns(false);

            const otherPlayer = { pid: 'player2', currentPosition: { x: mockStartPosition.x + 1, y: mockStartPosition.y } } as PlayerInfos;

            const result = respawnManager['isPositionOccupied']([otherPlayer], mockStartPosition, mockLoserId);

            expect(result).to.equal(false);
        });
    });

    describe('Private Methods', () => {
        describe('findNearestFreePosition', () => {
            it('should find a free position at distance 1', () => {
                const startPosition = { x: 5, y: 5 };
                const players = [{ pid: 'player2', currentPosition: { x: 5, y: 5 } } as PlayerInfos];
                const loserId = 'player1';

                // Stub getPositionsAtDistance to return positions at distance 1
                const getPositionsAtDistanceStub = sinon.stub(respawnManager as any, 'getPositionsAtDistance');
                getPositionsAtDistanceStub.withArgs(startPosition, 1).returns([{ x: 5, y: 6 }]);
                getPositionsAtDistanceStub.withArgs(startPosition, 2).returns([]);

                // Stub isPositionOccupied
                const isPositionOccupiedStub = sinon.stub(respawnManager as any, 'isPositionOccupied');
                isPositionOccupiedStub.withArgs(players, { x: 5, y: 6 }, loserId).returns(false);

                const result = (respawnManager as any).findNearestFreePosition(startPosition, players, loserId);

                expect(result).to.deep.equal({ x: 5, y: 6 });
            });

            it('should search multiple distances until a free position is found', () => {
                const startPosition = { x: 5, y: 5 };
                const players = [{ pid: 'player2', currentPosition: { x: 5, y: 5 } } as PlayerInfos];
                const loserId = 'player1';

                const getPositionsAtDistanceStub = sinon.stub(respawnManager as any, 'getPositionsAtDistance');
                // At distance 1, positions are occupied
                getPositionsAtDistanceStub.withArgs(startPosition, 1).returns([
                    { x: 5, y: 6 },
                    { x: 6, y: 5 },
                ]);
                // At distance 2, positions are available
                getPositionsAtDistanceStub.withArgs(startPosition, 2).returns([
                    { x: 5, y: 7 },
                    { x: 7, y: 5 },
                ]);

                const isPositionOccupiedStub = sinon.stub(respawnManager as any, 'isPositionOccupied');
                // Positions at distance 1 are occupied
                isPositionOccupiedStub.withArgs(players, { x: 5, y: 6 }, loserId).returns(true);
                isPositionOccupiedStub.withArgs(players, { x: 6, y: 5 }, loserId).returns(true);
                // First position at distance 2 is free
                isPositionOccupiedStub.withArgs(players, { x: 5, y: 7 }, loserId).returns(false);

                const result = (respawnManager as any).findNearestFreePosition(startPosition, players, loserId);

                expect(result).to.deep.equal({ x: 5, y: 7 });
            });
        });

        describe('getPositionsAtDistance', () => {
            it('should generate positions at distance 1', () => {
                const startPosition = { x: 5, y: 5 };
                const distance = 1;

                const result = (respawnManager as any).getPositionsAtDistance(startPosition, distance);

                const expectedPositions = [
                    { x: 4, y: 4 },
                    { x: 4, y: 5 },
                    { x: 4, y: 6 },
                    { x: 5, y: 4 },
                    { x: 5, y: 6 },
                    { x: 6, y: 4 },
                    { x: 6, y: 5 },
                    { x: 6, y: 6 },
                ];

                expect(result).to.have.deep.members(expectedPositions);
                expect(result.length).to.equal(8);
            });

            it('should generate no positions at distance 0', () => {
                const startPosition = { x: 5, y: 5 };
                const distance = 0;
                const result = (respawnManager as any).getPositionsAtDistance(startPosition, distance);
                expect(result).to.deep.equal([]);
            });

            it('should generate positions at distance 2', () => {
                const startPosition = { x: 5, y: 5 };
                const distance = 2;
                const result = (respawnManager as any).getPositionsAtDistance(startPosition, distance);
                const expectedPositions = [
                    { x: 3, y: 3 },
                    { x: 3, y: 4 },
                    { x: 3, y: 5 },
                    { x: 3, y: 6 },
                    { x: 3, y: 7 },
                    { x: 4, y: 3 },
                    { x: 4, y: 7 },
                    { x: 5, y: 3 },
                    { x: 5, y: 7 },
                    { x: 6, y: 3 },
                    { x: 6, y: 7 },
                    { x: 7, y: 3 },
                    { x: 7, y: 4 },
                    { x: 7, y: 5 },
                    { x: 7, y: 6 },
                    { x: 7, y: 7 },
                ];

                expect(result).to.have.deep.members(expectedPositions);
                expect(result.length).to.equal(16);
            });
        });

        describe('isInvalidOrBlockedPosition', () => {
            it('should return true if position is invalid', () => {
                mockMapManager.isValidPosition.returns(false);
                const position = { x: 1, y: 1 };
                const result = respawnManager['isInvalidOrBlockedPosition'](position, true);
                expect(result).to.equal(true);
            });

            it('should return true if position contain a door', () => {
                mockMapManager.isValidPosition.returns(true);
                mockMapManager.isDoor.returns(true);
                const position = { x: 1, y: 1 };
                const result = respawnManager['isInvalidOrBlockedPosition'](position, true);
                expect(result).to.equal(true);
            });

            it('should return true if position is not valid and has item', () => {
                mockMapManager.isValidPosition.returns(true);
                mockMapManager.isDoor.returns(false);
                mockMapManager.hasItem.returns(true);
                const position = { x: 1, y: 1 };
                const result = respawnManager['isInvalidOrBlockedPosition'](position, true);
                expect(result).to.equal(true);
            });
            it('should return false if position is not valid and does not contains a closed door', () => {
                mockMapManager.isValidPosition.returns(true);
                mockMapManager.isDoor.returns(false);
                mockMapManager.hasItem.returns(false);
                const position = { x: 1, y: 1 };
                const result = respawnManager['isInvalidOrBlockedPosition'](position, true);
                expect(result).to.equal(undefined);
            });
        });

        describe('isPositionOccupiedByPlayer', () => {
            it('should return true if another player using the position', () => {
                const player = { pid: 'player2', currentPosition: { x: 1, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(true);
            });

            it('should return false if the player is the looser', () => {
                const player = { pid: 'player1', currentPosition: { x: 1, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if the player does not use the position', () => {
                const player = { pid: 'player2', currentPosition: { x: 2, y: 2 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if the player does have actual position', () => {
                const player = { pid: 'player2', currentPosition: undefined } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if currentPosition.x is undefined', () => {
                const player = { pid: 'player2', currentPosition: { x: undefined, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';

                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);

                expect(result).to.equal(false);
            });

            it('should return false if currentPosition.y is undefined', () => {
                const player = { pid: 'player2', currentPosition: { x: 1, y: undefined } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';

                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);

                expect(result).to.equal(false);
            });

            it('should return false if currentPosition is null', () => {
                const player = { pid: 'player2', currentPosition: null } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if currentPosition.x matches but currentPosition.y does not', () => {
                const player = { pid: 'player2', currentPosition: { x: 1, y: 2 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if currentPosition.x does not match but currentPosition.y matches', () => {
                const player = { pid: 'player2', currentPosition: { x: 2, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if player is the loser and currentPosition is undefined', () => {
                const player = { pid: 'player1', currentPosition: undefined } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if currentPosition.x is null', () => {
                const player = { pid: 'player2', currentPosition: { x: null, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if currentPosition.y is null', () => {
                const player = { pid: 'player2', currentPosition: { x: 1, y: null } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if player is undefined', () => {
                const position = { x: 1, y: 1 };
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](undefined, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if position is undefined', () => {
                const player = { pid: 'player2', currentPosition: { x: 1, y: 1 } } as PlayerInfos;
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, undefined, loserId);
                expect(result).to.equal(false);
            });

            it('should return false if position is null', () => {
                const player = { pid: 'player2', currentPosition: { x: 1, y: 1 } } as PlayerInfos;
                const loserId = 'player1';
                const result = respawnManager['isPositionOccupiedByPlayer'](player, null, loserId);
                expect(result).to.equal(false);
            });

            it('should return true if loserId is undefined', () => {
                const player = { pid: 'player2', currentPosition: { x: 1, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, undefined);
                expect(result).to.equal(true);
            });

            it('should return true if loserId is null and position are equals', () => {
                const player = { pid: 'player2', currentPosition: { x: 1, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, null);
                expect(result).to.equal(true);
            });

            it('should return true if player.pid is undefined and positions match', () => {
                const player = { pid: undefined, currentPosition: { x: 1, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';

                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(true);
            });

            it('should return true if player.pid is null and positions match', () => {
                const player = { pid: null, currentPosition: { x: 1, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';

                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(true);
            });

            it('should return false if player.pid is null and positions do not match', () => {
                const player = { pid: null, currentPosition: { x: 2, y: 2 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';

                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(false);
            });

            it('should return true if player.pid is an empty string and positions match', () => {
                const player = { pid: '', currentPosition: { x: 1, y: 1 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';

                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);
                expect(result).to.equal(true);
            });

            it('should return false if player.pid equals loserId but positions do not match', () => {
                const player = { pid: 'player1', currentPosition: { x: 2, y: 2 } } as PlayerInfos;
                const position = { x: 1, y: 1 };
                const loserId = 'player1';

                const result = respawnManager['isPositionOccupiedByPlayer'](player, position, loserId);

                expect(result).to.equal(false);
            });
        });
    });
});
