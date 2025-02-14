/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { PartyService } from '@app/services/party/party.service';
import { MovementManager } from '@app/classes/movement-manager/movement-manager';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { EventEmitter } from 'events';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayerEvent } from '@common/enums/virtual-player-event';
import { Container } from 'typedi';
import { VirtualPlayerManager } from './virtual-player';
import { Coordinate } from '@common/interfaces/coordinate';
import { MAX_MOVEMENT_POINTS, MAX_VIRTUAL_PLAYER_ACTION_DELAY } from '@app/utils/const';
import * as helper from '@app/utils/helper';
import { ItemType } from '@common/enums/item';

const mockPartyId = 'mock-party-id';
const mockVirtualPlayer: PlayerInfos = {
    pid: 'player1',
    currentPosition: { x: 2, y: 2 },
    items: [],
    isCurrentPlayer: true,
    availableMoves: 5,
    remainingAction: 2,
    virtualPlayerProfile: BotProfile.Aggressive,
} as PlayerInfos;

describe('VirtualPlayerManager', () => {
    let virtualPlayerManager: VirtualPlayerManager;
    let mockMapManager: sinon.SinonStubbedInstance<MapManager>;
    let mockMovementManager: sinon.SinonStubbedInstance<MovementManager>;
    let mockEventEmitter: EventEmitter;
    let mockPartyService: sinon.SinonStubbedInstance<PartyService>;

    beforeEach(() => {
        mockPartyService = sinon.createStubInstance(PartyService);
        mockMapManager = sinon.createStubInstance(MapManager);
        mockMovementManager = sinon.createStubInstance(MovementManager);
        Container.set(PartyService, mockPartyService);
        mockEventEmitter = new EventEmitter();
        const mapManager = new MapManager();
        mapManager.setMap([]);
        virtualPlayerManager = new VirtualPlayerManager(mockPartyId, mapManager);
        virtualPlayerManager.setVirtualPlayerEvent(mockEventEmitter);
        virtualPlayerManager['movementManager'] = mockMovementManager;
        virtualPlayerManager['mapManager'] = mockMapManager;
        virtualPlayerManager['virtualPlayer'] = mockVirtualPlayer;
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should initialize correctly', () => {
        expect(virtualPlayerManager).to.exist;
    });

    it('should set the virtual player event', () => {
        virtualPlayerManager.setVirtualPlayerEvent(mockEventEmitter);
        expect((virtualPlayerManager as any).eventVirtualPlayer).to.equal(mockEventEmitter);
    });

    describe('listenVirtualPlayerEventAndProcess', () => {
        let processActionsSpy: any;
        beforeEach(() => {
            sinon.stub(virtualPlayerManager as any, 'delayBeforeDoAction').callsFake(() => {
                // empty
            });
            processActionsSpy = sinon.spy(virtualPlayerManager as any, 'processVirtualPlayerActions');
            virtualPlayerManager.listenVirtualPlayerEventAndProcess();
        });
        afterEach(() => {
            sinon.restore();
        });
        it('should handle BeginRound event', async () => {
            const mockPlayerId = 'player1';
            const mockPlayer = { pid: mockPlayerId } as PlayerInfos;

            mockPartyService.getPlayer.withArgs(mockPartyId, mockPlayerId).returns(mockPlayer);
            const setVirtualPlayerSpy = sinon.spy(virtualPlayerManager as any, 'setVirtualPlayer');
            const setPositionMapSpy = sinon.spy(virtualPlayerManager as any, 'setPositionMap');

            mockEventEmitter.emit(VirtualPlayerEvent.BeginRound, mockPlayerId);
            await new Promise((resolve) => setImmediate(resolve));
            expect(setVirtualPlayerSpy.calledOnceWith(mockPlayer)).to.equal(true);
            expect(setPositionMapSpy.calledOnce).to.equal(true);
            // expect(processActionsSpy.calledOnce).to.equal(true);
        });

        it('should handle EndMoving event', async () => {
            mockEventEmitter.emit(VirtualPlayerEvent.EndMoving);
            await new Promise((resolve) => setImmediate(resolve));
            expect(processActionsSpy.calledOnce).to.equal(true);
        });

        it('should handle DoorOpened event', async () => {
            const moveSpy = sinon.stub(virtualPlayerManager as any, 'moveVirtualPlayer').resolves();
            mockEventEmitter.emit(VirtualPlayerEvent.DoorOpened);
            await new Promise((resolve) => setImmediate(resolve));
            expect(moveSpy.calledOnce).to.equal(true);
        });

        it('should handle EndFight event', async () => {
            const moveSpy = sinon.stub(virtualPlayerManager as any, 'moveVirtualPlayer').resolves();
            mockEventEmitter.emit(VirtualPlayerEvent.EndFight);
            await new Promise((resolve) => setImmediate(resolve));
            expect(moveSpy.calledOnce).to.equal(true);
        });

        it('should handle BeginRound event and process virtual player actions', async () => {
            const mockPlayerId = 'player1';
            const mockPlayer = { pid: mockPlayerId, currentPosition: { x: 2, y: 2 } } as PlayerInfos;
            const setVirtualPlayerSpy = sinon.spy(virtualPlayerManager as any, 'setVirtualPlayer');
            const setPositionMapSpy = sinon.spy(virtualPlayerManager as any, 'setPositionMap');
            mockMapManager.getAllNeighbors.returns([
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ]);
            mockPartyService.getPlayers.returns([mockPlayer]);
            mockPartyService.getPlayer.withArgs(mockPartyId, mockPlayerId).returns(mockPlayer);
            mockEventEmitter.emit(VirtualPlayerEvent.BeginRound, mockPlayerId);
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(setVirtualPlayerSpy.calledOnceWith(mockPlayer)).to.be.true;
            expect(setPositionMapSpy.calledOnce).to.be.true;
            expect(processActionsSpy.calledOnce).to.be.true;
        });

        it('should handle EndMoving event and process virtual player actions', async () => {
            mockEventEmitter.emit(VirtualPlayerEvent.EndMoving);
            await new Promise((resolve) => setImmediate(resolve));
            expect(processActionsSpy.calledOnce).to.be.true;
        });

        it('should handle DoorOpened event and move virtual player', async () => {
            const moveSpy = sinon.stub(virtualPlayerManager as any, 'moveVirtualPlayer').resolves();
            mockEventEmitter.emit(VirtualPlayerEvent.DoorOpened);
            await new Promise((resolve) => setImmediate(resolve));
            expect(moveSpy.calledOnce).to.be.true;
        });

        it('should handle EndFight event and move virtual player', async () => {
            const moveSpy = sinon.stub(virtualPlayerManager as any, 'moveVirtualPlayer').resolves();
            mockEventEmitter.emit(VirtualPlayerEvent.EndFight);
            await new Promise((resolve) => setImmediate(resolve));
            expect(moveSpy.calledOnce).to.be.true;
        });
    });

    describe('destroy', () => {
        it('should remove all event listeners', () => {
            const removeListenersSpy = sinon.spy(mockEventEmitter, 'removeAllListeners');
            virtualPlayerManager.destroy();
            expect(removeListenersSpy.calledOnce).to.equal(true);
        });
    });

    describe('processVirtualPlayerActions', () => {
        it('should move the virtual player if no actions remain', async () => {
            (virtualPlayerManager as any).virtualPlayer.remainingAction = 0;
            sinon.stub(virtualPlayerManager as any, 'getPlayerPositionsToInteract').callsFake(() => {
                // empty
            });
            sinon.stub(virtualPlayerManager as any, 'getDoorPositionsToInteract').callsFake(() => {
                // empty
            });
            const moveVirtualPlayerSpy = sinon.stub(virtualPlayerManager as any, 'moveVirtualPlayer').callsFake(() => {});
            await (virtualPlayerManager as any).processVirtualPlayerActions();
            expect(moveVirtualPlayerSpy.calledOnce).to.equal(true);
        });

        it('should move the virtual player if has actions remain but nothing point to interact', async () => {
            (virtualPlayerManager as any).virtualPlayer.remainingAction = 5;
            sinon.stub(virtualPlayerManager as any, 'getPlayerPositionsToInteract').callsFake(() => {
                // empty
            });
            sinon.stub(virtualPlayerManager as any, 'getDoorPositionsToInteract').callsFake(() => {
                // empty
            });
            const moveVirtualPlayerSpy = sinon.stub(virtualPlayerManager as any, 'moveVirtualPlayer').callsFake(() => {});
            await (virtualPlayerManager as any).processVirtualPlayerActions();
            expect(moveVirtualPlayerSpy.calledOnce).to.equal(true);
        });

        it('should handle player interaction if a player is nearby', async () => {
            (virtualPlayerManager as any).virtualPlayer.remainingAction = 2;
            sinon.stub(virtualPlayerManager as any, 'getPlayerPositionsToInteract').returns({ x: 3, y: 3 });
            sinon.stub(virtualPlayerManager as any, 'getDoorPositionsToInteract').callsFake(() => {});
            const handleInteractionSpy = sinon.stub(virtualPlayerManager as any, 'handleInteraction').callsFake(() => {});
            await (virtualPlayerManager as any).processVirtualPlayerActions();
            expect(handleInteractionSpy.calledOnce).to.equal(true);
        });

        it('should handle door interaction if a door is nearby', async () => {
            (virtualPlayerManager as any).virtualPlayer.remainingAction = 2;
            sinon.stub(virtualPlayerManager as any, 'getDoorPositionsToInteract').returns({ x: 3, y: 3 });
            sinon.stub(virtualPlayerManager as any, 'getPlayerPositionsToInteract').returns(null);
            const handleInteractionSpy = sinon.stub(virtualPlayerManager as any, 'handleInteraction').callsFake(() => {});
            await (virtualPlayerManager as any).processVirtualPlayerActions();
            expect(handleInteractionSpy.calledOnce).to.equal(true);
        });
    });

    describe('delayBeforeDoAction', () => {
        it('should call delay with a random value within the range of MAX_VIRTUAL_PLAYER_ACTION_DELAY', async () => {
            const delayStub = sinon.stub(helper, 'delay').resolves();
            const randomStub = sinon.stub(Math, 'random').returns(0.5);

            await virtualPlayerManager['delayBeforeDoAction']();

            const expectedDelay = Math.floor(0.5 * MAX_VIRTUAL_PLAYER_ACTION_DELAY);
            expect(delayStub.calledOnceWith(expectedDelay)).to.equal(true);
            randomStub.restore();
        });
    });

    describe('moveVirtualPlayer', () => {
        beforeEach(() => {
            sinon.stub(virtualPlayerManager as any, 'delayBeforeDoAction').callsFake(() => {});
            virtualPlayerManager['setVirtualPlayer'](mockVirtualPlayer);
        });
        afterEach(() => {
            sinon.restore();
        });

        it('should end the round if no next move position is found', async () => {
            sinon.stub(virtualPlayerManager as any, 'resolveNextPosition').returns(null);
            const emitStub = sinon.stub(mockEventEmitter, 'emit');
            await (virtualPlayerManager as any).moveVirtualPlayer();
            expect(emitStub.calledWith(VirtualPlayerEvent.EndRound, mockVirtualPlayer.pid)).to.equal(true);
        });

        it('should emit StartMoving event for a valid move position', async () => {
            const mockNextPosition = { x: 3, y: 3 };
            sinon.stub(virtualPlayerManager as any, 'resolveNextPosition').returns(mockNextPosition);
            const emitStub = sinon.stub(mockEventEmitter, 'emit');
            await (virtualPlayerManager as any).moveVirtualPlayer();
            expect(emitStub.calledWith(VirtualPlayerEvent.StartMoving, { playerId: mockVirtualPlayer.pid, pos: mockNextPosition })).to.equal(true);
        });
    });

    describe('handleInteraction', () => {
        it('should emit the correct interaction event', async () => {
            sinon.stub(virtualPlayerManager as any, 'delayBeforeDoAction').callsFake(() => {});
            const emitStub = sinon.stub(mockEventEmitter, 'emit');
            await (virtualPlayerManager as any).handleInteraction({ x: 3, y: 3 }, VirtualPlayerEvent.StartFight);
            expect(emitStub.calledWith(VirtualPlayerEvent.StartFight, { playerId: mockVirtualPlayer.pid, pos: { x: 3, y: 3 } })).to.equal(true);
        });
    });

    describe('getPlayerPositionsToInteract', () => {
        it('should return the coordinate of a player within interaction range', () => {
            mockMapManager.getAllNeighbors.returns([
                { x: 3, y: 3 },
                { x: 4, y: 4 },
            ]);
            (virtualPlayerManager as any).playerPositionMap.set({ x: 3, y: 3 }, mockVirtualPlayer);
            const result = (virtualPlayerManager as any).getPlayerPositionsToInteract();
            expect(result).to.deep.equal({ x: 3, y: 3 });
        });

        it('should return null if no player is within interaction range', () => {
            mockMapManager.getAllNeighbors.returns([
                { x: 5, y: 5 },
                { x: 6, y: 6 },
            ]);
            const result = (virtualPlayerManager as any).getPlayerPositionsToInteract();
            expect(result).to.be.null;
        });
    });

    describe('setPositionMap', () => {
        const player = { pid: 'player2', currentPosition: { x: 2, y: 2 } } as PlayerInfos;
        beforeEach(() => {
            mockPartyService.getPlayers.returns([mockVirtualPlayer, player]);
            virtualPlayerManager['setVirtualPlayer'](mockVirtualPlayer);
        });

        it('should populate the playerPositionMap with player positions excluding the virtual player', () => {
            (virtualPlayerManager as any).setPositionMap();
            const playerPositionMap = (virtualPlayerManager as any).playerPositionMap;
            expect(playerPositionMap.size).to.equal(1);
        });
    });

    describe('resolveNextPosition', () => {
        it('should call resolveAggressivePriorityPosition for aggressive bot profile', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveAggressivePriorityPosition').returns({ x: 3, y: 3 });
            mockVirtualPlayer.virtualPlayerProfile = BotProfile.Aggressive;
            const result = (virtualPlayerManager as any).resolveNextPosition();
            expect(result).to.deep.equal({ x: 3, y: 3 });
        });

        it('should call resolveDefensivePriorityPosition for defensive bot profile', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveDefensivePriorityPosition').returns({ x: 4, y: 4 });
            mockVirtualPlayer.virtualPlayerProfile = BotProfile.Defensive;
            const result = (virtualPlayerManager as any).resolveNextPosition();
            expect(result).to.deep.equal({ x: 4, y: 4 });
        });
    });

    describe('getClosestPlayer', () => {
        it('should return the closest player based on position', () => {
            const coord = { x: 2, y: 2 };
            (virtualPlayerManager as any).playerPositionMap.set({ x: 3, y: 3 }, { pid: 'player1' } as PlayerInfos);
            (virtualPlayerManager as any).playerPositionMap.set(coord, { pid: 'player2' } as PlayerInfos);
            sinon.stub(virtualPlayerManager as any, 'getClosestPosition').returns(coord);
            const result = (virtualPlayerManager as any).getClosestPlayer();
            expect(result.pid).to.equal('player2');
        });
    });

    describe('getPlayerEngagementPoint', () => {
        beforeEach(() => {
            mockMapManager.getAllNeighbors.returns([
                { x: 3, y: 3 },
                { x: 4, y: 4 },
            ]);
        });

        it('should return the closest position to a player', () => {
            sinon.stub(virtualPlayerManager as any, 'getClosestPosition').returns({ x: 3, y: 3 });
            const result = (virtualPlayerManager as any).getPlayerEngagementPoint(mockVirtualPlayer);
            expect(result).to.deep.equal({ x: 3, y: 3 });
        });
    });

    describe('getPathToPlayer', () => {
        it('should return the path to the engagement point of a player', () => {
            sinon.stub(virtualPlayerManager as any, 'getPlayerEngagementPoint').returns({ x: 3, y: 3 });
            const mockPath = [
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            sinon.stub(virtualPlayerManager as any, 'getPathToPosition').returns(mockPath);
            const result = (virtualPlayerManager as any).getPathToPlayer(mockVirtualPlayer);
            expect(result).to.deep.equal(mockPath);
        });
    });

    describe('getAccessibleItemPositions', () => {
        it('should filter out item positions occupied by players', () => {
            (virtualPlayerManager as any).playerPositionMap.set({ x: 3, y: 3 }, { pid: 'player1' } as PlayerInfos);
            const mockItemPositions = [
                { x: 3, y: 3 },
                { x: 4, y: 4 },
            ];
            const result = (virtualPlayerManager as any).getAccessibleItemPositions(mockItemPositions);
            expect(result).to.deep.equal([{ x: 4, y: 4 }]);
        });
    });

    describe('shouldEndRound', () => {
        it('should return true if the player is not current', () => {
            mockVirtualPlayer.isCurrentPlayer = false;
            const result = (virtualPlayerManager as any).shouldEndRound(null);
            expect(result).to.equal(false);
        });

        it('should return true if no next move position is available', () => {
            mockVirtualPlayer.isCurrentPlayer = true;
            const result = (virtualPlayerManager as any).shouldEndRound(null);
            expect(result).to.equal(true);
        });

        it('should return true if last move position is the same as the next move position', () => {
            mockVirtualPlayer.isCurrentPlayer = true;
            (virtualPlayerManager as any).lastMovePosition = { x: 2, y: 2 };
            const result = (virtualPlayerManager as any).shouldEndRound({ x: 2, y: 2 });
            expect(result).to.equal(true);
        });
    });

    describe('configureMovement', () => {
        it('should configure the movement manager with player movement points and node map', () => {
            (virtualPlayerManager as any).configureMovement();
            expect(mockMovementManager.setMovementPoints.calledOnceWith(mockVirtualPlayer.availableMoves)).to.equal(true);
            expect(mockMovementManager.acquireNodeMap.calledOnce).to.equal(true);
        });
    });

    describe('isPositionAccessible', () => {
        it('should return true if the position is accessible', () => {
            const mockPosition = { x: 2, y: 2 };
            const configureStub = sinon.stub(virtualPlayerManager as any, 'configureMovement');
            mockMovementManager.isAccessible.returns(true);

            const result = (virtualPlayerManager as any).isPositionAccessible(mockPosition);
            expect(result).to.equal(true);
            expect(configureStub.calledOnce).to.equal(true);
        });

        it('should return false if the position is not accessible', () => {
            const mockPosition = { x: 2, y: 2 };
            sinon.stub(virtualPlayerManager as any, 'configureMovement');
            mockMovementManager.isAccessible.returns(false);

            const result = (virtualPlayerManager as any).isPositionAccessible(mockPosition);
            expect(result).to.equal(false);
        });
    });
    describe('chooseRandomPosition', () => {
        it('should return a random position from the list', () => {
            const positions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            sinon.stub(Math, 'random').returns(0.5);
            const result = (virtualPlayerManager as any).chooseRandomPosition(positions);
            expect(result).to.deep.equal(positions[1]);
        });
    });

    describe('getPositionToStartPoint', () => {
        it('should return null if another player is at the start point', () => {
            sinon.stub(virtualPlayerManager as any, 'playerPositionMap').value(new Map([[{ x: 1, y: 1 }, { isGiveUp: false }]]));
            virtualPlayerManager['virtualPlayer'].startPosition = { x: 1, y: 1 };

            const result = (virtualPlayerManager as any).getPositionToStartPoint();
            expect(result).to.be.null;
        });

        it('should return the last accessible position to the start point', () => {
            virtualPlayerManager['virtualPlayer'].startPosition = { x: 1, y: 1 };
            const mockPath = [
                { x: 2, y: 2 },
                { x: 1, y: 1 },
            ];
            sinon.stub(virtualPlayerManager as any, 'getPathToPosition').returns(mockPath);
            sinon.stub(virtualPlayerManager as any, 'getLastAccessiblePosition').returns({ x: 1, y: 1 });

            const result = (virtualPlayerManager as any).getPositionToStartPoint();
            expect(result).to.deep.equal({ x: 1, y: 1 });
        });
    });
    describe('getPositionToFlag', () => {
        it('should return null if no flag is present on the map', () => {
            mockMapManager.getFlagPosition.returns(null);
            const result = (virtualPlayerManager as any).getPositionToFlag();
            expect(result).to.be.null;
        });

        it('should return the last accessible position to the flag', () => {
            const mockFlagPosition = { x: 3, y: 3 };
            const mockPath = [
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            mockMapManager.getFlagPosition.returns(mockFlagPosition);
            sinon.stub(virtualPlayerManager as any, 'getPathToPosition').returns(mockPath);
            sinon.stub(virtualPlayerManager as any, 'getLastAccessiblePosition').returns(mockFlagPosition);

            const result = (virtualPlayerManager as any).getPositionToFlag();
            expect(result).to.deep.equal(mockFlagPosition);
        });
    });

    describe('resolveNextPosition', () => {
        it('should call resolveAggressivePriorityPosition for aggressive profile', () => {
            sinon.stub(virtualPlayerManager as any, 'isAggressive').returns(true);
            const resolveAggressiveStub = sinon.stub(virtualPlayerManager as any, 'resolveAggressivePriorityPosition').returns({ x: 6, y: 6 });
            const result = (virtualPlayerManager as any).resolveNextPosition();
            expect(result).to.deep.equal({ x: 6, y: 6 });
            expect(resolveAggressiveStub.calledOnce).to.equal(true);
        });

        it('should call resolveDefensivePriorityPosition for defensive profile', () => {
            sinon.stub(virtualPlayerManager as any, 'isAggressive').returns(false);
            const resolveDefensiveStub = sinon.stub(virtualPlayerManager as any, 'resolveDefensivePriorityPosition').returns({ x: 7, y: 7 });
            const result = (virtualPlayerManager as any).resolveNextPosition();
            expect(result).to.deep.equal({ x: 7, y: 7 });
            expect(resolveDefensiveStub.calledOnce).to.equal(true);
        });
    });

    describe('hasNoActionsLeft', () => {
        it('should return true if remainingAction is 0', () => {
            virtualPlayerManager['virtualPlayer'].remainingAction = 0;
            const result = (virtualPlayerManager as any).hasNoActionsLeft();
            expect(result).to.equal(true);
        });

        it('should return false if remainingAction is greater than 0', () => {
            virtualPlayerManager['virtualPlayer'].remainingAction = 1;
            const result = (virtualPlayerManager as any).hasNoActionsLeft();
            expect(result).to.equal(false);
        });
    });

    describe('getPathToPosition', () => {
        it('should return the correct path to the given position', () => {
            const mockPosition = { x: 5, y: 5 };
            const mockPath = [
                { x: 2, y: 2 },
                { x: 3, y: 3 },
                { x: 4, y: 4 },
                { x: 5, y: 5 },
            ];

            mockMovementManager.getPlayerPathTo.returns(mockPath);

            const result = (virtualPlayerManager as any).getPathToPosition(mockPosition);

            expect(result).to.deep.equal(mockPath);
            expect(mockMovementManager.setMovementPoints.calledWith(MAX_MOVEMENT_POINTS)).to.equal(true);
            expect(mockMovementManager.ignoreClosedDoors.calledOnce).to.equal(true);
            expect(mockMovementManager.getPlayerPathTo.calledWith(mockVirtualPlayer, mockPosition)).to.equal(true);
            expect(mockMovementManager.restoreClosedDoors.calledOnce).to.equal(true);
        });

        it('should return an empty array if no path is found', () => {
            const mockPosition = { x: 5, y: 5 };

            mockMovementManager.getPlayerPathTo.returns([]);

            const result = (virtualPlayerManager as any).getPathToPosition(mockPosition);

            expect(result).to.deep.equal([]);
            expect(mockMovementManager.getPlayerPathTo.calledWith(mockVirtualPlayer, mockPosition)).to.equal(true);
        });
    });

    describe('getDistanceToPosition', () => {
        it('should return the correct distance to the given position', () => {
            const mockPosition = { x: 5, y: 5 };
            const mockPath = [
                { x: 2, y: 2 },
                { x: 3, y: 3 },
                { x: 4, y: 4 },
                { x: 5, y: 5 },
            ];
            const mockDistance = 4;

            sinon.stub(virtualPlayerManager as any, 'getPathToPosition').returns(mockPath);
            mockMovementManager.getPathCost.returns(mockDistance);

            const result = (virtualPlayerManager as any).getDistanceToPosition(mockPosition);

            expect(result).to.equal(mockDistance);
            expect(mockMovementManager.setMovementPoints.calledWith(MAX_MOVEMENT_POINTS)).to.equal(true);
            expect(mockMovementManager.getPathCost.calledWith(mockPath)).to.equal(true);
            expect(mockMovementManager.setMovementPoints.calledWith(mockVirtualPlayer.availableMoves)).to.equal(true);
        });

        it('should return Infinity if no path is found', () => {
            const mockPosition = { x: 5, y: 5 };
            sinon.stub(virtualPlayerManager as any, 'getPathToPosition').returns([]);
            mockMovementManager.getPathCost.returns(Infinity);

            const result = (virtualPlayerManager as any).getDistanceToPosition(mockPosition);

            expect(result).to.equal(Infinity);
            expect(mockMovementManager.getPathCost.called).to.equal(true);
        });
    });

    describe('getLastAccessiblePosition', () => {
        it('should return the last accessible position in the path', () => {
            const mockPath = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            sinon.stub(virtualPlayerManager as any, 'isPositionAccessible').callsFake((position: Coordinate) => position.x === 2);

            const result = (virtualPlayerManager as any).getLastAccessiblePosition(mockPath);

            expect(result).to.deep.equal({ x: 2, y: 2 });
        });

        it('should return null if no position is accessible', () => {
            const mockPath = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            sinon.stub(virtualPlayerManager as any, 'isPositionAccessible').returns(false);

            const result = (virtualPlayerManager as any).getLastAccessiblePosition(mockPath);

            expect(result).to.be.null;
        });
    });

    describe('getClosestPosition', () => {
        it('should return a random position among the closest ones', () => {
            const mockPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            const closestPositions = [
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            sinon.stub(virtualPlayerManager as any, 'getClosestPositions').returns(closestPositions);
            sinon.stub(virtualPlayerManager as any, 'chooseRandomPosition').returns({ x: 2, y: 2 });

            const result = (virtualPlayerManager as any).getClosestPosition(mockPositions);

            expect(result).to.deep.equal({ x: 2, y: 2 });
        });
    });
    describe('getClosestPositions', () => {
        it('should return all positions with the smallest distance', () => {
            const mockPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            sinon.stub(virtualPlayerManager as any, 'getDistanceToPosition').callsFake((position: Coordinate) => position.x);
            sinon.stub(virtualPlayerManager as any, 'getSmallestDistance').returns(2);
            const result = (virtualPlayerManager as any).getClosestPositions(mockPositions);
            expect(result).to.deep.equal([{ x: 2, y: 2 }]);
        });
    });

    describe('getSmallestDistance', () => {
        it('should return the smallest distance among the positions', () => {
            const mockPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            sinon.stub(virtualPlayerManager as any, 'getDistanceToPosition').callsFake((position: Coordinate) => position.x);
            const result = (virtualPlayerManager as any).getSmallestDistance(mockPositions);
            expect(result).to.equal(1);
        });
    });

    describe('getItemsPositions', () => {
        it('should return accessible item positions', () => {
            const mockItemPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.getItemsPositions.returns(mockItemPositions);
            sinon.stub(virtualPlayerManager as any, 'getAccessibleItemPositions').returns([mockItemPositions[0]]);
            const result = (virtualPlayerManager as any).getItemsPositions();
            expect(result).to.deep.equal([{ x: 1, y: 1 }]);
        });
    });

    describe('getAttackItemsPositions', () => {
        it('should return accessible attack item positions', () => {
            const mockAttackItemPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.getAttackItemsPositions.returns(mockAttackItemPositions);
            sinon.stub(virtualPlayerManager as any, 'getAccessibleItemPositions').returns([mockAttackItemPositions[0]]);

            const result = (virtualPlayerManager as any).getAttackItemsPositions();

            expect(result).to.deep.equal([{ x: 1, y: 1 }]);
        });
    });

    describe('getDefenseItemsPositions', () => {
        it('should return accessible defense item positions', () => {
            const mockDefenseItemPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.getDefenseItemsPositions.returns(mockDefenseItemPositions);
            sinon.stub(virtualPlayerManager as any, 'getAccessibleItemPositions').returns([mockDefenseItemPositions[0]]);

            const result = (virtualPlayerManager as any).getDefenseItemsPositions();

            expect(result).to.deep.equal([{ x: 1, y: 1 }]);
        });
    });

    describe('resolveAggressivePriorityPosition', () => {
        it('should prioritize flag position if available', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns({ x: 1, y: 1 });
            const result = (virtualPlayerManager as any).resolveAggressivePriorityPosition();
            expect(result).to.deep.equal({ x: 1, y: 1 });
        });

        it('should fallback to next attack item if flag is not prioritized', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextAttackItem').returns({ x: 2, y: 2 });
            const result = (virtualPlayerManager as any).resolveAggressivePriorityPosition();
            expect(result).to.deep.equal({ x: 2, y: 2 });
        });

        it('should fallback to closest player if no flag or attack item is available', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextAttackItem').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToClosestPlayer').returns({ x: 3, y: 3 });
            const result = (virtualPlayerManager as any).resolveAggressivePriorityPosition();
            expect(result).to.deep.equal({ x: 3, y: 3 });
        });
    });

    describe('resolveDefensivePriorityPosition', () => {
        it('should prioritize flag position if available', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns({ x: 1, y: 1 });
            const result = (virtualPlayerManager as any).resolveDefensivePriorityPosition();
            expect(result).to.deep.equal({ x: 1, y: 1 });
        });

        it('should fallback to next defense item if flag is not prioritized', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextDefenseItem').returns({ x: 2, y: 2 });
            const result = (virtualPlayerManager as any).resolveDefensivePriorityPosition();
            expect(result).to.deep.equal({ x: 2, y: 2 });
        });

        it('should fallback to attack item, next item, or closest player', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextDefenseItem').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextAttackItem').returns({ x: 3, y: 3 });
            const result = (virtualPlayerManager as any).resolveDefensivePriorityPosition();
            expect(result).to.deep.equal({ x: 3, y: 3 });
        });

        it('should prioritize flag position if available', () => {
            const flagPosition = { x: 1, y: 1 };
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(flagPosition);
            const result = virtualPlayerManager['resolveDefensivePriorityPosition']();
            expect(result).to.deep.equal(flagPosition);
        });

        it('should fallback to next defense item if flag is not prioritized', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(null);
            const defenseItemPosition = { x: 2, y: 2 };
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextDefenseItem').returns(defenseItemPosition);

            const result = virtualPlayerManager['resolveDefensivePriorityPosition']();
            expect(result).to.deep.equal(defenseItemPosition);
        });

        it('should fallback to next attack item if defense item is not available', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextDefenseItem').returns(null);
            const attackItemPosition = { x: 3, y: 3 };
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextAttackItem').returns(attackItemPosition);

            const result = virtualPlayerManager['resolveDefensivePriorityPosition']();
            expect(result).to.deep.equal(attackItemPosition);
        });

        it('should fallback to next item if attack item is not available', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextDefenseItem').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextAttackItem').returns(null);
            const nextItemPosition = { x: 4, y: 4 };
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextItem').returns(nextItemPosition);

            const result = virtualPlayerManager['resolveDefensivePriorityPosition']();
            expect(result).to.deep.equal(nextItemPosition);
        });

        it('should fallback to closest player if no items are available', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextDefenseItem').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextAttackItem').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextItem').returns(null);
            const closestPlayerPosition = { x: 5, y: 5 };
            sinon.stub(virtualPlayerManager as any, 'getPositionToClosestPlayer').returns(closestPlayerPosition);

            const result = virtualPlayerManager['resolveDefensivePriorityPosition']();
            expect(result).to.deep.equal(closestPlayerPosition);
        });

        it('should return null if no options are available', () => {
            sinon.stub(virtualPlayerManager as any, 'resolveFlagPriority').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextDefenseItem').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextAttackItem').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextItem').returns(null);
            sinon.stub(virtualPlayerManager as any, 'getPositionToClosestPlayer').returns(null);

            const result = virtualPlayerManager['resolveDefensivePriorityPosition']();
            expect(result).to.be.null;
        });
    });

    describe('resolveFlagPriority', () => {
        it('should return start point if virtual player has flag', () => {
            (virtualPlayerManager as any).virtualPlayer.hasFlag = true;
            sinon.stub(virtualPlayerManager as any, 'getPositionToStartPoint').returns({ x: 1, y: 1 });
            const result = (virtualPlayerManager as any).resolveFlagPriority();
            expect(result).to.deep.equal({ x: 1, y: 1 });
        });

        it('should return flag position if virtual player does not have flag', () => {
            (virtualPlayerManager as any).virtualPlayer.hasFlag = false;
            sinon.stub(virtualPlayerManager as any, 'getPositionToFlag').returns({ x: 2, y: 2 });
            const result = (virtualPlayerManager as any).resolveFlagPriority();
            expect(result).to.deep.equal({ x: 2, y: 2 });
        });
    });

    describe('getPositionToClosestPlayer', () => {
        it('should return the next position to the closest player', () => {
            const mockPlayer = { pid: 'player1' } as PlayerInfos;
            sinon.stub(virtualPlayerManager as any, 'getClosestPlayer').returns(mockPlayer);
            sinon.stub(virtualPlayerManager as any, 'getNextPositionToPlayer').returns({ x: 1, y: 1 });

            const result = (virtualPlayerManager as any).getPositionToClosestPlayer();
            expect(result).to.deep.equal({ x: 1, y: 1 });
        });
    });

    describe('hasFullInventory', () => {
        it('should return true if inventory is full', () => {
            virtualPlayerManager['virtualPlayer'].items = [ItemType.BoostAttack, ItemType.DoubleIceBreak];
            const result = virtualPlayerManager['hasFullInventory']();
            expect(result).to.equal(true);
        });

        it('should return false if inventory is not full', () => {
            virtualPlayerManager['virtualPlayer'].items = [ItemType.DoubleIceBreak];
            const result = virtualPlayerManager['hasFullInventory']();
            expect(result).to.equal(false);
        });
    });

    describe('getPositionToNextItemType', () => {
        it('should return null if inventory is full', () => {
            sinon.stub(virtualPlayerManager as any, 'hasFullInventory').returns(true);
            const result = (virtualPlayerManager as any).getPositionToNextItemType([{ x: 3, y: 3 }]);
            expect(result).to.equal(null);
        });
        it('should return the last accessible position to the closest item', () => {
            sinon.stub(virtualPlayerManager as any, 'hasFullInventory').returns(false);
            sinon.stub(virtualPlayerManager as any, 'getClosestPosition').returns({ x: 2, y: 2 });
            sinon.stub(virtualPlayerManager as any, 'getPathToPosition').returns([
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ]);
            sinon.stub(virtualPlayerManager as any, 'getLastAccessiblePosition').returns({ x: 2, y: 2 });

            const result = (virtualPlayerManager as any).getPositionToNextItemType([{ x: 3, y: 3 }]);
            expect(result).to.deep.equal({ x: 2, y: 2 });
        });
    });

    describe('getItemsPositions', () => {
        it('should return accessible item positions', () => {
            const mockPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.getItemsPositions.returns(mockPositions);
            sinon.stub(virtualPlayerManager as any, 'getAccessibleItemPositions').returns([mockPositions[0]]);

            const result = (virtualPlayerManager as any).getItemsPositions();
            expect(result).to.deep.equal([{ x: 1, y: 1 }]);
        });
    });

    describe('getAttackItemsPositions', () => {
        it('should return accessible attack item positions', () => {
            const mockPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.getAttackItemsPositions.returns(mockPositions);
            sinon.stub(virtualPlayerManager as any, 'getAccessibleItemPositions').returns([mockPositions[0]]);

            const result = (virtualPlayerManager as any).getAttackItemsPositions();
            expect(result).to.deep.equal([{ x: 1, y: 1 }]);
        });
    });

    describe('getDefenseItemsPositions', () => {
        it('should return accessible defense item positions', () => {
            const mockPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.getDefenseItemsPositions.returns(mockPositions);
            sinon.stub(virtualPlayerManager as any, 'getAccessibleItemPositions').returns([mockPositions[1]]);

            const result = (virtualPlayerManager as any).getDefenseItemsPositions();
            expect(result).to.deep.equal([{ x: 2, y: 2 }]);
        });
    });

    describe('getNextPositionToPlayer', () => {
        it('should return the last accessible position if player is not accessible', () => {
            const mockPlayer = { pid: 'player1' } as PlayerInfos;
            sinon.stub(virtualPlayerManager as any, 'getPathToPlayer').returns([{ x: 1, y: 1 }]);
            sinon.stub(virtualPlayerManager as any, 'getLastAccessiblePosition').returns({ x: 1, y: 1 });
            const result = (virtualPlayerManager as any).getNextPositionToPlayer(mockPlayer);
            expect(result).to.deep.equal({ x: 1, y: 1 });
        });
    });

    describe('getPositionToNextAttackItem', () => {
        it('should return the position of the next attack item', () => {
            const mockItemPositions = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            sinon.stub(virtualPlayerManager as any, 'getAttackItemsPositions').returns(mockItemPositions);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextItemType').returns(mockItemPositions[0]);

            const result = (virtualPlayerManager as any).getPositionToNextAttackItem();
            expect(result).to.deep.equal({ x: 1, y: 1 });
        });
    });

    describe('getPositionToNextDefenseItem', () => {
        it('should return the position of the next defense item', () => {
            const mockItemPositions = [
                { x: 3, y: 3 },
                { x: 4, y: 4 },
            ];
            sinon.stub(virtualPlayerManager as any, 'getDefenseItemsPositions').returns(mockItemPositions);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextItemType').returns(mockItemPositions[1]);

            const result = (virtualPlayerManager as any).getPositionToNextDefenseItem();
            expect(result).to.deep.equal({ x: 4, y: 4 });
        });
    });

    describe('getPositionToNextItem', () => {
        it('should return the position of the next available item', () => {
            const mockItemPositions = [
                { x: 5, y: 5 },
                { x: 6, y: 6 },
            ];
            sinon.stub(virtualPlayerManager as any, 'getItemsPositions').returns(mockItemPositions);
            sinon.stub(virtualPlayerManager as any, 'getPositionToNextItemType').returns(mockItemPositions[0]);

            const result = (virtualPlayerManager as any).getPositionToNextItem();
            expect(result).to.deep.equal({ x: 5, y: 5 });
        });
    });

    describe('adjustEngagementPoint', () => {
        it('should return a random neighbor if the engagement point is a closed door', () => {
            mockMapManager.isClosedDoor.returns(true);
            const neighbors = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.getAllNeighbors.returns(neighbors);
            sinon.stub(virtualPlayerManager as any, 'chooseRandomPosition').returns(neighbors[0]);

            const result = (virtualPlayerManager as any).adjustEngagementPoint({ x: 3, y: 3 });
            expect(result).to.deep.equal(neighbors[0]);
        });

        it('should return the engagement point if it is not a closed door', () => {
            mockMapManager.isClosedDoor.returns(false);

            const result = (virtualPlayerManager as any).adjustEngagementPoint({ x: 3, y: 3 });
            expect(result).to.deep.equal({ x: 3, y: 3 });
        });
    });
    describe('getDoorPositionsToInteract', () => {
        it('should return the position of a closed door within interaction range', () => {
            const neighbors = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.getAllNeighbors.returns(neighbors);
            mockMapManager.isClosedDoor.callsFake((pos) => helper.sameCoordinate(pos, neighbors[1]));

            const result = (virtualPlayerManager as any).getDoorPositionsToInteract();
            expect(result).to.deep.equal(neighbors[1]);
        });

        it('should return null if no closed door is within interaction range', () => {
            const neighbors = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            mockMapManager.getAllNeighbors.returns(neighbors);
            mockMapManager.isClosedDoor.returns(false);

            const result = (virtualPlayerManager as any).getDoorPositionsToInteract();
            expect(result).to.be.null;
        });
    });
});
