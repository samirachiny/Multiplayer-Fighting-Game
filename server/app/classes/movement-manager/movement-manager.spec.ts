/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-lines */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import * as mockPositions from '@app/utils/data';
import { Coordinate } from '@common/interfaces/coordinate';
import { expect } from 'chai';
import { MovementManager } from '@app/classes/movement-manager/movement-manager';
import { MOCK_PLAYER_INFOS } from '@app/utils/data';
import { MapManager } from '@app/classes/map-manager/map-manager';
import * as sinon from 'sinon';
import { PlayerInfos } from '@common/interfaces/player-infos';

describe('Movement Manager class', () => {
    let mapManager: MapManager;
    let movementManager: MovementManager;
    let players: PlayerInfos[];

    beforeEach(() => {
        players = [
            { pid: 'player1', currentPosition: { x: 1, y: 1 }, availableMoves: 3 } as PlayerInfos,
            { pid: 'player2', currentPosition: { x: 2, y: 2 }, availableMoves: 4 } as PlayerInfos,
        ];
        mapManager = new MapManager();
        mapManager.setMap(
            Array(20)
                .fill(null)
                .map(() => Array(20).fill(10)),
        );
        movementManager = new MovementManager(mapManager);
        movementManager.setMovementPoints(3);
        (movementManager as any).stack = [];
        (movementManager as any).visited = [];
        (movementManager as any).queue = [];
    });

    function setTile(position: Coordinate, value: number): void {
        mapManager['_map'][position.y][position.x] = value;
    }

    function equals(firstPosition: Coordinate, secondPosition: Coordinate): boolean {
        return firstPosition.x === secondPosition.x && firstPosition.y === secondPosition.y;
    }

    function setNodeCost(position: Coordinate, value: number): void {
        (movementManager as any).getNode(position).cost = value;
    }

    describe('addNeighborToQueueIfNeeded', () => {
        it('should add neighbor to the queue if new remaining moves are greater than current remaining moves', () => {
            const neighbor = { x: 1, y: 1 };
            const currentRemainingMoves = 2;
            const newRemainingMoves = 3;

            movementManager['addNeighborToQueueIfNeeded'](neighbor, currentRemainingMoves, newRemainingMoves);

            expect((movementManager as any).queue).to.include(neighbor);
        });

        it('should not add neighbor to the queue if new remaining moves are less than or equal to current remaining moves', () => {
            const neighbor = { x: 1, y: 1 };
            const currentRemainingMoves = 3;
            const newRemainingMoves = 2;

            movementManager['addNeighborToQueueIfNeeded'](neighbor, currentRemainingMoves, newRemainingMoves);

            expect((movementManager as any).queue).to.not.include(neighbor);
        });

        it('should not add neighbor to the queue if current remaining moves are -1 (no remaining moves)', () => {
            const neighbor = { x: 1, y: 1 };
            const currentRemainingMoves = -1;
            const newRemainingMoves = 2;

            movementManager['addNeighborToQueueIfNeeded'](neighbor, currentRemainingMoves, newRemainingMoves);

            expect((movementManager as any).queue).to.not.include(neighbor);
        });
    });

    describe('Conversion to nodes, map initialization and player marking', () => {
        it('should correctly transform the position into a node', () => {
            const mockPosition = mockPositions.VALID_POSITIONS[0];
            setTile(mockPosition, 12);
            let node = (movementManager as any).transformToNode(mockPosition);
            expect(equals(node.position, mockPosition)).to.equal(true);
            expect(node.cost).to.equal(1);
            expect(node.remainingMoves).to.equal(-1);

            setTile(mockPosition, 39);
            node = (movementManager as any).transformToNode(mockPosition);
            expect(equals(node.position, mockPosition)).to.equal(true);
            expect(node.cost).to.equal(2);
            expect(node.remainingMoves).to.equal(-1);
        });

        it('should initialize the Node map correctly ', () => {
            mapManager.setMap([
                [18, 0, 10, 10, 10, 10, 10, 15, 0, 10],
                [10, 0, 10, 10, 50, 12, 0, 0, 0, 10],
                [10, 0, 12, 12, 0, 0, 0, 0, 0, 10],
                [10, 0, 25, 0, 0, 0, 0, 0, 0, 10],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 37, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
            ]);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(3);

            let node = (movementManager as any).getNode({ x: 0, y: 0 });
            expect(equals(node.position, { x: 0, y: 0 })).to.equal(true);
            expect(node.cost).to.equal(1);
            expect(node.remainingMoves).to.equal(-1);

            node = (movementManager as any).getNode({ x: 2, y: 3 });
            expect(equals(node.position, { x: 2, y: 3 })).to.equal(true);
            expect(node.cost).to.equal(0);
            expect(node.remainingMoves).to.equal(-1);

            node = (movementManager as any).getNode({ x: 2, y: 5 });
            expect(equals(node.position, { x: 2, y: 5 })).to.equal(true);
            expect(node.cost).to.equal(2);
            expect(node.remainingMoves).to.equal(-1);
        });

        it(' should mark player positions correctly', () => {
            mapManager.setMap([
                [18, 0, 10, 10, 10, 10, 10, 15, 0, 10],
                [10, 0, 10, 10, 50, 12, 0, 0, 0, 10],
                [10, 0, 12, 12, 0, 0, 0, 0, 0, 10],
                [10, 0, 25, 0, 0, 0, 0, 0, 0, 10],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 37, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
            ]);
            movementManager['acquireNodeMap']();

            let node = (movementManager as any).getNode({ x: 0, y: 0 });
            expect(node.cost).to.equal(1);
            (movementManager as any).setNodeMap([MOCK_PLAYER_INFOS], { x: 0, y: 0 });
            node = (movementManager as any).getNode({ x: 0, y: 0 });
            expect(node.cost).to.equal(1);
            (movementManager as any).setNodeMap([MOCK_PLAYER_INFOS], { x: 5, y: 0 });
            node = (movementManager as any).getNode({ x: 0, y: 0 });
            expect(node.cost).to.equal(-1);
        });
    });

    describe('getPathCost', () => {
        it('should calculate the correct path cost', () => {
            const path: Coordinate[] = [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
            ];
            const ignoreClosedDoorsStub = sinon.stub(mapManager, 'ignoreClosedDoors').callsFake(() => {});
            const restoreClosedDoorsStub = sinon.stub(mapManager, 'restoreClosedDoors').callsFake(() => {});
            sinon.stub(mapManager, 'resolveCost').returns(1);
            const result = movementManager.getPathCost(path);
            expect(result).to.equal(2);
            expect(ignoreClosedDoorsStub.calledOnce).to.equal(true);
            expect(restoreClosedDoorsStub.calledOnce).to.equal(true);
        });
    });
    describe('ignoreClosedDoors', () => {
        it('should call ignoreClosedDoors on mapManager and acquireNodeMap', () => {
            const ignoreClosedDoorsStub = sinon.stub(mapManager, 'ignoreClosedDoors').callsFake(() => {});
            const acquireNodeMapStub = sinon.stub(movementManager, 'acquireNodeMap').callsFake(() => {});
            movementManager.ignoreClosedDoors();
            expect(ignoreClosedDoorsStub.calledOnce).to.equal(true);
            expect(acquireNodeMapStub.calledOnce).to.equal(true);
        });
    });
    describe('restoreClosedDoors', () => {
        it('should call restoreClosedDoors on mapManager and acquireNodeMap', () => {
            const ignoreClosedDoorsStub = sinon.stub(mapManager, 'restoreClosedDoors').callsFake(() => {});
            const acquireNodeMapStub = sinon.stub(movementManager, 'acquireNodeMap').callsFake(() => {});
            movementManager.restoreClosedDoors();
            expect(ignoreClosedDoorsStub.calledOnce).to.equal(true);
            expect(acquireNodeMapStub.calledOnce).to.equal(true);
        });
    });

    describe('getPlayerPathTo', () => {
        it('should return the correct path for the player', () => {
            const player = players[0];
            const endPosition: Coordinate = { x: 2, y: 2 };
            const getPathStub = sinon.stub(movementManager, 'getPath').callsFake(() => []);
            movementManager.getPlayerPathTo(player, endPosition);
            expect(getPathStub.calledOnceWith({ x: player.currentPosition.y, y: player.currentPosition.x }, endPosition)).to.equal(true);
        });
        it('should return an empty array if player is null', () => {
            const endPosition: Coordinate = { x: 2, y: 2 };
            const result = movementManager.getPlayerPathTo(null, endPosition);
            expect(result).to.deep.equal([]);
        });
    });
    describe('getAccessiblePositions', () => {
        it('should return the correct accessible positions for the player', () => {
            const playerId = 'player1';
            const initMoveStub = sinon.stub(movementManager, 'initMove').callsFake(() => {});
            const getAccessibleTilesStub = sinon.stub(movementManager as any, 'getAccessibleTiles').callsFake(() => {});
            movementManager.getAccessiblePositions(playerId, players);
            expect(initMoveStub.calledOnceWith(players, playerId)).to.equal(true);
            expect(getAccessibleTilesStub.calledOnceWith({ x: players[0].currentPosition.y, y: players[0].currentPosition.x })).to.equal(true);
        });
        it('should return an empty array if player is not found', () => {
            const playerId = 'player3';
            const result = movementManager.getAccessiblePositions(playerId, players);
            expect(result).to.deep.equal([]);
        });
    });
    describe('initMove', () => {
        let setMovementPointsStub: any;
        let setNodeMapStub: any;
        beforeEach(() => {
            setMovementPointsStub = sinon.stub(movementManager, 'setMovementPoints').callsFake(() => {});
            setNodeMapStub = sinon.stub(movementManager, 'setNodeMap').callsFake(() => {});
        });
        it('should initialize movement for the player', () => {
            const playerId = 'player1';
            movementManager.initMove(players, playerId);
            expect(setMovementPointsStub.calledOnceWith(players[0].availableMoves)).to.equal(true);
            expect(setNodeMapStub.calledOnceWith(players, players[0].currentPosition)).to.equal(true);
        });
        it('should not initialize movement if player is not found', () => {
            const playerId = 'player3';
            movementManager.initMove(players, playerId);
            expect(setMovementPointsStub.called).to.be.false;
            expect(setNodeMapStub.called).to.be.false;
        });
    });

    describe('Node manipulation and neighbor logic', () => {
        it('should correctly update the remaining moves of each node', () => {
            (movementManager as any).setAvailableMoves({ x: 0, y: 0 }, 5);
            expect((movementManager as any).getNode({ x: 0, y: 0 }).remainingMoves).to.equal(5);

            (movementManager as any).setAvailableMoves({ x: 0, y: 0 }, 7);
            expect((movementManager as any).getNode({ x: 0, y: 0 }).remainingMoves).to.equal(7);

            (movementManager as any).setAvailableMoves({ x: 0, y: 0 }, 0);
            expect((movementManager as any).getNode({ x: 0, y: 0 }).remainingMoves).to.equal(0);
        });

        it('getNeighbors should update the predecessorMap Accordingly', () => {
            let position = { x: 1, y: 1 };
            (movementManager as any).getNeighbors(position);
            let neighbors = (movementManager as any).neighborMap.get(position);
            expect(neighbors.length).to.equal(4);
            expect(equals(neighbors[0], { x: 1, y: 0 })).to.equal(true);
            expect(equals(neighbors[1], { x: 0, y: 1 })).to.equal(true);
            expect(equals(neighbors[2], { x: 1, y: 2 })).to.equal(true);
            expect(equals(neighbors[3], { x: 2, y: 1 })).to.equal(true);

            position = { x: 0, y: 0 };
            (movementManager as any).getNeighbors(position);
            neighbors = (movementManager as any).neighborMap.get(position);
            expect(neighbors.length).to.equal(2);
            expect(equals(neighbors[0], { x: 0, y: 1 })).to.equal(true);
            expect(equals(neighbors[1], { x: 1, y: 0 })).to.equal(true);
        });

        it('should correctly tell if a neighbor is visitable', () => {
            const position = { x: 3, y: 3 };
            const rightNeighbor = { x: 4, y: 3 };
            const leftNeighbor = { x: 2, y: 3 };
            const upNeighbor = { x: 3, y: 2 };
            const downNeighbor = { x: 3, y: 4 };
            (movementManager as any).setAvailableMoves(position, 2);
            setNodeCost(rightNeighbor, 2);
            expect((movementManager as any).isNeighborAccessible(position, rightNeighbor)).to.equal(true);

            setNodeCost(rightNeighbor, 3);
            expect((movementManager as any).isNeighborAccessible(position, rightNeighbor)).to.equal(false);

            setNodeCost(rightNeighbor, -1);
            expect((movementManager as any).isNeighborAccessible(position, rightNeighbor)).to.equal(false);

            (movementManager as any).getNeighbors(position);

            expect((movementManager as any).isAnyNeighborAccessible(position)).to.equal(true);

            setNodeCost(leftNeighbor, 3);
            setNodeCost(upNeighbor, 3);
            setNodeCost(downNeighbor, 3);

            expect((movementManager as any).isAnyNeighborAccessible(position)).to.equal(false);

            setNodeCost(upNeighbor, 0);

            expect((movementManager as any).isAnyNeighborAccessible(position)).to.equal(true);
        });

        it('visitNeighbor should visit and update neighboring tiles accordingly', () => {
            let position = { x: 1, y: 1 };

            setNodeCost({ x: 1, y: 0 }, 3);
            setNodeCost({ x: 1, y: 2 }, 6);
            setNodeCost({ x: 0, y: 1 }, -1);
            (movementManager as any).setAvailableMoves(position, 5);

            const neighbors: Coordinate[] = (movementManager as any).mapManager.getAllNeighbors(position);

            neighbors.forEach((neighborPos) => {
                (movementManager as any).visitNeighbor(position, neighborPos);
            });

            expect((movementManager as any).getNode({ x: 1, y: 0 }).remainingMoves).to.equal(2);
            expect((movementManager as any).getNode({ x: 0, y: 1 }).remainingMoves).to.equal(-1);
            expect((movementManager as any).getNode({ x: 2, y: 1 }).remainingMoves).to.equal(4);
            expect((movementManager as any).getNode({ x: 1, y: 2 }).remainingMoves).to.equal(-1);

            expect(equals((movementManager as any).visited[0], { x: 1, y: 0 })).to.equal(true);
            expect(equals((movementManager as any).visited[1], { x: 2, y: 1 })).to.equal(true);

            (movementManager as any).visited = [];

            position = { x: 3, y: 3 };
            const neighbor = { x: 3, y: 4 };
            (movementManager as any).setAvailableMoves(position, 0);
            (movementManager as any).visitNeighbor(position, neighbor);

            expect((movementManager as any).getNode(neighbor).remainingMoves).to.equal(-1);
            expect((movementManager as any).visited.length).to.equal(0);
        });

        it('visitNeighbors should visit all neighbors of a given Tile and update the Visited array', () => {
            const position = { x: 4, y: 7 };
            (movementManager as any).setAvailableMoves(position, 5);

            const rightNeighbor = { x: 5, y: 7 };
            const leftNeighbor = { x: 3, y: 7 };
            const upNeighbor = { x: 4, y: 6 };
            const downNeighbor = { x: 4, y: 8 };

            (movementManager as any).getNeighbors(position);
            (movementManager as any).visitNeighbors(position);
            expect(equals((movementManager as any).visited[0], upNeighbor)).to.equal(true);
            expect(equals((movementManager as any).visited[1], leftNeighbor)).to.equal(true);
            expect(equals((movementManager as any).visited[2], downNeighbor)).to.equal(true);
            expect(equals((movementManager as any).visited[3], rightNeighbor)).to.equal(true);
        });
    });

    describe('Traversal termination conditions', () => {
        it('isVisited and isQueue should check whether a position is already in the visited array or queue', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                expect((movementManager as any).isVisited(position)).to.equal(false);
                expect((movementManager as any).isQueued(position)).to.equal(false);
                (movementManager as any).visited.push(position);
                (movementManager as any).queue.push(position);
                expect((movementManager as any).isVisited(position)).to.equal(true);
                expect((movementManager as any).isQueued(position)).to.equal(true);
            });
        });

        it('should detect if a position is a dead end ', () => {
            const position = { x: 4, y: 7 };
            (movementManager as any).setAvailableMoves(position, 0);
            expect((movementManager as any).isDeadEnd(position)).to.equal(true);

            const rightNeighbor = { x: 5, y: 7 };
            const leftNeighbor = { x: 3, y: 7 };
            const upNeighbor = { x: 4, y: 6 };
            const downNeighbor = { x: 4, y: 8 };

            setNodeCost(rightNeighbor, 3);
            setNodeCost(leftNeighbor, -1);
            setNodeCost(upNeighbor, 3);
            setNodeCost(downNeighbor, 1);

            (movementManager as any).getNeighbors(position);
            (movementManager as any).setAvailableMoves(position, 1);
            expect((movementManager as any).isDeadEnd(position)).to.equal(false);

            setNodeCost(downNeighbor, -1);

            expect((movementManager as any).isDeadEnd(position)).to.equal(true);
        });

        it('should filter out deadEnds from the queue', () => {
            (movementManager as any).queue = [...mockPositions.MIDDLE_POSITIONS];
            mockPositions.MIDDLE_POSITIONS.forEach((position) => {
                (movementManager as any).setAvailableMoves(position, 0);
            });
            (movementManager as any).filterDeadEnds();
        });
    });

    describe('Accessible tiles acquisition', () => {
        it('should correctly acquire accessible tiles on an empty map', () => {
            (movementManager as any).availableMoves = 4;
            expect(movementManager['getAccessibleTiles']({ x: 0, y: 0 }).length).to.equal(15);
            expect(movementManager['getAccessibleTiles']({ x: 1, y: 1 }).length).to.equal(24);
            expect(movementManager['getAccessibleTiles']({ x: 10, y: 10 }).length).to.equal(41);
        });

        it('should correctly acquire accessible tiles on a map with walls and closed doors', () => {
            setTile({ x: 5, y: 1 }, 0);
            setTile({ x: 3, y: 3 }, 50);
            setTile({ x: 6, y: 3 }, 0);
            setTile({ x: 2, y: 4 }, 50);
            setTile({ x: 5, y: 5 }, 50);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(3);
            expect(movementManager['getAccessibleTiles']({ x: 5, y: 4 }).length).to.equal(18);

            setTile({ x: 7, y: 4 }, 50);
            setTile({ x: 5, y: 5 }, 0);
            setTile({ x: 6, y: 5 }, 50);
            setTile({ x: 3, y: 6 }, 0);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(4);
            expect(movementManager['getAccessibleTiles']({ x: 5, y: 4 }).length).to.equal(19);

            setTile({ x: 0, y: 1 }, 0);
            setTile({ x: 1, y: 0 }, 0);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(3);
            expect(movementManager['getAccessibleTiles']({ x: 0, y: 0 }).length).to.equal(1);
        });

        it('should correctly acquire accessible tiles on a map with ice tiles', () => {
            setTile({ x: 8, y: 4 }, 20);
            setTile({ x: 11, y: 5 }, 20);
            setTile({ x: 6, y: 6 }, 20);
            setTile({ x: 8, y: 8 }, 20);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(3);
            expect(movementManager['getAccessibleTiles']({ x: 8, y: 5 }).length).to.equal(39);

            setTile({ x: 8, y: 4 }, 10);
            setTile({ x: 11, y: 5 }, 10);
            setTile({ x: 6, y: 6 }, 10);
            setTile({ x: 8, y: 8 }, 10);

            setTile({ x: 1, y: 2 }, 20);
            setTile({ x: 2, y: 1 }, 20);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(4);

            expect(movementManager['getAccessibleTiles']({ x: 0, y: 0 }).length).to.equal(19);

            setTile({ x: 1, y: 2 }, 10);
            setTile({ x: 2, y: 1 }, 10);

            setTile({ x: 6, y: 2 }, 20);
            setTile({ x: 7, y: 2 }, 20);
            setTile({ x: 7, y: 4 }, 20);
            setTile({ x: 7, y: 5 }, 20);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(2);
            expect(movementManager['getAccessibleTiles']({ x: 6, y: 4 }).length).to.equal(25);
        });

        it('should correctly acquire accessible tiles on a map with water tiles', () => {
            setTile({ x: 8, y: 3 }, 30);
            setTile({ x: 9, y: 5 }, 30);
            setTile({ x: 7, y: 6 }, 30);
            setTile({ x: 8, y: 7 }, 30);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(2);
            expect(movementManager['getAccessibleTiles']({ x: 8, y: 5 }).length).to.equal(9);

            setTile({ x: 8, y: 3 }, 10);
            setTile({ x: 9, y: 5 }, 10);
            setTile({ x: 7, y: 6 }, 10);
            setTile({ x: 8, y: 7 }, 10);

            setTile({ x: 1, y: 8 }, 30);
            setTile({ x: 4, y: 9 }, 30);
            setTile({ x: 2, y: 11 }, 30);
            setTile({ x: 3, y: 12 }, 30);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(3);
            expect(movementManager['getAccessibleTiles']({ x: 2, y: 10 }).length).to.equal(20);

            setTile({ x: 1, y: 8 }, 10);
            setTile({ x: 4, y: 9 }, 10);
            setTile({ x: 2, y: 11 }, 10);
            setTile({ x: 3, y: 12 }, 10);

            setTile({ x: 11, y: 2 }, 30);
            setTile({ x: 12, y: 2 }, 30);
            setTile({ x: 9, y: 3 }, 30);
            setTile({ x: 11, y: 4 }, 30);
            setTile({ x: 8, y: 5 }, 30);
            setTile({ x: 11, y: 5 }, 30);
            setTile({ x: 9, y: 6 }, 30);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(4);
            expect(movementManager['getAccessibleTiles']({ x: 10, y: 4 }).length).to.equal(37);
        });

        it('should correctly acquire accessible tiles on a map with all tile types', () => {
            setTile({ x: 4, y: 2 }, 0);
            setTile({ x: 8, y: 3 }, 0);
            setTile({ x: 4, y: 5 }, 0);

            setTile({ x: 6, y: 2 }, 20);
            setTile({ x: 3, y: 3 }, 20);
            setTile({ x: 4, y: 4 }, 20);

            setTile({ x: 5, y: 1 }, 30);
            setTile({ x: 6, y: 4 }, 30);
            setTile({ x: 5, y: 6 }, 30);
            setTile({ x: 4, y: 3 }, 30);

            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(3);
            expect(movementManager['getAccessibleTiles']({ x: 5, y: 3 }).length).to.equal(24);

            mapManager.setMap(
                Array(20)
                    .fill(null)
                    .map(() => Array(20).fill(10)),
            );
            movementManager.setMovementPoints(4);

            setTile({ x: 5, y: 4 }, 0);
            setTile({ x: 7, y: 4 }, 0);
            setTile({ x: 7, y: 5 }, 0);

            setTile({ x: 4, y: 5 }, 20);
            setTile({ x: 8, y: 5 }, 20);
            setTile({ x: 8, y: 6 }, 20);
            setTile({ x: 5, y: 8 }, 20);
            setTile({ x: 8, y: 8 }, 20);

            setTile({ x: 6, y: 3 }, 30);
            setTile({ x: 9, y: 6 }, 30);
            setTile({ x: 5, y: 7 }, 30);
            setTile({ x: 6, y: 7 }, 30);
            setTile({ x: 7, y: 9 }, 30);

            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(4);
            expect(movementManager['getAccessibleTiles']({ x: 6, y: 6 }).length).to.equal(50);
        });
    });

    describe('Path finding utility methods', () => {
        it('should be able to acquire access points and identify them', () => {
            setTile({ x: 5, y: 4 }, 0);
            setTile({ x: 7, y: 4 }, 0);
            setTile({ x: 7, y: 5 }, 0);

            setTile({ x: 4, y: 5 }, 20);
            setTile({ x: 8, y: 5 }, 20);
            setTile({ x: 8, y: 6 }, 20);
            setTile({ x: 5, y: 8 }, 20);
            setTile({ x: 8, y: 8 }, 20);

            setTile({ x: 6, y: 3 }, 30);
            setTile({ x: 9, y: 6 }, 30);
            setTile({ x: 5, y: 7 }, 30);
            setTile({ x: 6, y: 7 }, 30);
            setTile({ x: 7, y: 9 }, 30);

            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(4);

            movementManager['getAccessibleTiles']({ x: 6, y: 6 });

            (movementManager as any).getAccessPoints({ x: 4, y: 5 });

            expect((movementManager as any).isAccessPoint({ x: 5, y: 5 }, { x: 4, y: 5 })).to.equal(true);
            expect((movementManager as any).isAccessPoint({ x: 4, y: 6 }, { x: 4, y: 5 })).to.equal(true);

            expect((movementManager as any).isAccessPoint({ x: 5, y: 6 }, { x: 5, y: 7 })).to.equal(true);
            expect((movementManager as any).isAccessPoint({ x: 6, y: 7 }, { x: 5, y: 7 })).to.equal(false);
        });

        it('should be able to slice an array at the last neighbor of the startingPosition', () => {
            let path: Coordinate[] = [];
            path.push({ x: 3, y: 1 });
            path.push({ x: 3, y: 2 });
            path.push({ x: 2, y: 2 });
            path.push({ x: 1, y: 2 });
            path.push({ x: 1, y: 3 });
            path.push({ x: 0, y: 3 });

            expect((movementManager as any).sliceAtLastNeighbor({ x: 2, y: 1 }, path)).to.equal(true);
            expect(path.length).to.equal(4);

            path = [];
            path.push({ x: 1, y: 1 });
            path.push({ x: 1, y: 2 });
            path.push({ x: 2, y: 2 });
            path.push({ x: 3, y: 2 });
            path.push({ x: 3, y: 1 });
            path.push({ x: 3, y: 0 });
            path.push({ x: 4, y: 0 });

            expect((movementManager as any).sliceAtLastNeighbor({ x: 2, y: 1 }, path)).to.equal(true);
            expect(path.length).to.equal(3);

            path = [];

            path.push({ x: 3, y: 1 });
            path.push({ x: 3, y: 2 });
            path.push({ x: 4, y: 2 });

            expect((movementManager as any).sliceAtLastNeighbor({ x: 2, y: 1 }, path)).to.equal(false);
        });

        it('optimizePath should remove all the detours from a path', () => {
            let path = [];

            path.push({ x: 7, y: 5 });
            path.push({ x: 8, y: 5 });
            path.push({ x: 9, y: 5 });
            path.push({ x: 10, y: 5 });
            path.push({ x: 9, y: 4 });
            path.push({ x: 7, y: 6 });
            path.push({ x: 7, y: 7 });

            let newPath = (movementManager as any).optimizePath({ x: 6, y: 5 }, path);
            expect(newPath.length).to.equal(3);
            expect(equals(newPath[0], { x: 7, y: 5 })).to.equal(true);
            expect(equals(newPath[1], { x: 7, y: 6 })).to.equal(true);
            expect(equals(newPath[2], { x: 7, y: 7 })).to.equal(true);

            path = [];
            path.push({ x: 7, y: 5 });
            path.push({ x: 8, y: 5 });
            path.push({ x: 9, y: 5 });
            newPath = (movementManager as any).optimizePath({ x: 6, y: 5 }, path);
            expect(newPath.length).to.equal(3);
            expect(equals(newPath[0], { x: 7, y: 5 })).to.equal(true);
            expect(equals(newPath[1], { x: 8, y: 5 })).to.equal(true);
            expect(equals(newPath[2], { x: 9, y: 5 })).to.equal(true);
        });

        it('isStacked should tell if a position is already in the stack', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                expect((movementManager as any).isStacked(position)).to.equal(false);
                (movementManager as any).stack.push(position);
                expect((movementManager as any).isStacked(position)).to.equal(true);
            });
        });

        it('canBeStacked should correctly tell if a position should be added to the stack', () => {
            const position = { x: 0, y: 0 };
            expect((movementManager as any).canBeStacked(position)).to.equal(false);

            (movementManager as any).setAvailableMoves(position, 1);
            expect((movementManager as any).canBeStacked(position)).to.equal(true);

            (movementManager as any).stack.push(position);
            expect((movementManager as any).canBeStacked(position)).to.equal(false);

            (movementManager as any).stack.pop();
            (movementManager as any).visited.push(position);
            expect((movementManager as any).canBeStacked(position)).to.equal(false);
        });
    });

    describe('Path finding between 2 positions', () => {
        it('should find a path between 2 positions in a map with walls', () => {
            setTile({ x: 6, y: 3 }, 0);
            setTile({ x: 8, y: 4 }, 0);
            setTile({ x: 5, y: 5 }, 0);
            setTile({ x: 8, y: 6 }, 0);
            setTile({ x: 5, y: 7 }, 0);

            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(4);
            let path = movementManager.getPath({ x: 6, y: 5 }, { x: 8, y: 7 });
            expect(path.length).to.equal(4);
            expect(equals(path[0], { x: 7, y: 5 })).to.equal(true);
            expect(equals(path[1], { x: 7, y: 6 })).to.equal(true);
            expect(equals(path[2], { x: 7, y: 7 })).to.equal(true);
            expect(equals(path[3], { x: 8, y: 7 })).to.equal(true);

            mapManager.setMap(
                Array(20)
                    .fill(null)
                    .map(() => Array(20).fill(10)),
            );

            setTile({ x: 2, y: 0 }, 0);
            setTile({ x: 4, y: 1 }, 0);
            setTile({ x: 0, y: 2 }, 0);
            setTile({ x: 2, y: 3 }, 0);
            setTile({ x: 1, y: 4 }, 0);

            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(4);
            path = movementManager.getPath({ x: 2, y: 1 }, { x: 0, y: 3 });
            expect(path.length).to.equal(4);
            expect(equals(path[0], { x: 2, y: 2 })).to.equal(true);
            expect(equals(path[1], { x: 1, y: 2 })).to.equal(true);
            expect(equals(path[2], { x: 1, y: 3 })).to.equal(true);
            expect(equals(path[3], { x: 0, y: 3 })).to.equal(true);

            setTile({ x: 8, y: 5 }, 0);
            setTile({ x: 5, y: 6 }, 0);
            setTile({ x: 7, y: 6 }, 0);
            setTile({ x: 5, y: 7 }, 0);
            setTile({ x: 8, y: 8 }, 0);
            setTile({ x: 4, y: 8 }, 0);
            setTile({ x: 6, y: 10 }, 0);

            path = movementManager.getPath({ x: 6, y: 8 }, { x: 4, y: 9 });
            expect(path.length).to.equal(3);
            expect(equals(path[0], { x: 6, y: 9 })).to.equal(true);
            expect(equals(path[1], { x: 5, y: 9 })).to.equal(true);
            expect(equals(path[2], { x: 4, y: 9 })).to.equal(true);

            path = movementManager.getPath({ x: 6, y: 8 }, { x: 6, y: 6 });
            expect(path.length).to.equal(2);
            expect(equals(path[0], { x: 6, y: 7 })).to.equal(true);
            expect(equals(path[1], { x: 6, y: 6 })).to.equal(true);
        });

        it('should find a path between 2 positions in a map with water tiles', () => {
            setTile({ x: 1, y: 4 }, 30);
            setTile({ x: 2, y: 5 }, 30);
            setTile({ x: 4, y: 6 }, 30);
            setTile({ x: 4, y: 7 }, 30);
            setTile({ x: 1, y: 9 }, 30);
            setTile({ x: 2, y: 9 }, 30);
            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(4);
            let path = movementManager.getPath({ x: 2, y: 7 }, { x: 4, y: 6 });
            expect(path.length).to.equal(3);
            expect(equals(path[0], { x: 3, y: 7 })).to.equal(true);
            expect(equals(path[1], { x: 3, y: 6 })).to.equal(true);
            expect(equals(path[2], { x: 4, y: 6 })).to.equal(true);

            path = movementManager.getPath({ x: 2, y: 7 }, { x: 1, y: 9 });
            expect(path.length).to.equal(3);
            expect(equals(path[0], { x: 2, y: 8 })).to.equal(true);
            expect(equals(path[1], { x: 1, y: 8 })).to.equal(true);
            expect(equals(path[2], { x: 1, y: 9 })).to.equal(true);

            mapManager.setMap(
                Array(20)
                    .fill(null)
                    .map(() => Array(20).fill(10)),
            );

            setTile({ x: 5, y: 3 }, 30);
            setTile({ x: 7, y: 3 }, 30);
            setTile({ x: 4, y: 4 }, 30);
            setTile({ x: 3, y: 5 }, 30);
            setTile({ x: 7, y: 5 }, 30);
            setTile({ x: 1, y: 6 }, 30);
            setTile({ x: 5, y: 7 }, 30);
            setTile({ x: 3, y: 8 }, 30);
            movementManager['acquireNodeMap']();

            path = movementManager.getPath({ x: 5, y: 5 }, { x: 4, y: 8 });
            expect(path.length).to.equal(4);
            expect(equals(path[0], { x: 5, y: 6 })).to.equal(true);
            expect(equals(path[1], { x: 4, y: 6 })).to.equal(true);
            expect(equals(path[2], { x: 4, y: 7 })).to.equal(true);
            expect(equals(path[3], { x: 4, y: 8 })).to.equal(true);

            path = movementManager.getPath({ x: 5, y: 5 }, { x: 8, y: 5 });
            expect(path.length).to.equal(3);
            expect(equals(path[0], { x: 6, y: 5 })).to.equal(true);
            expect(equals(path[1], { x: 7, y: 5 })).to.equal(true);
            expect(equals(path[2], { x: 8, y: 5 })).to.equal(true);
        });

        it('should find a path between 2 positions in a map with Ice tiles', () => {
            setTile({ x: 3, y: 2 }, 20);
            setTile({ x: 7, y: 3 }, 20);
            setTile({ x: 2, y: 4 }, 20);
            setTile({ x: 6, y: 4 }, 20);
            setTile({ x: 8, y: 4 }, 20);
            setTile({ x: 3, y: 6 }, 20);

            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(3);

            let path = movementManager.getPath({ x: 4, y: 4 }, { x: 7, y: 4 });
            expect(path.length).to.equal(3);
            expect(equals(path[0], { x: 5, y: 4 })).to.equal(true);
            expect(equals(path[1], { x: 6, y: 4 })).to.equal(true);
            expect(equals(path[2], { x: 7, y: 4 })).to.equal(true);

            path = movementManager.getPath({ x: 4, y: 4 }, { x: 2, y: 6 });
            expect(path.length).to.equal(4);
            expect(equals(path[0], { x: 4, y: 5 })).to.equal(true);
            expect(equals(path[1], { x: 4, y: 6 })).to.equal(true);
            expect(equals(path[2], { x: 3, y: 6 })).to.equal(true);
            expect(equals(path[3], { x: 2, y: 6 })).to.equal(true);

            path = movementManager.getPath({ x: 4, y: 4 }, { x: 3, y: 1 });
            expect(path.length).to.equal(4);
            expect(equals(path[0], { x: 3, y: 4 })).to.equal(true);
            expect(equals(path[1], { x: 3, y: 3 })).to.equal(true);
            expect(equals(path[2], { x: 3, y: 2 })).to.equal(true);
            expect(equals(path[3], { x: 3, y: 1 })).to.equal(true);
        });

        it('should find a path between 2 positions in a map with all tile types', () => {
            setTile({ x: 5, y: 4 }, 0);
            setTile({ x: 7, y: 4 }, 0);
            setTile({ x: 7, y: 5 }, 0);

            setTile({ x: 4, y: 5 }, 20);
            setTile({ x: 8, y: 5 }, 20);
            setTile({ x: 8, y: 6 }, 20);
            setTile({ x: 5, y: 8 }, 20);
            setTile({ x: 8, y: 8 }, 20);

            setTile({ x: 6, y: 3 }, 30);
            setTile({ x: 9, y: 6 }, 30);
            setTile({ x: 5, y: 7 }, 30);
            setTile({ x: 6, y: 7 }, 30);
            setTile({ x: 7, y: 9 }, 30);

            movementManager['acquireNodeMap']();
            movementManager.setMovementPoints(4);

            let path = movementManager.getPath({ x: 6, y: 6 }, { x: 9, y: 8 });
            expect(path.length).to.equal(5);
            expect(equals(path[0], { x: 7, y: 6 })).to.equal(true);
            expect(equals(path[1], { x: 8, y: 6 })).to.equal(true);
            expect(equals(path[2], { x: 8, y: 7 })).to.equal(true);
            expect(equals(path[3], { x: 8, y: 8 })).to.equal(true);
            expect(equals(path[4], { x: 9, y: 8 })).to.equal(true);

            path = movementManager.getPath({ x: 6, y: 6 }, { x: 8, y: 2 });
            expect(path.length).to.equal(6);
            expect(equals(path[0], { x: 7, y: 6 })).to.equal(true);
            expect(equals(path[1], { x: 8, y: 6 })).to.equal(true);
            expect(equals(path[2], { x: 8, y: 5 })).to.equal(true);
            expect(equals(path[3], { x: 8, y: 4 })).to.equal(true);
            expect(equals(path[4], { x: 8, y: 3 })).to.equal(true);
            expect(equals(path[5], { x: 8, y: 2 })).to.equal(true);

            path = movementManager.getPath({ x: 6, y: 6 }, { x: 6, y: 10 });
            expect(path.length).to.equal(0);
        });
    });

    describe('Slipping on Ice tiles', () => {
        it('hasSlipped should always return false if its not an ice Tile', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                expect((movementManager as any).hasSlipped(position)).to.equal(false);
            });
        });

        it('should have a 10% chance of Slipping on an iceTile', () => {
            setTile({ x: 0, y: 1 }, 20);
            setTile({ x: 0, y: 2 }, 20);
            setTile({ x: 0, y: 3 }, 20);
            setTile({ x: 0, y: 4 }, 20);

            const originalRandom = Math.random;
            Math.random = () => 0.9;
            expect(movementManager.hasSlipped({ x: 0, y: 1 }, false)).to.equal(true);
            expect(movementManager.hasSlipped({ x: 0, y: 2 }, true)).to.equal(true);
            expect(movementManager.hasSlipped({ x: 0, y: 3 }, false)).to.equal(true);
            expect(movementManager.hasSlipped({ x: 0, y: 4 }, false)).to.equal(true);

            Math.random = () => 0.75;
            expect(movementManager.hasSlipped({ x: 0, y: 1 }, false)).to.equal(false);
            expect(movementManager.hasSlipped({ x: 0, y: 2 }, true)).to.equal(false);
            expect(movementManager.hasSlipped({ x: 0, y: 3 }, false)).to.equal(false);
            expect(movementManager.hasSlipped({ x: 0, y: 4 }, false)).to.equal(false);
            Math.random = originalRandom;
        });
    });

    it('should do nothing if current is undefined', () => {
        movementManager['addNeighborsToStack'](undefined);
        expect(sinon.spy(mapManager, 'getAllNeighbors').called).to.equal(false);
    });
});
