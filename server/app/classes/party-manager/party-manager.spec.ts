/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable max-lines */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { ItemType } from '@common/enums/item';
import * as partyManagerModule from '@app/classes/party-manager/party-manager';
import { PartyService } from '@app/services/party/party.service';
import { ItemService } from '@app/services/item/item.service';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { ActionManager } from '@app/classes/action-manager/action-manager';
import { MovementManager } from '@app/classes/movement-manager/movement-manager';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { of, Subscription } from 'rxjs';
import { EventEmitter } from 'events';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { Fighter, PlayerInfos } from '@common/interfaces/player-infos';
import { Party } from '@common/interfaces/party';
import { Coordinate } from '@common/interfaces/coordinate';
import { WsEventClient } from '@common/enums/web-socket-event';
import { VirtualPlayerManager } from '@app/classes/virtual-player/virtual-player';
import { DiceAssignment } from '@common/interfaces/dice-assignment';
import { Character } from '@common/interfaces/character';
import { Game } from '@common/interfaces/game';
import { LogTypeEvent } from '@common/enums/log-type';
import { SendingOptions } from '@common/enums/sending-options';
import { Container } from 'typedi';
import { VirtualPlayerEvent } from '@common/enums/virtual-player-event';
import { VICTORIES_REQUIRED_TO_WIN } from '@app/utils/const';

describe('PartyManager', () => {
    let partyManager: partyManagerModule.PartyManager;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    let itemServiceStub: sinon.SinonStubbedInstance<ItemService>;
    let partyEventListernerStub: sinon.SinonStubbedInstance<PartyEventListener>;
    let sioStub: any;
    let turnManagerStub: sinon.SinonStubbedInstance<TurnManager>;
    let actionManagerStub: sinon.SinonStubbedInstance<ActionManager>;
    let movementManagerStub: sinon.SinonStubbedInstance<MovementManager>;
    let virtualManagerStub: sinon.SinonStubbedInstance<VirtualPlayerManager>;
    let partyId: string;
    let party: Party;
    let playerId: string;
    let player: PlayerInfos;
    let players: Map<string, PlayerInfos>;

    beforeEach(() => {
        partyServiceStub = sinon.createStubInstance(PartyService);
        itemServiceStub = sinon.createStubInstance(ItemService);
        partyEventListernerStub = sinon.createStubInstance(PartyEventListener);
        sioStub = {
            to: sinon.stub().returnsThis(),
            in: sinon.stub().returnsThis(),
            socketsLeave: sinon.stub().returnsThis(),
            emit: sinon.stub().returnsThis(),
            on: sinon.stub().returnsThis(),
            socketsJoin: sinon.stub().returnsThis(),
        };
        turnManagerStub = sinon.createStubInstance(TurnManager);
        (turnManagerStub as any).isVirtualPlayer$ = of(playerId);
        actionManagerStub = sinon.createStubInstance(ActionManager);
        actionManagerStub.getFightEndEventSignal.returns(of({ winnerId: playerId, sendEndFightToBot: false }));
        movementManagerStub = sinon.createStubInstance(MovementManager);
        virtualManagerStub = sinon.createStubInstance(VirtualPlayerManager);
        partyId = 'test-party-id';
        playerId = 'test-player-id';
        player = {
            pid: playerId,
            name: 'Test Player',
            character: {} as Character,
            isOrganizer: false,
            isGiveUp: false,
            isCurrentPlayer: false,
            speed: 0,
            attack: 0,
            defense: 0,
            life: 0,
            wins: 0,
            availableMoves: 0,
            remainingAction: 0,
            diceAssignment: {} as DiceAssignment,
            startPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            previousPosition: null,
            items: [],
        };
        players = new Map();
        players.set(playerId, player);
        const defaultItem = 0;
        const mapSize = 10;
        const gameMap = Array.from({ length: mapSize }, () => Array.from({ length: mapSize }, () => defaultItem));
        gameMap[0][1] = ItemType.StartingPoint;
        gameMap[1][2] = ItemType.StartingPoint;
        gameMap[2][0] = ItemType.StartingPoint;

        party = {
            id: partyId,
            charactersOccupiedIds: new Map(),
            chatMessages: [],
            game: {
                mapSize,
                gameMap,
            } as Game,
            isLocked: false,
            accessCode: 1234,
            logs: [],
            isDebugMode: false,
        };
        Container.set(PartyService, partyServiceStub);
        Container.set(PartyEventListener, partyEventListernerStub);
        Container.set(ItemService, itemServiceStub);
        partyServiceStub.getParty.withArgs(partyId).returns(party);
        partyServiceStub.getPlayer.withArgs(partyId, playerId).returns(player);
        partyServiceStub.getOrderPlayers.withArgs(partyId).returns([player]);
        partyServiceStub.getMap.withArgs(partyId).returns(party.game.gameMap);
        PartyHelper.init(sioStub);
        partyManager = new partyManagerModule.PartyManager(partyId);
        partyManager['turnManager'] = turnManagerStub;
        partyManager['actionManager'] = actionManagerStub;
        partyManager['movementManager'] = movementManagerStub;
        partyManager['virtualPlayerManager'] = virtualManagerStub;
        partyManager['eventVirtualPlayer'] = new EventEmitter();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should initialize properties correctly', () => {
        expect(partyManager['partyId']).to.equal(partyId);
        expect(partyManager['partyService']).to.equal(partyServiceStub);
        expect(partyManager['itemService']).to.equal(itemServiceStub);
        expect(partyManager['partyListener']).to.equal(partyEventListernerStub);
        expect(partyManager['turnManager']).to.equal(turnManagerStub);
        expect(partyManager['actionManager']).to.equal(actionManagerStub);
        expect(partyManager['movementManager']).to.equal(movementManagerStub);
        expect(partyManager['mapManager']).to.be.instanceOf(MapManager);
        expect(partyManager['virtualPlayerManager']).to.be.instanceOf(VirtualPlayerManager);
        expect(partyManager['subscriptions']).to.be.instanceOf(Subscription);
        expect(partyManager['eventVirtualPlayer']).to.be.instanceOf(EventEmitter);
    });

    describe('destroy', () => {
        it('should call destroyTurnCycle on turnManager', () => {
            partyManager.destroy();
            expect(turnManagerStub.destroyTurnCycle.calledOnce).to.equal(true);
        });

        it('should call destroy on virtualManager', () => {
            partyManager.destroy();
            expect(virtualManagerStub.destroy.called).to.equal(true);
        });
    });

    describe('listenVirtualPlayerEventAndProcess', () => {
        beforeEach(() => {
            partyManager.listenVirtualPlayerEventAndProcess();
        });

        it('should handle StartMoving event correctly', async () => {
            const data = { playerId, pos: { x: 1, y: 1 } };
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns({ ...player, isCurrentPlayer: true });
            actionManagerStub.isTurnOver.withArgs(playerId).returns(false);
            const movePlayerStub = sinon.stub(partyManager, 'movePlayer').resolves();
            const endRoundStub = sinon.stub(partyManager, 'endRound');
            partyManager['eventVirtualPlayer'].emit(VirtualPlayerEvent.StartMoving, data);
            await new Promise(process.nextTick);
            expect(movePlayerStub.calledOnceWith(data.playerId, data.pos)).to.be.true;
            expect(endRoundStub.called).to.be.false;
        });

        it('should handle StartMoving event correctly and end turn if isTurnOver', async () => {
            const data = { playerId, pos: { x: 1, y: 1 } };
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns({ ...player, isCurrentPlayer: true });
            actionManagerStub.isTurnOver.withArgs(playerId).returns(true);
            const movePlayerStub = sinon.stub(partyManager, 'movePlayer').resolves();
            const endRoundStub = sinon.stub(partyManager, 'endRound');
            partyManager['eventVirtualPlayer'].emit(VirtualPlayerEvent.StartMoving, data);
            await new Promise(process.nextTick);
            expect(movePlayerStub.calledOnceWith(data.playerId, data.pos)).to.be.true;
            expect(endRoundStub.called).to.be.true;
        });

        it('should not handle StartMoving event if player is not current player', async () => {
            const data = { playerId, pos: { x: 1, y: 1 } };
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns({ ...player, isCurrentPlayer: false });
            actionManagerStub.isTurnOver.withArgs(playerId).returns(false);
            const movePlayerStub = sinon.stub(partyManager, 'movePlayer').resolves();
            const endRoundStub = sinon.stub(partyManager, 'endRound');
            partyManager['eventVirtualPlayer'].emit(VirtualPlayerEvent.StartMoving, data);
            expect(movePlayerStub.called).to.be.false;
            expect(endRoundStub.called).to.be.false;
        });
        it('should handle StartFight event correctly', () => {
            const data = { playerId, pos: { x: 1, y: 1 } };
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns({ ...player, isCurrentPlayer: true });
            const executeActionStub = sinon.stub(partyManager, 'executeAction');
            partyManager['eventVirtualPlayer'].emit(VirtualPlayerEvent.StartFight, data);
            expect(executeActionStub.calledOnceWith(data.playerId, data.pos)).to.be.true;
        });
        it('should not handle StartFight event if player is not current player', () => {
            const data = { playerId, pos: { x: 1, y: 1 } };
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns({ ...player, isCurrentPlayer: false });
            const executeActionStub = sinon.stub(partyManager, 'executeAction');
            partyManager['eventVirtualPlayer'].emit(VirtualPlayerEvent.StartFight, data);
            expect(executeActionStub.called).to.be.false;
        });
        it('should handle OpenDoor event correctly', () => {
            const data = { playerId, pos: { x: 1, y: 1 } };
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns({ ...player, isCurrentPlayer: true });
            actionManagerStub.isTurnOver.withArgs(playerId).returns(false);
            const executeActionStub = sinon.stub(partyManager, 'executeAction');
            const endRoundStub = sinon.stub(partyManager, 'endRound');
            partyManager['eventVirtualPlayer'].emit(VirtualPlayerEvent.OpenDoor, data);
            expect(executeActionStub.calledOnceWith(data.playerId, data.pos)).to.be.true;
            expect(endRoundStub.called).to.be.false;
        });

        it('should handle OpenDoor event correctly and end round if isTurnOver', () => {
            const data = { playerId, pos: { x: 1, y: 1 } };
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns({ ...player, isCurrentPlayer: true });
            actionManagerStub.isTurnOver.withArgs(playerId).returns(true);
            const executeActionStub = sinon.stub(partyManager, 'executeAction');
            const endRoundStub = sinon.stub(partyManager, 'endRound');
            partyManager['eventVirtualPlayer'].emit(VirtualPlayerEvent.OpenDoor, data);
            expect(executeActionStub.calledOnceWith(data.playerId, data.pos)).to.be.true;
            expect(endRoundStub.called).to.be.true;
        });

        it('should not handle OpenDoor event if player is not current player', () => {
            const data = { playerId, pos: { x: 1, y: 1 } };
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns({ ...player, isCurrentPlayer: false });
            const executeActionStub = sinon.stub(partyManager, 'executeAction');
            const endRoundStub = sinon.stub(partyManager, 'endRound');
            partyManager['eventVirtualPlayer'].emit(VirtualPlayerEvent.OpenDoor, data);
            expect(executeActionStub.called).to.be.false;
            expect(endRoundStub.called).to.be.false;
        });
        it('should handle EndRound event correctly', () => {
            const endRoundStub = sinon.stub(partyManager, 'endRound');
            partyManager['eventVirtualPlayer'].emit(VirtualPlayerEvent.EndRound, playerId);
            expect(endRoundStub.calledOnceWith(playerId)).to.be.true;
        });
    });

    describe('startGame', () => {
        it('should start the game correctly', () => {
            const startPositions: Coordinate[] = [
                { x: 0, y: 1 },
                { x: 1, y: 2 },
            ];
            partyServiceStub.getStartPositions.returns(startPositions);
            partyServiceStub.getPlayers.withArgs(partyId).returns([player]);
            const assignPlayersStartPositionSpy = sinon.spy(partyManager as any, 'assignPlayersStartPosition');
            (partyManager as any).actionManager = actionManagerStub;
            partyManager.startGame();

            expect(partyServiceStub.setLock.calledWith(partyId, true)).to.equal(true);
            expect(assignPlayersStartPositionSpy.calledOnce).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.PartyStart)).to.equal(true);
            expect(turnManagerStub.initializeTurnCycle.calledOnce).to.equal(true);
        });

        it('should start the game correctly', () => {
            actionManagerStub.getFightEndEventSignal.returns(of({ winnerId: playerId, sendEndFightToBot: true }));
            const startPositions: Coordinate[] = [
                { x: 0, y: 1 },
                { x: 1, y: 2 },
            ];
            partyServiceStub.getStartPositions.returns(startPositions);
            partyServiceStub.getPlayers.withArgs(partyId).returns([player]);
            const assignPlayersStartPositionSpy = sinon.spy(partyManager as any, 'assignPlayersStartPosition');
            (partyManager as any).actionManager = actionManagerStub;
            partyManager.startGame();

            expect(partyServiceStub.setLock.calledWith(partyId, true)).to.equal(true);
            expect(assignPlayersStartPositionSpy.calledOnce).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.PartyStart)).to.equal(true);
            expect(turnManagerStub.initializeTurnCycle.calledOnce).to.equal(true);
        });
    });

    describe('getFighters', () => {
        it('should return fighters from actionManager', () => {
            const fighters: any = {
                attacker: { pid: 'attacker-id', name: 'Attacker' } as Fighter,
                defender: { pid: 'defender-id', name: 'Defender' } as Fighter,
            };
            actionManagerStub.getFighters.returns(fighters);

            const result = partyManager.getFighters();

            expect(result).to.equal(fighters);
            expect(actionManagerStub.getFighters.calledOnce).to.equal(true);
        });
    });

    describe('getPartyInfos', () => {
        it('should set party information when party exists', () => {
            const setPartyInfosStub = sinon.stub();
            partyServiceStub.getParty.withArgs(partyId).returns(party);

            partyManager.getPartyInfos(setPartyInfosStub);

            expect(setPartyInfosStub.calledOnce).to.equal(true);
            expect(
                setPartyInfosStub.calledWith({
                    game: party.game,
                    players: [player],
                }),
            ).to.equal(true);
        });

        it('should not set party information when party does not exist', () => {
            const setPartyInfosStub = sinon.stub();
            partyServiceStub.getParty.withArgs(partyId).returns(undefined);

            partyManager.getPartyInfos(setPartyInfosStub);

            expect(setPartyInfosStub.notCalled).to.equal(true);
        });
    });

    describe('getAccessiblePositions', () => {
        it('should return accessible positions from movementManager', () => {
            const positions: Coordinate[] = [{ x: 1, y: 1 }];
            movementManagerStub.getAccessiblePositions.withArgs(playerId).returns(positions);
            const result = partyManager.getAccessiblePositions(playerId);
            expect(result).to.equal(positions);
            expect(movementManagerStub.getAccessiblePositions.calledWith(playerId)).to.equal(true);
        });
    });

    describe('getInteractivePositions', () => {
        it('should return interactivePositions positions from actionManager', () => {
            const positions: Coordinate[] = [{ x: 1, y: 1 }];
            actionManagerStub.getInteractivePositions.withArgs(player).returns(positions);
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns(player);
            const result = partyManager.getInteractivePositions(playerId);
            expect(result).to.equal(positions);
            expect(actionManagerStub.getInteractivePositions.calledWith(player)).to.equal(true);
        });

        it("should return empty array if player don't exist", () => {
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns(undefined);
            partyManager.getInteractivePositions(playerId);
            expect(actionManagerStub.getInteractivePositions.called).to.equal(false);
        });
    });

    describe('getPath', () => {
        it('should return path from movementManager', () => {
            const endPosition: Coordinate = { x: 2, y: 2 };
            const path: Coordinate[] = [{ x: 1, y: 1 }, endPosition];
            movementManagerStub.getPlayerPathTo.withArgs(player, endPosition).returns(path);

            const result = partyManager.getPath(playerId, endPosition);

            expect(result).to.equal(path);
            expect(movementManagerStub.getPlayerPathTo.calledWith(player, endPosition)).to.equal(true);
        });
    });

    describe('executeAction', () => {
        it('should call actionManager executeAction', () => {
            const pos: Coordinate = { x: 3, y: 3 };
            partyManager.executeAction(playerId, pos);
            expect(actionManagerStub.executeAction.calledWith(playerId, pos)).to.equal(true);
        });
    });

    describe('movePlayer', () => {
        it('should call handle end if party flag and ', async () => {
            sinon.stub(partyManager as any, 'isPartyModeCTF').returns(true);
            sinon.stub(partyManager as any, 'checkIfGameWonBy').returns(false);
            const finalPosition: Coordinate = { x: 4, y: 4 };
            const handleGameEndSpy = sinon.spy(partyManager as any, 'handleGameEnd');
            await partyManager.movePlayer(playerId, finalPosition);
            expect(handleGameEndSpy.calledWith(playerId)).to.equal(true);
        });

        it('should handle move when current player and move is finished', async () => {
            const finalPosition: Coordinate = { x: 4, y: 4 };
            actionManagerStub.move.resolves(true);
            actionManagerStub.isTurnOver.withArgs(playerId).returns(true);
            turnManagerStub.isCurrentPlayer.withArgs(playerId).returns(true);
            const endRoundSpy = sinon.spy(partyManager, 'endRound');

            await partyManager.movePlayer(playerId, finalPosition);

            expect(actionManagerStub.move.calledWith(playerId, finalPosition)).to.equal(true);
            expect(turnManagerStub.isCurrentPlayer.calledWith(playerId)).to.equal(true);
            expect(actionManagerStub.isTurnOver.calledWith(playerId)).to.equal(true);
            expect(endRoundSpy.calledWith(playerId)).to.equal(true);
        });

        it('should handle move when current player and move is not finished', async () => {
            const finalPosition: Coordinate = { x: 4, y: 4 };
            actionManagerStub.move.resolves(false);
            turnManagerStub.isCurrentPlayer.withArgs(playerId).returns(true);
            actionManagerStub.isTurnOver.withArgs(playerId).returns(false);
            const endRoundSpy = sinon.spy(partyManager, 'endRound');

            await partyManager.movePlayer(playerId, finalPosition);

            expect(actionManagerStub.move.calledWith(playerId, finalPosition)).to.equal(true);
            expect(turnManagerStub.isCurrentPlayer.calledWith(playerId)).to.equal(true);
            expect(endRoundSpy.calledWith(playerId)).to.equal(true); // Adjusted expectation
        });

        it('should reset player attributes when not current player', async () => {
            const finalPosition: Coordinate = { x: 4, y: 4 };
            actionManagerStub.move.resolves(true);
            turnManagerStub.isCurrentPlayer.withArgs(playerId).returns(false);

            await partyManager.movePlayer(playerId, finalPosition);

            expect(actionManagerStub.move.calledWith(playerId, finalPosition)).to.equal(true);
            expect(turnManagerStub.isCurrentPlayer.calledWith(playerId)).to.equal(true);
            expect(partyServiceStub.resetAttributePlayer.calledWith(partyId, playerId)).to.equal(true);
            expect(sioStub.to.calledWith(playerId)).to.equal(true);
            expect(sioStub.to(playerId).emit.calledWith(WsEventClient.AvailableMoveUpdated)).to.equal(true);
        });
    });

    describe('removePlayerItem', () => {
        it('should call actionManager.removePlayerItem and endRound if turn is over', () => {
            const item: ItemType = ItemType.Flag;
            const endRoundStub = sinon.stub(partyManager, 'endRound');
            actionManagerStub.isTurnOver.withArgs(playerId).returns(true);
            partyManager.removePlayerItem(playerId, item);
            expect(actionManagerStub.removePlayerItem.calledOnceWith(playerId, item)).to.be.true;
            expect(actionManagerStub.isTurnOver.calledOnceWith(playerId)).to.be.true;
            expect(endRoundStub.calledOnceWith(playerId)).to.be.true;
        });
        it('should call actionManager.removePlayerItem and not endRound if turn is not over', () => {
            const item: ItemType = ItemType.BoostAttack;
            const endRoundStub = sinon.stub(partyManager, 'endRound');
            actionManagerStub.isTurnOver.withArgs(playerId).returns(false);
            partyManager.removePlayerItem(playerId, item);
            expect(actionManagerStub.removePlayerItem.calledOnceWith(playerId, item)).to.be.true;
            expect(actionManagerStub.isTurnOver.calledOnceWith(playerId)).to.be.true;
            expect(endRoundStub.called).to.be.false;
        });
    });
    describe('checkIfGameWonBy', () => {
        it('should return true if player has required victories to win party', () => {
            player.wins = VICTORIES_REQUIRED_TO_WIN;
            const result = partyManager['checkIfGameWonBy'](playerId);
            expect(result).to.be.true;
        });
        it('should return true if player has flag and is at start position', () => {
            player.hasFlag = true;
            player.currentPosition = player.startPosition;
            const result = partyManager['checkIfGameWonBy'](playerId);
            expect(result).to.be.true;
        });
        it('should return false if player does not have required victories or flag at start position', () => {
            player.wins = VICTORIES_REQUIRED_TO_WIN - 1;
            player.hasFlag = false;
            const result = partyManager['checkIfGameWonBy'](playerId);
            expect(result).to.be.false;
        });
        it('should return false if player has flag but is not at start position', () => {
            player.hasFlag = true;
            player.currentPosition = { x: 1, y: 1 } as Coordinate;
            const result = partyManager['checkIfGameWonBy'](playerId);
            expect(result).to.be.false;
        });
    });

    describe('handleGameEnd', () => {
        it('should call handleGameWin and destroy if game is won by player', () => {
            const handleGameWinStub = sinon.stub(partyManager as any, 'handleGameWin');
            const destroyStub = sinon.stub(partyManager, 'destroy');
            sinon.stub(partyManager as any, 'checkIfGameWonBy').returns(true);
            partyManager['handleGameEnd'](playerId);
            expect((partyManager as any).checkIfGameWonBy.calledOnceWith(playerId)).to.be.true;
            expect(handleGameWinStub.calledOnceWith(playerId)).to.be.true;
            expect(destroyStub.calledOnce).to.be.true;
        });
        it('should not call handleGameWin and destroy if game is not won by player', () => {
            const handleGameWinStub = sinon.stub(partyManager as any, 'handleGameWin');
            const destroyStub = sinon.stub(partyManager, 'destroy');
            sinon.stub(partyManager as any, 'checkIfGameWonBy').returns(false);
            partyManager['handleGameEnd'](playerId);
            expect((partyManager as any).checkIfGameWonBy.calledOnceWith(playerId)).to.be.true;
            expect(handleGameWinStub.called).to.be.false;
            expect(destroyStub.called).to.be.false;
        });
    });
    describe('handleGameWin', () => {
        it('should emit EndGame event and send GameEnd event', () => {
            const player1122 = {
                pid: playerId,
                name: 'Test Player',
                character: {} as Character,
                isOrganizer: false,
                isGiveUp: false,
                isCurrentPlayer: false,
                speed: 0,
                attack: 0,
                defense: 0,
                life: 0,
                wins: 0,
                availableMoves: 0,
                remainingAction: 0,
                diceAssignment: {} as DiceAssignment,
                startPosition: null,
                currentPosition: null,
                previousPosition: null,
                items: [],
            } as any as PlayerInfos;
            partyServiceStub.getPlayer.withArgs(partyId, playerId).returns(player1122);
            const sendEventStub = sinon.stub(PartyHelper, 'sendEvent');
            partyManager['handleGameWin'](playerId);
            expect(partyServiceStub.getPlayer.calledOnceWith(partyId, playerId)).to.equal(true);
            expect(
                partyEventListernerStub.emit.calledWith(LogTypeEvent.EndGame, {
                    partyId,
                    logParameters: { event: LogTypeEvent.EndGame, playerIds: [playerId] },
                    options: SendingOptions.Broadcast,
                    winner: player1122.name,
                }),
            ).to.equal(true);
            expect(sendEventStub.calledOnceWith(partyId, WsEventClient.GameEnd, player1122)).to.equal(true);
        });
    });

    describe('giveUp', () => {
        it('should call actionManager.giveUp with the correct playerId', () => {
            const playerId_ = 'test-player-id';
            partyManager.giveUp(playerId_);
            expect(actionManagerStub.giveUp.calledOnceWithExactly(playerId_)).to.equal(true);
        });
    });

    describe('endRound', () => {
        it('should end round and reset player attributes', () => {
            partyManager.endRound(playerId);
            expect(turnManagerStub.endRound.calledOnce).to.equal(true);
        });
    });

    describe('toggleDebugMode', () => {
        it('should do nothing if party not exist', () => {
            partyServiceStub.getParty.withArgs(partyId).returns(null);
            partyManager.toggleDebugMode('playerId');
            expect(partyServiceStub.togglePartyMode.called).to.equal(false);
        });

        it('should do nothing if player not organizer', () => {
            partyServiceStub.getPlayer.withArgs(partyId, 'playerId').returns({ isOrganizer: false } as PlayerInfos);
            partyManager.toggleDebugMode('playerId');
            expect(partyServiceStub.togglePartyMode.called).to.equal(false);
        });

        it('should do nothing if player not exist', () => {
            partyServiceStub.getPlayer.withArgs(partyId, 'playerId').returns(null as PlayerInfos);
            partyManager.toggleDebugMode('playerId');
            expect(partyServiceStub.togglePartyMode.called).to.equal(false);
        });

        it('should call partyService togglePartyMode if party exist and is organizer', () => {
            partyServiceStub.getParty.returns({ isDebugMode: false } as Party);
            partyServiceStub.getPlayer.withArgs(partyId, 'playerId').returns({ isOrganizer: true } as PlayerInfos);
            partyManager.toggleDebugMode('playerId');
            expect(partyServiceStub.togglePartyMode.calledWith(partyId));
            expect(sioStub.emit.called).to.equal(true);
        });

        it('should updateLogs correctly if toogle party mode', () => {
            partyServiceStub.getParty.returns({ isDebugMode: true } as Party);
            partyServiceStub.getPlayer.withArgs(partyId, 'playerId').returns({ isOrganizer: true } as PlayerInfos);
            partyServiceStub.isDebugMode.returns(true);
            partyManager.toggleDebugMode('playerId');
            expect(
                partyEventListernerStub.emit.calledWith(LogTypeEvent.DebugOn, {
                    partyId,
                    logParameters: { event: LogTypeEvent.DebugOn, playerIds: [playerId] },
                    options: SendingOptions.Broadcast,
                }),
            );
        });
    });

    describe('handleAttack', () => {
        it('should callactionManager.handleAttack', async () => {
            await partyManager.handleAttack();
            expect(actionManagerStub.handleAttack.calledOnce).to.equal(true);
        });
    });

    describe('handleEscape', () => {
        it('should call actionManager.handleEscape', async () => {
            await partyManager.handleEscape();
            expect(actionManagerStub.handleEscape.calledOnce).to.equal(true);
        });
    });

    describe('handleGiveUpInFight', () => {
        it('should call actionManager.handleGiveUpWithFight without the good parameter playerId', async () => {
            const playerIdTes = 'test-player-id';
            await partyManager.handleGiveUpInFight(playerIdTes);
            expect(actionManagerStub.handleGiveUpWithFight.calledOnce).to.equal(true);
            expect(actionManagerStub.handleGiveUpWithFight.calledWithExactly(playerIdTes)).to.equal(true);
        });
    });

    describe('Private methods', () => {
        describe('assignPlayersStartPosition', () => {
            it('should assign start positions to players', () => {
                // Stub getStartPositions
                const startPositions: Coordinate[] = [
                    { x: 0, y: 1 },
                    { x: 1, y: 2 },
                ];
                partyServiceStub.getStartPositions.returns(startPositions);

                // Multiple players
                const player1 = { ...player, pid: 'player1' };
                const player2 = { ...player, pid: 'player2' };
                partyServiceStub.getPlayers.returns([player1, player2]);
                partyManager['assignPlayersStartPosition']();

                expect(player1.startPosition).to.deep.equal(startPositions[0]);
                expect(player1.previousPosition).to.deep.equal(startPositions[0]);
                expect(player1.currentPosition).to.deep.equal(startPositions[0]);

                expect(player2.startPosition).to.deep.equal(startPositions[1]);
                expect(player2.previousPosition).to.deep.equal(startPositions[1]);
                expect(player2.currentPosition).to.deep.equal(startPositions[1]);
            });
        });

        describe('teleportPlayer', () => {
            it("should call respawnManager's teleportPlayer and not call handleGameEnd if is party classic", () => {
                sinon.stub(partyManager as any, 'isPartyModeCTF').returns(false);
                const handleGameEndSpy = sinon.spy(partyManager as any, 'handleGameEnd');
                const pos = { x: 1, y: 1 };
                partyManager['teleportPlayerTo']('playerId', pos);
                expect(actionManagerStub.teleportPlayer.calledWith('playerId', pos)).to.equal(true);
                expect(handleGameEndSpy.calledWith('playerId')).to.equal(false);
            });

            it("should call respawnManager's teleportPlayer and handleGameEnd if is party flag", () => {
                sinon.stub(partyManager as any, 'isPartyModeCTF').returns(true);
                sinon.stub(partyManager as any, 'checkIfGameWonBy').returns(false);
                const handleGameEndSpy = sinon.spy(partyManager as any, 'handleGameEnd');
                const pos = { x: 1, y: 1 };
                partyManager['teleportPlayerTo']('playerId', pos);
                expect(actionManagerStub.teleportPlayer.calledWith('playerId', pos)).to.equal(true);
                expect(handleGameEndSpy.calledWith('playerId')).to.equal(true);
            });
        });
    });
});
