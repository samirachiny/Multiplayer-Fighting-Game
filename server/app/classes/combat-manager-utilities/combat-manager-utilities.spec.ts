/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { GameEventType } from '@common/enums/game-event-type';
import { LogTypeEvent } from '@common/enums/log-type';
import { SendingOptions } from '@common/enums/sending-options';
import { WsEventClient } from '@common/enums/web-socket-event';
import { Fighter } from '@common/interfaces/player-infos';
import { Container } from 'typedi';
import { FighterManager } from '@app/classes/fighter-manager/fighter-manager';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { CombatManagerUtilities } from './combat-manager-utilities';

describe('CombatManagerUtilities', () => {
    let combatManagerUtilities: CombatManagerUtilities;
    let partyListenerStub: sinon.SinonStubbedInstance<PartyEventListener>;
    const partyId = 'party1';

    beforeEach(() => {
        partyListenerStub = sinon.createStubInstance(PartyEventListener);
        Container.set(PartyEventListener, partyListenerStub);
        combatManagerUtilities = new CombatManagerUtilities(partyId);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('sendGameEvent', () => {
        it('should emit a game event', () => {
            const eventType = GameEventType.BeginFight;
            const attackerPid = 'attacker1';
            const defenderPid = 'defender1';

            combatManagerUtilities.sendGameEvent(eventType, attackerPid, defenderPid);

            expect(partyListenerStub.emit.calledOnceWith(eventType, { partyId, attackerPid, defenderPid })).to.be.true;
        });
    });

    describe('sendEndFightWithoutWinnerLog', () => {
        it('should emit an end fight without winner log event', () => {
            const playerIds = ['player1', 'player2'];

            combatManagerUtilities.sendEndFightWithoutWinnerLog(playerIds);

            expect(
                partyListenerStub.emit.calledOnceWith(LogTypeEvent.EndFightWithoutWinner, {
                    partyId,
                    logParameters: { event: LogTypeEvent.EndFightWithoutWinner, playerIds },
                    options: SendingOptions.Broadcast,
                }),
            ).to.be.true;
        });
    });

    describe('sendFightLog', () => {
        it('should emit a fight log event', () => {
            const fightLogEvent = LogTypeEvent.AttackTo;
            const moreInfos = { detail: 'some details' };
            const playerIds = ['player1', 'player2'];

            combatManagerUtilities.sendFightLog(fightLogEvent, moreInfos, playerIds);

            expect(
                partyListenerStub.emit.calledOnceWith(fightLogEvent, {
                    partyId,
                    logParameters: { event: fightLogEvent, playerIds, moreInfos },
                    options: SendingOptions.Unicast,
                }),
            ).to.be.true;
        });
    });

    describe('sendEndFightLog', () => {
        it('should emit an end fight log event', () => {
            const winnerId = 'winner1';
            const loserId = 'loser1';

            combatManagerUtilities.sendEndFightLog(winnerId, loserId);

            expect(
                partyListenerStub.emit.calledOnceWith(LogTypeEvent.EndFight, {
                    partyId,
                    logParameters: { event: LogTypeEvent.EndFight, playerIds: [winnerId, loserId] },
                    options: SendingOptions.Broadcast,
                }),
            ).to.be.true;
        });
    });

    describe('sendDiceBonusLog', () => {
        it('should emit a dice bonus log event', () => {
            const diceEvent = LogTypeEvent.ComputeDiceAttackBonus;
            const bonus = 5;
            const target = 10;
            const playerIds = ['player1', 'player2'];

            combatManagerUtilities.sendDiceBonusLog(diceEvent, bonus, target, playerIds);

            expect(
                partyListenerStub.emit.calledOnceWith(diceEvent, {
                    partyId,
                    logParameters: { event: diceEvent, playerIds, moreInfos: { faceNumber: bonus, targetToApply: target } },
                    options: SendingOptions.Unicast,
                }),
            ).to.be.true;
        });
    });

    describe('sendEscapeLog', () => {
        it('should emit an escape log event', () => {
            const playerIds = ['player1', 'player2'];
            const isSuccess = true;

            combatManagerUtilities.sendEscapeLog(playerIds, isSuccess);

            expect(
                partyListenerStub.emit.calledOnceWith(LogTypeEvent.EscapeFrom, {
                    partyId,
                    logParameters: { event: LogTypeEvent.EscapeFrom, playerIds, moreInfos: isSuccess },
                    options: SendingOptions.Unicast,
                }),
            ).to.be.true;
        });
    });

    describe('sendRollDiceResult', () => {
        it('should send roll dice result', () => {
            const fighterManager = { pid: 'fighter1', attackDice: 'D6', defenseDice: 'D4' } as FighterManager;
            const diceRollResult = 4;
            const isAttackDice = true;
            const sendEventStub = sinon.stub(PartyHelper, 'sendEvent');

            combatManagerUtilities.sendRollDiceResult(fighterManager, diceRollResult, isAttackDice);
            expect(
                sendEventStub.calledWith(partyId, WsEventClient.RollDiceResult, {
                    pid: fighterManager.pid,
                    type: fighterManager.attackDice,
                    result: diceRollResult,
                }),
            ).to.equal(true);

            combatManagerUtilities.sendRollDiceResult(fighterManager, diceRollResult, !isAttackDice);
            expect(
                sendEventStub.calledWith(partyId, WsEventClient.RollDiceResult, {
                    pid: fighterManager.pid,
                    type: fighterManager.defenseDice,
                    result: diceRollResult,
                }),
            ).to.equal(true);
        });
    });

    describe('orderPlayersBySpeed', () => {
        it('should order players by speed', () => {
            const initiator = { speed: 10 } as Fighter;
            const target = { speed: 5 } as Fighter;

            const result = combatManagerUtilities.orderPlayersBySpeed(initiator, target);

            expect(result).to.deep.equal([initiator, target]);
        });

        it('should order players by speed when target is faster', () => {
            const initiator = { speed: 5 } as Fighter;
            const target = { speed: 10 } as Fighter;

            const result = combatManagerUtilities.orderPlayersBySpeed(initiator, target);

            expect(result).to.deep.equal([target, initiator]);
        });
    });
});
