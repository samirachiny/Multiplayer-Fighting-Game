/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ActionManager } from '@app/classes/action-manager/action-manager';
import { PartyService } from '@app/services/party/party.service';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { MovementManager } from '@app/classes/movement-manager/movement-manager';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { DoorActionHandler } from '@app/classes/action-handler/door-action-handler/door-action-handler';
import { FightActionHandler } from '@app/classes/action-handler/fight-action-handler/fight-action-handler';
import { MovementActionHandler } from '@app/classes/action-handler/movement-action-handler/movement-action-handler';
import { GiveUpActionHandler } from '@app/classes/action-handler/give-up-action-handler/give-up-action-handler';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { Coordinate } from '@common/interfaces/coordinate';
import { ItemType } from '@common/enums/item';
import { Party } from '@common/interfaces/party';
import { WsEventClient } from '@common/enums/web-socket-event';
import { Container } from 'typedi';
import { Observable } from 'rxjs';
import { LogTypeEvent } from '@common/enums/log-type';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { Game } from '@common/interfaces/game';
import { EndFightEvent } from '@common/types/end-fight-event';

describe('ActionManager', () => {
    let actionManager: ActionManager;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    let turnManagerStub: sinon.SinonStubbedInstance<TurnManager>;
    let movementManagerStub: sinon.SinonStubbedInstance<MovementManager>;
    let mapManagerStub: sinon.SinonStubbedInstance<MapManager>;
    let respawnManagerStub: sinon.SinonStubbedInstance<RespawnManager>;
    let partyEventListenerStub: sinon.SinonStubbedInstance<PartyEventListener>;
    let doorActionHandlerStub: sinon.SinonStubbedInstance<DoorActionHandler>;
    let fightActionHandlerStub: sinon.SinonStubbedInstance<FightActionHandler>;
    let movementActionHandlerStub: sinon.SinonStubbedInstance<MovementActionHandler>;
    let giveUpActionHandlerStub: sinon.SinonStubbedInstance<GiveUpActionHandler>;
    let partyId: string;
    let playerId: string;
    let position: Coordinate;
    let sioStub: any;

    // const mockPartyId = 'party1';
    const mockPlayerId = 'player1';
    const mockPosition: Coordinate = { x: 5, y: 5 };
    const mockPlayer: PlayerInfos = {
        pid: mockPlayerId,
        name: 'Test Player',
        currentPosition: mockPosition,
        startPosition: mockPosition,
        items: [],
        hasFlag: false,
        isVirtualPlayer: false,
    } as PlayerInfos;

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
        id: partyId,
        charactersOccupiedIds: new Map(),
        chatMessages: [],
        game: mockGame,
        isLocked: false,
        accessCode: 0,
        logs: [],
        isDebugMode: false,
    };

    beforeEach(() => {
        sioStub = {
            to: sinon.stub().returnsThis(),
            in: sinon.stub().returnsThis(),
            socketsLeave: sinon.stub().returnsThis(),
            emit: sinon.stub().returnsThis(),
            on: sinon.stub().returnsThis(),
            socketsJoin: sinon.stub().returnsThis(),
        };
        partyServiceStub = sinon.createStubInstance(PartyService);
        turnManagerStub = sinon.createStubInstance(TurnManager);
        movementManagerStub = sinon.createStubInstance(MovementManager);
        mapManagerStub = sinon.createStubInstance(MapManager);
        respawnManagerStub = sinon.createStubInstance(RespawnManager);
        partyEventListenerStub = sinon.createStubInstance(PartyEventListener);
        doorActionHandlerStub = sinon.createStubInstance(DoorActionHandler);
        fightActionHandlerStub = sinon.createStubInstance(FightActionHandler);
        movementActionHandlerStub = sinon.createStubInstance(MovementActionHandler);
        giveUpActionHandlerStub = sinon.createStubInstance(GiveUpActionHandler);
        PartyHelper.init(sioStub);
        Container.set(PartyService, partyServiceStub);
        Container.set(PartyEventListener, partyEventListenerStub);

        partyId = 'test-party-id';
        playerId = 'player1';
        position = { x: 5, y: 5 };

        actionManager = new ActionManager(partyId, turnManagerStub, mapManagerStub, movementManagerStub);
        actionManager['respawnManager'] = respawnManagerStub;
        actionManager['doorAction'] = doorActionHandlerStub;
        actionManager['fightAction'] = fightActionHandlerStub;
        actionManager['moveAction'] = movementActionHandlerStub;
        actionManager['giveUpAction'] = giveUpActionHandlerStub;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('executeAction', () => {
        it('should send ActionFinished if unable to execute action', () => {
            sinon.stub(actionManager as any, 'isUnableToExecuteAction').returns(true);
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');
            actionManager.executeAction(playerId, position);
            expect(sendEventSpy.calledOnceWith(partyId, WsEventClient.ActionFinished)).to.equal(true);
        });

        it('should handle fight action if there is a neighboring enemy', () => {
            partyServiceStub.getParty.returns(mockParty);
            partyServiceStub.getPlayer.returns(mockPlayer);
            movementManagerStub.getAccessiblePositions.returns([
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ]);
            partyServiceStub.getPlayers.returns([mockPlayer]);
            sinon.stub(actionManager as any, 'isUnableToExecuteAction').returns(false);
            sinon.stub(actionManager as any, 'hasNeighborEnemy').returns(true);
            const handleFightActionSpy = sinon.spy(actionManager as any, 'handleFightAction');
            actionManager.executeAction(playerId, position);
            expect(handleFightActionSpy.calledOnceWith(playerId, position)).to.equal(true);
        });

        it('should handle door action if the position is a door', () => {
            partyServiceStub.getParty.returns(mockParty);
            movementManagerStub.getAccessiblePositions.returns([
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ]);
            partyServiceStub.getPlayer.returns(mockPlayer);
            partyServiceStub.getPlayers.returns([mockPlayer]);
            sinon.stub(actionManager as any, 'isUnableToExecuteAction').returns(false);
            sinon.stub(actionManager as any, 'hasNeighborEnemy').returns(false);
            mapManagerStub.isDoor.returns(true);
            const handleDoorActionSpy = sinon.spy(actionManager as any, 'handleDoorAction');
            actionManager.executeAction(playerId, position);
            expect(handleDoorActionSpy.calledOnceWith(playerId, position)).to.equal(true);
        });

        it('should send ActionFinished if no action is executed', () => {
            sinon.stub(actionManager as any, 'isUnableToExecuteAction').returns(false);
            sinon.stub(actionManager as any, 'hasNeighborEnemy').returns(false);
            mapManagerStub.isDoor.returns(false);
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');
            actionManager.executeAction(playerId, position);
            expect(sendEventSpy.calledOnceWith(partyId, WsEventClient.ActionFinished)).to.equal(true);
        });
    });

    describe('handleAttack', () => {
        it('should call fightAction.handleAttack', async () => {
            await actionManager.handleAttack();
            expect(fightActionHandlerStub.handleAttack.calledOnce).to.equal(true);
        });
    });

    describe('handleEscape', () => {
        it('should call fightAction.handleEscape', async () => {
            await actionManager.handleEscape();
            expect(fightActionHandlerStub.handleEscape.calledOnce).to.equal(true);
        });
    });

    describe('handleGiveUpWithFight', () => {
        it('should handle give up during a fight', async () => {
            fightActionHandlerStub.handleGiveUp.resolves();
            const giveUpStub = sinon.stub(actionManager, 'giveUp').returns(true);
            const result = await actionManager.handleGiveUpWithFight(playerId);
            expect(fightActionHandlerStub.handleGiveUp.calledOnceWith(playerId)).to.equal(true);
            expect(giveUpStub.calledOnceWith(playerId)).to.equal(true);
            expect(result).to.equal(true);
        });
    });

    describe('getFightEndEventSignal', () => {
        it('should return the fight end event signal from fightAction', () => {
            const observable = new Observable<EndFightEvent>();
            fightActionHandlerStub.getFightEndEventSignal.returns(observable);
            const result = actionManager.getFightEndEventSignal();
            expect(result).to.equal(observable);
        });
    });

    describe('getFighters', () => {
        it('should return fighters from fightAction', () => {
            const fighters = { attacker: {}, defender: {} } as FightParticipants;
            fightActionHandlerStub.getFighters.returns(fighters);
            const result = actionManager.getFighters();
            expect(result).to.equal(fighters);
        });
    });

    describe('move', () => {
        it('should call moveAction.move and return true', async () => {
            movementActionHandlerStub.move.resolves(true);
            const result = await actionManager.move(playerId, position);
            expect(movementActionHandlerStub.move.calledOnceWith(playerId, position)).to.equal(true);
            expect(result).to.equal(true);
        });

        it('should call moveAction.move and return false', async () => {
            movementActionHandlerStub.move.resolves(false);
            const result = await actionManager.move(playerId, position);
            expect(movementActionHandlerStub.move.calledOnceWith(playerId, position)).to.equal(true);
            expect(result).to.equal(false);
        });
    });

    describe('teleportPlayer', () => {
        it('should call moveAction.teleportPlayer', () => {
            actionManager.teleportPlayer(playerId, position);
            expect(movementActionHandlerStub.teleportPlayer.calledOnceWith(playerId, position)).to.equal(true);
        });
    });

    describe('isTurnOver', () => {
        let player: PlayerInfos;
        position = { x: 1, y: 1 };
        beforeEach(() => {
            player = {
                pid: playerId,
                availableMoves: 1,
                remainingAction: 1,
                currentPosition: position,
                isGiveUp: false,
            } as PlayerInfos;
            partyServiceStub.getPlayers.returns([player]);
            movementManagerStub.getAccessiblePositions.returns([position]);
            partyServiceStub.getParty.returns({ isChoosingItem: false } as Party);
        });

        it('should return false when player has available moves and accessible positions', () => {
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(false);
            movementManagerStub.getAccessiblePositions.returns([position, position]);
            player.availableMoves = 4;
            partyServiceStub.getPlayers.returns([player]);
            const result = actionManager.isTurnOver(playerId);
            expect(result).to.equal(false);
        });

        it('should return true when player has available moves and accessible positions', () => {
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(false);
            movementManagerStub.getAccessiblePositions.returns([position, position]);
            partyServiceStub.getPlayers.returns([player]);
            const result = actionManager.isTurnOver('49');
            expect(result).to.equal(true);
        });

        it('should return false when player has actions left', () => {
            player.availableMoves = 0;
            movementManagerStub.getAccessiblePositions.returns([]);
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(true);
            const result = actionManager.isTurnOver(playerId);
            expect(result).to.equal(false);
        });

        it('should return false when party is choosing item', () => {
            partyServiceStub.getParty.returns({ isChoosingItem: true } as Party);
            player.availableMoves = 0;
            movementManagerStub.getAccessiblePositions.returns([]);
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(false);
            const result = actionManager.isTurnOver(playerId);
            expect(result).to.equal(false);
        });

        it('should return false when party is undefined', () => {
            partyServiceStub.getParty.returns(undefined);
            player.availableMoves = 0;
            movementManagerStub.getAccessiblePositions.returns([]);
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(false);
            const result = actionManager.isTurnOver(playerId);
            expect(result).to.equal(true);
        });

        it('should return true when no moves, no actions, and not choosing item', () => {
            player.availableMoves = 0;
            movementManagerStub.getAccessiblePositions.returns([]);
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(false);
            const result = actionManager.isTurnOver(playerId);
            expect(result).to.equal(true);
        });
    });

    describe('giveUp', () => {
        it('should call giveUpAction.giveUp and return true', () => {
            giveUpActionHandlerStub.giveUp.returns(true);
            const result = actionManager.giveUp(playerId);
            expect(giveUpActionHandlerStub.giveUp.calledOnceWith(playerId)).to.equal(true);
            expect(result).to.equal(true);
        });

        it('should call giveUpAction.giveUp and return false', () => {
            giveUpActionHandlerStub.giveUp.returns(false);
            const result = actionManager.giveUp(playerId);
            expect(giveUpActionHandlerStub.giveUp.calledOnceWith(playerId)).to.equal(true);
            expect(result).to.equal(false);
        });
    });

    describe('getInteractivePositions', () => {
        it('should return interactive positions', () => {
            const player: PlayerInfos = {
                pid: playerId,
                currentPosition: position,
            } as PlayerInfos;
            const neighbors = [
                { x: 5, y: 6 },
                { x: 5, y: 4 },
            ];
            mapManagerStub.getAllNeighbors.returns(neighbors);
            sinon.stub(actionManager as any, 'isInteractive').callsFake((pos: Coordinate) => pos.x === 5 && pos.y === 6);
            const result = actionManager.getInteractivePositions(player);
            expect(result).to.deep.equal([{ x: 5, y: 6 }]);
        });
    });

    describe('removePlayerItem', () => {
        it('should replace item using respawnManager and emit LossTheFlag when item is a flag', () => {
            partyServiceStub.getParty.returns({ isChoosingItem: true } as Party);
            actionManager.removePlayerItem(playerId, ItemType.Flag);
            expect(respawnManagerStub.replaceItem.calledOnceWith(playerId, ItemType.Flag)).to.equal(true);
            expect(partyServiceStub.getParty(partyId).isChoosingItem).to.equal(false);
            expect(turnManagerStub.resumeTurnTimer.calledOnce).to.equal(true);
            expect(partyEventListenerStub.emit.calledOnceWith(LogTypeEvent.LossTheFlag, sinon.match.any)).to.equal(true);
        });

        it('should replace item using respawnManager when item is not a flag', () => {
            partyServiceStub.getParty.returns({ isChoosingItem: true } as Party);
            actionManager.removePlayerItem(playerId, ItemType.BoostAttack);
            expect(respawnManagerStub.replaceItem.calledOnceWith(playerId, ItemType.BoostAttack)).to.equal(true);
            expect(partyServiceStub.getParty(partyId).isChoosingItem).to.equal(false);
            expect(turnManagerStub.resumeTurnTimer.calledOnce).to.equal(true);
            expect(partyEventListenerStub.emit.notCalled).to.equal(true);
        });
    });

    describe('isUnableToExecuteAction', () => {
        let mockPlayer_: PlayerInfos;

        beforeEach(() => {
            mockPlayer_ = {
                pid: playerId,
                name: 'Test Player',
                currentPosition: { x: 5, y: 5 },
                startPosition: { x: 5, y: 5 },
                items: [],
                hasFlag: false,
                isVirtualPlayer: false,
                remainingAction: 1,
                availableMoves: 1,
            } as PlayerInfos;

            partyServiceStub.getPlayer.returns(mockPlayer_);
            partyServiceStub.getPlayers.returns([mockPlayer_]);
        });

        it('should return true if the player has no actions left', () => {
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(false);
            mapManagerStub.getAllNeighbors.returns([
                { x: 1, y: 1 },
                { x: 1, y: 2 },
                { x: 2, y: 1 },
            ]);
            const result = (actionManager as any).isUnableToExecuteAction(playerId, { x: 5, y: 5 });
            expect(result).to.equal(true);
        });

        it("should return true if the position is the same as the player's current position", () => {
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(true);
            sinon.stub(actionManager as any, 'getInteractivePositions').returns([{ x: 6, y: 6 }]);
            const result = (actionManager as any).isUnableToExecuteAction(playerId, { x: 5, y: 5 });
            expect(result).to.equal(true);
        });

        it('should return true if the position is not in the list of interactive positions', () => {
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(true);
            sinon.stub(actionManager as any, 'getInteractivePositions').returns([{ x: 6, y: 6 }]);
            const result = (actionManager as any).isUnableToExecuteAction(playerId, { x: 7, y: 7 });
            expect(result).to.equal(true);
        });

        it('should return false if the player has actions left and the position is interactive', () => {
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(true);
            sinon.stub(actionManager as any, 'getInteractivePositions').returns([{ x: 6, y: 6 }]);
            const result = (actionManager as any).isUnableToExecuteAction(playerId, { x: 6, y: 6 });
            expect(result).to.equal(false);
        });

        it('should correctly handle edge cases with undefined player data', () => {
            partyServiceStub.getPlayer.returns(undefined);
            const result = (actionManager as any).isUnableToExecuteAction(playerId, { x: 5, y: 5 });
            expect(result).to.equal(true);
        });

        it('should return true if interactive positions are empty', () => {
            sinon.stub(actionManager as any, 'hasActionsLeft').returns(true);
            sinon.stub(actionManager as any, 'getInteractivePositions').returns([]);
            const result = (actionManager as any).isUnableToExecuteAction(playerId, { x: 5, y: 5 });
            expect(result).to.equal(true);
        });
    });

    describe('isAnyNeighborInteractive', () => {
        let mockPlayer_: PlayerInfos;

        beforeEach(() => {
            mockPlayer_ = {
                pid: playerId,
                name: 'Test Player',
                currentPosition: { x: 5, y: 5 },
                startPosition: { x: 5, y: 5 },
                items: [],
                hasFlag: false,
                isVirtualPlayer: false,
                remainingAction: 1,
                availableMoves: 1,
            } as PlayerInfos;
        });

        it('should return true if at least one neighbor has an enemy', () => {
            mapManagerStub.getAllNeighbors.returns([
                { x: 4, y: 5 },
                { x: 5, y: 4 },
            ]);
            sinon.stub(actionManager as any, 'hasNeighborEnemy').callsFake((pos: any) => pos.x === 4 && pos.y === 5);
            mapManagerStub.isDoor.returns(false);
            const result = (actionManager as any).isAnyNeighborInteractive(mockPlayer_);
            expect(result).to.equal(true);
        });

        it('should return true if at least one neighbor is a door', () => {
            mapManagerStub.getAllNeighbors.returns([
                { x: 4, y: 5 },
                { x: 5, y: 4 },
            ]);
            sinon.stub(actionManager as any, 'hasNeighborEnemy').returns(false);
            mapManagerStub.isDoor.callsFake((pos) => pos.x === 5 && pos.y === 4);
            const result = (actionManager as any).isAnyNeighborInteractive(mockPlayer_);
            expect(result).to.equal(true);
        });

        it('should return false if no neighbor has an enemy and no neighbor is a door', () => {
            mapManagerStub.getAllNeighbors.returns([
                { x: 4, y: 5 },
                { x: 5, y: 4 },
            ]);
            sinon.stub(actionManager as any, 'hasNeighborEnemy').returns(false);
            mapManagerStub.isDoor.returns(false);
            const result = (actionManager as any).isAnyNeighborInteractive(mockPlayer_);
            expect(result).to.equal(false);
        });

        it('should return false if there are no neighbors', () => {
            mapManagerStub.getAllNeighbors.returns([]);
            const result = (actionManager as any).isAnyNeighborInteractive(mockPlayer_);
            expect(result).to.equal(false);
        });

        it('should call both hasNeighborEnemy and isDoor for each neighbor', () => {
            const neighbors = [
                { x: 4, y: 5 },
                { x: 5, y: 4 },
            ];
            mapManagerStub.getAllNeighbors.returns(neighbors);
            const hasNeighborEnemyStub = sinon.stub(actionManager as any, 'hasNeighborEnemy').returns(false);
            mapManagerStub.isDoor.returns(false);
            (actionManager as any).isAnyNeighborInteractive(mockPlayer);
            expect(hasNeighborEnemyStub.callCount).to.equal(neighbors.length);
            expect(mapManagerStub.isDoor.callCount).to.equal(neighbors.length);
        });

        it('should correctly handle edge cases where getAllNeighbors returns undefined', () => {
            mapManagerStub.getAllNeighbors.returns(undefined);
            const result = (actionManager as any).isAnyNeighborInteractive(mockPlayer);
            expect(result).to.equal(false);
        });
    });

    describe('hasActionsLeft', () => {
        it('should return true if player has remainingAction > 0 and a neighbor is interactive', () => {
            const mockPlayer_: PlayerInfos = {
                pid: playerId,
                name: 'Test Player',
                currentPosition: { x: 5, y: 5 },
                remainingAction: 1,
            } as PlayerInfos;

            partyServiceStub.getPlayer.returns(mockPlayer_);
            sinon.stub(actionManager as any, 'isAnyNeighborInteractive').returns(true);
            const result = (actionManager as any).hasActionsLeft(playerId);
            expect(result).to.equal(true);
        });

        it('should return false if player has remainingAction = 0', () => {
            const mockPlayer_: PlayerInfos = {
                pid: playerId,
                name: 'Test Player',
                currentPosition: { x: 5, y: 5 },
                remainingAction: 0,
            } as PlayerInfos;

            partyServiceStub.getPlayer.returns(mockPlayer_);
            sinon.stub(actionManager as any, 'isAnyNeighborInteractive').returns(true);
            const result = (actionManager as any).hasActionsLeft(playerId);
            expect(result).to.equal(false);
        });

        it('should return false if player is undefined', () => {
            const mockPlayer_: PlayerInfos = undefined;
            partyServiceStub.getPlayer.returns(mockPlayer_);
            sinon.stub(actionManager as any, 'isAnyNeighborInteractive').returns(true);
            const result = (actionManager as any).hasActionsLeft(playerId);
            expect(result).to.equal(false);
        });

        it('should return false if no neighbors are interactive', () => {
            const mockPlayer_: PlayerInfos = {
                pid: playerId,
                name: 'Test Player',
                currentPosition: { x: 5, y: 5 },
                remainingAction: 1,
            } as PlayerInfos;

            partyServiceStub.getPlayer.returns(mockPlayer_);
            sinon.stub(actionManager as any, 'isAnyNeighborInteractive').returns(false);
            const result = (actionManager as any).hasActionsLeft(playerId);
            expect(result).to.equal(false);
        });
    });

    describe('hasNeighborEnemy', () => {
        it('should return true if a neighboring position has an enemy player', () => {
            const mockPlayers: PlayerInfos[] = [
                {
                    pid: 'enemy1',
                    name: 'Enemy Player',
                    currentPosition: { x: 6, y: 5 },
                    isGiveUp: false,
                } as PlayerInfos,
            ];

            partyServiceStub.getPlayers.returns(mockPlayers);
            const result = (actionManager as any).hasNeighborEnemy({ x: 5, y: 6 });
            expect(result).to.equal(true);
        });

        it('should return false if a neighboring position has no enemy player', () => {
            const mockPlayers: PlayerInfos[] = [
                {
                    pid: 'enemy1',
                    name: 'Enemy Player',
                    currentPosition: { x: 4, y: 4 },
                    isGiveUp: false,
                } as PlayerInfos,
            ];

            partyServiceStub.getPlayers.returns(mockPlayers);
            const result = (actionManager as any).hasNeighborEnemy({ x: 5, y: 6 });
            expect(result).to.equal(false);
        });

        it('should return false if the enemy player has given up', () => {
            const mockPlayers: PlayerInfos[] = [
                {
                    pid: 'enemy1',
                    name: 'Enemy Player',
                    currentPosition: { x: 5, y: 6 },
                    isGiveUp: true,
                } as PlayerInfos,
            ];

            partyServiceStub.getPlayers.returns(mockPlayers);
            const result = (actionManager as any).hasNeighborEnemy({ x: 5, y: 6 });
            expect(result).to.equal(false);
        });

        it('should handle an empty list of players gracefully', () => {
            partyServiceStub.getPlayers.returns([]);
            const result = (actionManager as any).hasNeighborEnemy({ x: 5, y: 6 });
            expect(result).to.equal(false);
        });

        it('should handle undefined player positions gracefully', () => {
            const mockPlayers: PlayerInfos[] = [
                {
                    pid: 'enemy1',
                    name: 'Enemy Player',
                    currentPosition: undefined,
                    isGiveUp: false,
                } as PlayerInfos,
            ];

            partyServiceStub.getPlayers.returns(mockPlayers);
            const result = (actionManager as any).hasNeighborEnemy({ x: 5, y: 6 });
            expect(result).to.equal(false);
        });
    });

    describe('destroy', () => {
        it('should call resetAll on combatManager', () => {
            actionManager.destroy();
            expect(fightActionHandlerStub.destroy.calledOnce).to.equal(true);
        });
    });
});
