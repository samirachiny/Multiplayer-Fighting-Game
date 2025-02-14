/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { PartyService } from '@app/services/party/party.service';
import { Timer } from '@app/classes/timer/timer';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient } from '@common/enums/web-socket-event';
import { Subject } from 'rxjs';
import { Character } from '@common/interfaces/character';
import { DiceAssignment } from '@common/interfaces/dice-assignment';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { Container } from 'typedi';

describe('TurnManager', () => {
    let turnManager: TurnManager;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    let partyListenerStub: sinon.SinonStubbedInstance<PartyEventListener>;
    let sioStub: any;
    let partyId: string;
    let players: PlayerInfos[];
    let timerStub: sinon.SinonStubbedInstance<Timer>;
    let countdownStub: sinon.SinonStubbedInstance<Timer>;

    beforeEach(() => {
        // Create stubs for dependencies
        partyServiceStub = sinon.createStubInstance(PartyService);
        partyListenerStub = sinon.createStubInstance(PartyEventListener);

        sioStub = {
            to: sinon.stub().returnsThis(),
            in: sinon.stub().returnsThis(),
            socketsLeave: sinon.stub().returnsThis(),
            emit: sinon.stub().returnsThis(),
            on: sinon.stub().returnsThis(),
            socketsJoin: sinon.stub().returnsThis(),
        };

        partyId = 'test-party-id';

        // Create mock players
        const player1: PlayerInfos = {
            pid: 'player1',
            name: 'Player 1',
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
        };

        const player2: PlayerInfos = {
            pid: 'player2',
            name: 'Player 2',
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
        };

        players = [player1, player2];

        partyServiceStub.getOrderPlayers.withArgs(partyId).returns(players);
        // Stub timers
        timerStub = sinon.createStubInstance(Timer);
        countdownStub = sinon.createStubInstance(Timer);

        // Stub methods to avoid actual timer behavior
        timerStub.start.returns();
        timerStub.stop.returns();
        timerStub.reset.returns();
        countdownStub.start.returns();
        countdownStub.stop.returns();
        countdownStub.reset.returns();

        // Stub Observables
        (timerStub.updateTime$ as any) = new Subject<number>();
        (timerStub.end$ as any) = new Subject<boolean>();
        (countdownStub.updateTime$ as any) = new Subject<number>();
        (countdownStub.end$ as any) = new Subject<boolean>();

        PartyHelper.init(sioStub);
        Container.set(PartyService, partyServiceStub);
        Container.set(PartyEventListener, partyListenerStub);

        // Instantiate TurnManager with stubs
        turnManager = new TurnManager(partyId);

        // Replace timers with our stubs
        turnManager['timer'] = timerStub as unknown as Timer;
        turnManager['countdown'] = countdownStub as unknown as Timer;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('constructor', () => {
        it('should initialize properties correctly', () => {
            expect(turnManager['partyId']).to.equal(partyId);
            expect(turnManager['players']).to.equal(players);
            expect(turnManager['currentPlayerIndex']).to.equal(0);
            expect(turnManager['timer']).to.not.equal(null);
            expect(turnManager['timer']).to.not.equal(undefined);
            expect(turnManager['countdown']).to.not.equal(null);
            expect(turnManager['countdown']).to.not.equal(undefined);
            expect(players[0].isCurrentPlayer).to.equal(true);
        });
    });

    describe('initializeTurnCycle', () => {
        it('should start countdown and subscribe to events', () => {
            const subscribeToCountdownEventsSpy = sinon.spy(turnManager as any, 'subscribeToCountdownEvents');
            const subscribeToTimerEventsSpy = sinon.spy(turnManager as any, 'subscribeToTimerEvents');

            turnManager.initializeTurnCycle();

            expect(sioStub.emit.calledWith(WsEventClient.CountdownStart)).to.equal(true);
            expect(countdownStub.start.calledOnce).to.equal(true);
            expect(subscribeToCountdownEventsSpy.calledOnce).to.equal(true);
            expect(subscribeToTimerEventsSpy.calledOnce).to.equal(true);
        });
    });

    describe('pauseTurnTimer', () => {
        it('should pause the timer and send TIMER_PAUSE_FOR_FIGHT event', () => {
            turnManager.pauseTurnTimer();
            expect(timerStub.stop.calledOnce).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.TimerPauseForFight)).to.equal(true);
        });
        it('should pause the timer and send TIMER_PAUSE_FOR_CHOOSING_ITEM event', () => {
            turnManager.pauseTurnTimer(false);
            expect(timerStub.stop.calledOnce).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.TimerPauseForChoosingItem)).to.equal(true);
        });
    });

    describe('resumeTurnTimer', () => {
        it('should resume the timer and send TIMER_RESUME event', () => {
            turnManager.resumeTurnTimer();
            expect(timerStub.start.calledOnce).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.TimerResume)).to.equal(true);
        });
    });

    describe('endRound', () => {
        it('should stop the timer, update current player, and send events', () => {
            const updateCurrentPlayerSpy = sinon.spy(turnManager, 'updateCurrentPlayer');

            turnManager.endRound('playerId');

            expect(timerStub.stop.calledOnce).to.equal(true);
            expect(updateCurrentPlayerSpy.calledOnce).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.PlayerListUpdated, players)).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.CountdownStart)).to.equal(true);
            expect(countdownStub.reset.calledOnce).to.equal(true);
            expect(partyServiceStub.resetAttributePlayer.calledWith(partyId, 'playerId')).to.equal(true);
        });
    });

    describe('updateCurrentPlayer', () => {
        it('should update current player correctly when no players have given up', () => {
            const setPlayerCurrentStateSpy = sinon.spy(turnManager as any, 'setPlayerCurrentState');

            turnManager.updateCurrentPlayer();
            expect(partyServiceStub.resetAttributePlayer.calledWith(partyId, players[0].pid)).to.equal(true);
            expect(setPlayerCurrentStateSpy.calledWith(players[0], false)).to.equal(true);
            expect(setPlayerCurrentStateSpy.calledWith(players[1], true)).to.equal(true);
            expect(turnManager['currentPlayerIndex']).to.equal(1);
        });

        it('should skip players who have given up', () => {
            const setPlayerCurrentStateSpy = sinon.spy(turnManager as any, 'setPlayerCurrentState');
            // Simulate player 2 giving up
            players[1].isGiveUp = true;

            turnManager.updateCurrentPlayer();

            expect(partyServiceStub.resetAttributePlayer.calledWith(partyId, players[0].pid)).to.equal(true);
            expect(setPlayerCurrentStateSpy.calledWith(players[0], false)).to.equal(true);
            expect(setPlayerCurrentStateSpy.calledWith(players[1], true)).to.equal(false);
            expect(setPlayerCurrentStateSpy.calledWith(players[0], true)).to.equal(true); // Corrected expectation
            expect(turnManager['currentPlayerIndex']).to.equal(0);
        });
    });

    describe('isCurrentPlayer', () => {
        it('should return true if playerId matches current player', () => {
            const result = turnManager.isCurrentPlayer(players[0].pid);
            expect(result).to.equal(true);
        });

        it('should return false if playerId does not match current player', () => {
            const result = turnManager.isCurrentPlayer('some-other-player');
            expect(result).to.equal(false);
        });
    });

    describe('subscribeToCountdownEvents', () => {
        it('should handle countdown updateTime$ and end$ events', () => {
            // Manually call the method
            (turnManager as any).subscribeToCountdownEvents();
            (countdownStub.updateTime$ as Subject<number>).next(5);
            expect(sioStub.emit.calledWith(WsEventClient.CountdownUpdate, 5)).to.equal(true);
            (countdownStub.end$ as Subject<boolean>).next(true);

            expect(sioStub.emit.calledWith(WsEventClient.CountdownEnd)).to.equal(true);
            expect(timerStub.reset.calledOnce).to.equal(true);
        });
    });
    it('should handle countdown end$ events for virtual player', () => {
        turnManager['isVirtualPlayer'] = sinon.createStubInstance(Subject<string>);
        turnManager['players'] = [
            { ...players[0], isVirtualPlayer: true },
            { ...players[1], isVirtualPlayer: true },
        ];
        turnManager['currentPlayerIndex'] = 0;
        // Manually call the method
        (turnManager as any)['handleCountdownEnd']();
        expect(sioStub.emit.calledWith(WsEventClient.CountdownEnd)).to.equal(true);
        expect(timerStub.reset.calledOnce).to.equal(true);
        expect((turnManager['isVirtualPlayer'].next as any).calledOnce).to.equal(true);
    });
    describe('subscribeToTimerEvents', () => {
        it('should handle timer updateTime$ and end$ events', () => {
            const updateCurrentPlayerSpy = sinon.spy(turnManager, 'updateCurrentPlayer');

            // Manually call the method
            (turnManager as any).subscribeToTimerEvents();

            // Simulate updateTime$ event
            (timerStub.updateTime$ as Subject<number>).next(10);

            expect(sioStub.to.calledWith(partyId)).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.UpdateRemainTime, 10)).to.equal(true);

            // Simulate end$ event
            (timerStub.end$ as Subject<boolean>).next(true);

            expect(updateCurrentPlayerSpy.calledOnce).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.PlayerListUpdated, players)).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.CountdownStart)).to.equal(true);
            expect(countdownStub.reset.calledOnce).to.equal(true);
        });
        it('should handle timer updateTime$ and pause if choosing item', () => {
            partyServiceStub.getParty.returns({ isChoosingItem: true } as any);
            const pauseTimerStub = sinon.stub(turnManager, 'pauseTurnTimer');
            // Manually call the method
            (turnManager as any).subscribeToTimerEvents();

            // Simulate updateTime$ event
            (timerStub.updateTime$ as Subject<number>).next(1);

            expect(sioStub.to.calledWith(partyId)).to.equal(true);
            expect(pauseTimerStub.calledWith(false)).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.UpdateRemainTime, 1)).to.equal(true);
        });
    });

    describe('setPlayerCurrentState', () => {
        it('should set player current state and update party service', () => {
            const player = players[0];
            turnManager['setPlayerCurrentState'](player, true);

            expect(player.isCurrentPlayer).to.equal(true);
            expect(partyServiceStub.setCurrentPlayer.calledWith(partyId, player.pid, true)).to.equal(true);
        });
    });
    describe('destroyTurnCycle', () => {
        it('should unsubscribe from subscriptions, stop timer, and stop countdown', () => {
            const unsubscribeSpy = sinon.spy(turnManager['subscriptions'], 'unsubscribe');
            turnManager.destroyTurnCycle();
            expect(unsubscribeSpy.calledOnce).to.equal(true);
            expect(timerStub.stop.calledOnce).to.equal(true);
            expect(countdownStub.stop.calledOnce).to.equal(true);
        });
    });
});
