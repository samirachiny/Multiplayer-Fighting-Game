/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { Subscription } from 'rxjs';
import { CombatManager } from '@app/classes/combat-manager/combat-manager';
import { PartyService } from '@app/services/party/party.service';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Fighter, PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient } from '@common/enums/web-socket-event';
import { LogTypeEvent } from '@common/enums/log-type';
import { Dice } from '@common/enums/dice';
import {
    DICE_ROLL_RESULT_TIME,
    TIME_BEFORE_END_BATTLE,
    TIME_HANDLE_ATTACK,
    TIME_HANDLE_EVASION,
    TIME_PER_ROUND,
    TIME_PER_ROUND_WITH_NO_ESCAPE,
    VICTORIES_REQUIRED_TO_WIN,
} from '@app/utils/const';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { Party } from '@common/interfaces/party';
import { MOCK_PLAYER_INFOS } from '@app/utils/data';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import * as helper from '@app/utils/helper';
import { CombatManagerUtilities } from '@app/classes/combat-manager-utilities/combat-manager-utilities';
import { BotProfile } from '@common/enums/virtual-player-profile';

describe('CombatManager', () => {
    let combatManager: CombatManager;
    let mockPartyService: sinon.SinonStubbedInstance<PartyService>;
    let mockTurnManager: sinon.SinonStubbedInstance<TurnManager>;
    let sioStub: any;
    let mockRespawnManager: sinon.SinonStubbedInstance<RespawnManager>;
    let mockCombatManagerUtilities: sinon.SinonStubbedInstance<CombatManagerUtilities>;

    const mockFighter: Fighter = {
        pid: 'player1',
        name: 'Fighter1',
        speed: 5,
        attack: 3,
        defense: 2,
        life: 10,
        remainEscape: 2,
        diceAssignment: { attack: Dice.D6, defense: Dice.D4 },
        character: {
            id: 0,
            name: 'a',
            imagePath: '',
            story: '',
        },
    };

    beforeEach(() => {
        mockPartyService = sinon.createStubInstance(PartyService);
        mockTurnManager = sinon.createStubInstance(TurnManager);
        mockRespawnManager = sinon.createStubInstance(RespawnManager);
        mockCombatManagerUtilities = sinon.createStubInstance(CombatManagerUtilities);
        mockCombatManagerUtilities.orderPlayersBySpeed.returns([mockFighter, mockFighter]);
        sioStub = {
            to: sinon.stub().returnsThis(),
            in: sinon.stub().returnsThis(),
            socketsLeave: sinon.stub().returnsThis(),
            emit: sinon.stub().returnsThis(),
            on: sinon.stub().returnsThis(),
            socketsJoin: sinon.stub().returnsThis(),
        };
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

        mockPartyService.getOrderPlayers.returns([] as PlayerInfos[]);
        PartyHelper.init(sioStub);
        combatManager = new CombatManager('testPartyId', mockRespawnManager, mockTurnManager);
        combatManager['combatManagerUtilities'] = mockCombatManagerUtilities;
        combatManager['partyService'] = mockPartyService;
        combatManager.initFight(mockFighter, mockFighter, false);
        mockPartyService.getPlayer.returns(MOCK_PLAYER_INFOS);
    });

    afterEach(() => {
        sinon.restore();
        combatManager.resetAll();
    });

    it('should initialize a fight and send fight initiation event', () => {
        combatManager.initFight(mockFighter, mockFighter, false);
        expect(sioStub.emit.calledWith(WsEventClient.FightInit, sinon.match.object)).to.equal(true);
    });

    describe('handleAttack', () => {
        it('should handleAttack call executeAttackSequence and call updateAttacker when is not battle end', async () => {
            sinon.stub(combatManager as any, 'isBattleEnd').resolves(false);
            const executeAttackSequenceSpy = sinon.stub(combatManager as any, 'executeAttackSequence').resolves();
            const updateAttackerSpy = sinon.stub(combatManager as any, 'updateAttacker');
            await combatManager.handleAttack();
            expect(executeAttackSequenceSpy.called).to.equal(true);
            expect(updateAttackerSpy.called).to.equal(true);
        });

        it('should handleAttack call executeAttackSequence and not call updateAttacker when is battle end', async () => {
            sinon.stub(combatManager as any, 'isBattleEnd').resolves(true);
            const executeAttackSequenceSpy = sinon.stub(combatManager as any, 'executeAttackSequence').resolves();
            const updateAttackerSpy = sinon.stub(combatManager as any, 'updateAttacker');
            await combatManager.handleAttack();
            expect(executeAttackSequenceSpy.called).to.equal(true);
            expect(updateAttackerSpy.called).to.equal(false);
        });
    });

    describe('handleEvasion', () => {
        it("should call updateAttacker and return if player don't have point to escape", async () => {
            sinon.stub(combatManager as any, 'isEscapeAttemptsExhausted').returns(true);
            const handleSuccessfulEscapeSpy = sinon.stub(combatManager as any, 'handleSuccessfulEscape');
            const handleFailedEscapeSpy = sinon.stub(combatManager as any, 'handleFailedEscape');
            const updateAttackerSpy = sinon.stub(combatManager as any, 'updateAttacker');
            await combatManager.handleEvasion();
            expect(updateAttackerSpy.called).to.equal(true);
            expect(handleSuccessfulEscapeSpy.called).to.equal(false);
            expect(handleFailedEscapeSpy.called).to.equal(false);
        });

        it('should not call updateAttacker and call handleSuccessfulEscape if successful attack', async () => {
            sinon.stub(combatManager as any, 'isEscapeAttemptsExhausted').returns(false);
            sinon.stub(combatManager['attackerManager'] as any, 'hasEscapeSuccessful').returns(true);
            const handleSuccessfulEscapeSpy = sinon.stub(combatManager as any, 'handleSuccessfulEscape');
            const handleFailedEscapeSpy = sinon.stub(combatManager as any, 'handleFailedEscape');
            const updateAttackerSpy = sinon.stub(combatManager as any, 'updateAttacker');
            const stopTimerSpy = sinon.stub(combatManager as any, 'stopTimer');
            await combatManager.handleEvasion();
            expect(updateAttackerSpy.called).to.equal(false);
            expect(stopTimerSpy.called).to.equal(true);
            expect(handleSuccessfulEscapeSpy.called).to.equal(true);
            expect(handleFailedEscapeSpy.called).to.equal(false);
        });

        it('should not call updateAttacker and call handleFailedEscape if failed attack', async () => {
            sinon.stub(combatManager as any, 'isEscapeAttemptsExhausted').returns(false);
            sinon.stub(combatManager['attackerManager'] as any, 'hasEscapeSuccessful').returns(false);
            const handleSuccessfulEscapeSpy = sinon.stub(combatManager as any, 'handleSuccessfulEscape');
            const handleFailedEscapeSpy = sinon.stub(combatManager as any, 'handleFailedEscape');
            const updateAttackerSpy = sinon.stub(combatManager as any, 'updateAttacker');
            const stopTimerSpy = sinon.stub(combatManager as any, 'stopTimer');
            await combatManager.handleEvasion();
            expect(updateAttackerSpy.called).to.equal(false);
            expect(stopTimerSpy.called).to.equal(true);
            expect(handleSuccessfulEscapeSpy.called).to.equal(false);
            expect(handleFailedEscapeSpy.called).to.equal(true);
        });
    });

    describe('handleGiveUp', () => {
        it('should stop the timer and send give up event', async () => {
            sinon.stub(helper, 'delay').resolves();
            const stopTimerSpy = sinon.stub(combatManager as any, 'stopTimer');
            await combatManager.handleGiveUp(mockFighter.pid);
            expect(stopTimerSpy.called).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.FighterGiveUp)).to.equal(true);
        });

        it('should not call resetAll and resumeTimer if victory count reached', async () => {
            sinon.stub(helper, 'delay').resolves();
            sinon.stub(combatManager as any, 'handleWinCount').returns(VICTORIES_REQUIRED_TO_WIN);
            const resetAllSpy = sinon.spy(combatManager as any, 'resetAll');
            await combatManager.handleGiveUp(mockFighter.pid);
            expect(resetAllSpy.called).to.equal(true);
            expect(mockTurnManager.resumeTurnTimer.called).to.equal(true);
        });

        it('should call endRound if shouldEndRound returns true', async () => {
            sinon.stub(helper, 'delay').resolves();
            sinon.stub(combatManager as any, 'shouldEndRound').returns(true);
            await combatManager.handleGiveUp(mockFighter.pid);
            expect(mockTurnManager.endRound.calledOnceWith(combatManager['initiator'].pid)).to.equal(true);
        });

        it('should not call endRound if shouldEndRound returns false', async () => {
            sinon.stub(helper, 'delay').resolves();
            sinon.stub(combatManager as any, 'shouldEndRound').returns(false);
            await combatManager.handleGiveUp(mockFighter.pid);
            expect(mockTurnManager.endRound.called).to.equal(false);
        });
    });

    describe('getWinnerId', () => {
        it('should return defender ID when loser is attacker', () => {
            combatManager['attackerManager'].setFighter(mockFighter);
            const defender = { ...mockFighter, pid: 'player2' };
            combatManager['defenderManager'].setFighter(defender);
            const result = combatManager['getWinnerId'](mockFighter.pid);
            expect(result).to.equal(defender.pid);
        });

        it('should return attacker ID when loser is defender', () => {
            combatManager['defenderManager'].setFighter(mockFighter);
            const attacker = { ...mockFighter, pid: 'player2' };
            combatManager['attackerManager'].setFighter(attacker);
            const result = combatManager['getWinnerId'](mockFighter.pid);
            expect(result).to.equal(attacker.pid);
        });
    });

    describe('updateAttacker', () => {
        it('should swap roles and update the attacker', () => {
            const swapRolesSpy = sinon.spy(combatManager as any, 'swapRoles');
            const resetTimerSpy = sinon.spy(combatManager['fightingTimer'], 'reset');
            const setDurationSpy = sinon.spy(combatManager['fightingTimer'], 'setDuration');
            combatManager['updateAttacker']();
            expect(swapRolesSpy.calledOnce).to.equal(true);
            expect(sioStub.emit.calledWith(WsEventClient.UpdateCurrentAttacker, combatManager['attackerManager'].fighter.pid)).to.equal(true);
            const expectedDuration = combatManager['attackerManager'].fighter.remainEscape === 0 ? TIME_PER_ROUND_WITH_NO_ESCAPE : TIME_PER_ROUND;
            expect(setDurationSpy.calledWith(expectedDuration)).to.equal(true);
            expect(resetTimerSpy.calledOnce).to.equal(true);
        });
    });

    describe('executeAttackSequence', () => {
        let sendRollDiceResultSpy: sinon.SinonSpy;
        let delaySpy: sinon.SinonStub;
        let isAttackSuccessfulStub: sinon.SinonStub;
        let handleAttackSuccessfulSpy: sinon.SinonSpy;
        let manageFightLogsSpy: sinon.SinonSpy;

        beforeEach(() => {
            sendRollDiceResultSpy = sinon.spy(combatManager as any, 'sendRollDiceResult');
            delaySpy = sinon.stub(helper, 'delay').resolves();
            isAttackSuccessfulStub = sinon.stub(combatManager as any, 'isAttackSuccessful');
            handleAttackSuccessfulSpy = sinon.spy(combatManager as any, 'handleAttackSuccessful');
            manageFightLogsSpy = sinon.spy(combatManager as any, 'manageFightLogs');
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should send dice roll results and handle successful attack', async () => {
            sinon.stub(combatManager['attackerManager'], 'attackRoll').returns(4);
            sinon.stub(combatManager['defenderManager'], 'defenseRoll').returns(2);
            isAttackSuccessfulStub.returns(true);

            await combatManager['executeAttackSequence']();
            expect(sendRollDiceResultSpy.calledOnceWith(4, 2)).to.equal(true);
            expect(delaySpy.calledWith(DICE_ROLL_RESULT_TIME)).to.equal(true);
            expect(handleAttackSuccessfulSpy.called).to.equal(true);
        });

        it('should send dice roll results and handle failed attack', async () => {
            sinon.stub(combatManager['attackerManager'], 'attackRoll').returns(3);
            sinon.stub(combatManager['defenderManager'], 'defenseRoll').returns(4);
            isAttackSuccessfulStub.returns(false);

            await combatManager['executeAttackSequence']();

            expect(sendRollDiceResultSpy.calledOnceWith(3, 4)).to.equal(true);
            expect(handleAttackSuccessfulSpy.notCalled).to.equal(true);
            expect(manageFightLogsSpy.calledOnceWith(0)).to.equal(true);
        });
    });

    describe('handleAttackSuccessful', () => {
        let manageFightLogsSpy: sinon.SinonSpy;
        let takeDamageSpy: sinon.SinonSpy;
        let delayStub: sinon.SinonStub;
        let handleSwapOpponentLifeStub: sinon.SinonStub;
        let handleSecondLifeStub: sinon.SinonStub;
        let sendEventSpy: sinon.SinonSpy;

        beforeEach(() => {
            manageFightLogsSpy = sinon.spy(combatManager as any, 'manageFightLogs');
            takeDamageSpy = sinon.spy(combatManager['defenderManager'], 'takeDamage');
            delayStub = sinon.stub(helper, 'delay').resolves();
            handleSwapOpponentLifeStub = sinon.stub(combatManager['defenderManager'], 'handleSwapOpponentLife');
            handleSecondLifeStub = sinon.stub(combatManager['defenderManager'], 'handleSecondLife');
            sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should manage fight logs, decrement life, and delay', async () => {
            await combatManager['handleAttackSuccessful']();

            expect(manageFightLogsSpy.calledOnceWith(1)).to.equal(true);
            expect(takeDamageSpy.calledOnce).to.equal(true);
            expect(delayStub.calledWith(TIME_HANDLE_ATTACK / 2)).to.equal(true);
        });

        it('should send SwapFightersLives event if handleSwapOpponentLife returns true', async () => {
            handleSwapOpponentLifeStub.returns(true);

            await combatManager['handleAttackSuccessful']();

            expect(handleSwapOpponentLifeStub.calledOnceWith(combatManager['attackerManager'].fighter)).to.equal(true);
            expect(sendEventSpy.calledWith(combatManager['partyId'], WsEventClient.SwapFightersLives)).to.equal(true);
        });

        it('should not send SwapFightersLives event if handleSwapOpponentLife returns false', async () => {
            handleSwapOpponentLifeStub.returns(false);

            await combatManager['handleAttackSuccessful']();

            expect(handleSwapOpponentLifeStub.calledOnceWith(combatManager['attackerManager'].fighter)).to.equal(true);
            expect(sendEventSpy.calledWith(combatManager['partyId'], WsEventClient.SwapFightersLives)).to.equal(false);
        });

        it('should send AddDefenderLife event if handleSecondLife returns true', async () => {
            handleSecondLifeStub.returns(true);

            await combatManager['handleAttackSuccessful']();

            expect(handleSecondLifeStub.calledOnce).to.equal(true);
            expect(sendEventSpy.calledWith(combatManager['partyId'], WsEventClient.AddDefenderLife)).to.equal(true);
        });

        it('should not send AddDefenderLife event if handleSecondLife returns false', async () => {
            handleSecondLifeStub.returns(false);

            await combatManager['handleAttackSuccessful']();

            expect(handleSecondLifeStub.calledOnce).to.equal(true);
            expect(sendEventSpy.calledWith(combatManager['partyId'], WsEventClient.AddDefenderLife)).to.equal(false);
        });
    });

    describe('manageFightLogs', () => {
        it('should log attack and defense events with correct parameters', () => {
            combatManager['manageFightLogs'](1);
            expect(
                mockCombatManagerUtilities.sendFightLog.calledWith(LogTypeEvent.AttackTo, 1, [
                    combatManager['attackerManager'].fighter.pid,
                    combatManager['defenderManager'].fighter.pid,
                ]),
            ).to.equal(true);
            expect(
                mockCombatManagerUtilities.sendFightLog.calledWith(LogTypeEvent.DefenseFrom, false, [
                    combatManager['defenderManager'].fighter.pid,
                    combatManager['attackerManager'].fighter.pid,
                ]),
            ).to.equal(true);
        });
    });

    describe('isAttackSuccessful', () => {
        it('should return true if attacker’s attack + roll is greater than defender’s defense + roll', () => {
            sinon.stub(combatManager['attackerManager'].fighter, 'attack').value(5);
            sinon.stub(combatManager['defenderManager'].fighter, 'defense').value(3);

            expect(combatManager['isAttackSuccessful'](4, 2)).to.equal(true);
        });

        it('should return false if attacker’s attack + roll is less than or equal to defender’s defense + roll', () => {
            sinon.stub(combatManager['attackerManager'].fighter, 'attack').value(4);
            sinon.stub(combatManager['defenderManager'].fighter, 'defense').value(5);

            expect(combatManager['isAttackSuccessful'](3, 2)).to.equal(false);
        });
    });

    describe('isBattleEnd', () => {
        let isDeadStub: sinon.SinonStub;
        let terminateFightSpy: sinon.SinonSpy;

        beforeEach(() => {
            isDeadStub = sinon.stub(combatManager['defenderManager'], 'isDead');
            terminateFightSpy = sinon.spy(combatManager as any, 'terminateFight');
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should terminate fight if defender is dead and return true', async () => {
            isDeadStub.returns(true);

            const result = await combatManager['isBattleEnd']();

            expect(terminateFightSpy.calledOnce).to.equal(true);
            expect(result).to.equal(true);
        });

        it('should return false if defender is not dead', async () => {
            isDeadStub.returns(false);

            const result = await combatManager['isBattleEnd']();

            expect(terminateFightSpy.called).to.equal(false);
            expect(result).to.equal(false);
        });
    });

    describe('terminateFight', () => {
        let delayStub: sinon.SinonStub;
        let handleWinCountStub: sinon.SinonSpy;

        beforeEach(() => {
            delayStub = sinon.stub(helper, 'delay').resolves();
            handleWinCountStub = sinon.spy(combatManager as any, 'handleWinCount');
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should handle win count and update logs', async () => {
            await combatManager['terminateFight']();
            expect(delayStub.calledOnceWith(TIME_BEFORE_END_BATTLE)).to.equal(true);
            expect(handleWinCountStub.calledOnceWith(mockFighter.pid)).to.equal(true);
        });

        it('should send fight terminated and resume turn if game is not won', async () => {
            await combatManager['terminateFight']();
            expect(sioStub.emit.calledWith(WsEventClient.FightTerminated)).to.equal(true);
            expect(mockRespawnManager.replacePlayer.calledOnce).to.equal(true);
            expect(mockTurnManager.resumeTurnTimer.calledOnce).to.equal(true);
        });

        it('should end the round if required', async () => {
            sinon.stub(combatManager as any, 'shouldEndRound').returns(true);
            await combatManager['terminateFight']();
            expect(mockTurnManager.endRound.called).to.equal(true);
        });

        it('should decrement loser’s win count if hasPartyDecreaseLoserWins returns true', async () => {
            mockPartyService.hasPartyDecreaseLoserWins.returns(true);
            await combatManager['terminateFight']();
            expect((combatManager['handleWinCount'] as any).calledWith(mockFighter.pid, -1)).to.equal(true);
        });

        it('should not decrement loser’s win count if hasPartyDecreaseLoserWins returns false', async () => {
            mockPartyService.hasPartyDecreaseLoserWins.returns(false);
            await combatManager['terminateFight']();
            expect((combatManager['handleWinCount'] as any).calledWith(mockFighter.pid, -1)).to.equal(false);
        });
    });

    describe('handleWinCount', () => {
        it('should increase win count', () => {
            combatManager['handleWinCount']('fighterId');
            expect(mockPartyService.addToWinCount.calledOnceWith('testPartyId', 'fighterId', 1)).to.equal(true);
        });
    });

    describe('shouldEndRound', () => {
        beforeEach(() => {
            combatManager['initiator'] = { pid: 'initiatorId' } as Fighter;
            combatManager['defenderManager'].fighter = { pid: 'defenderId' } as Fighter;
        });

        it('should return true if initiator is not a winner', () => {
            const winnerId = 'id';
            const result = combatManager['shouldEndRound'](winnerId);
            expect(result).to.equal(true);
        });

        it('should return true if isTurnOver is true', () => {
            combatManager['isTurnOver'] = true;
            const winnerId = 'id';
            const result = combatManager['shouldEndRound'](winnerId);
            expect(result).to.equal(true);
        });

        it('should return false if neither conditions are met', () => {
            combatManager['isTurnOver'] = false;
            const winnerId = combatManager['initiator'].pid;
            const result = combatManager['shouldEndRound'](winnerId);
            expect(result).to.equal(false);
        });
    });

    describe('handleSuccessfulEscape', () => {
        it('should handle successful escape, update logs, delay, and terminate fight without winner', async () => {
            const delayStub = sinon.stub(helper, 'delay').resolves();
            const terminateFightWithoutWinnerSpy = sinon.spy(combatManager as any, 'terminateFightWithoutWinner');
            await combatManager['handleSuccessfulEscape']();
            expect(sioStub.emit.calledWith(WsEventClient.EscapePassed)).to.equal(true);
            expect(delayStub.calledWith(TIME_HANDLE_EVASION)).to.equal(true);
            expect(terminateFightWithoutWinnerSpy.calledOnce).to.equal(true);
        });
    });

    describe('handleFailedEscape', () => {
        let delayStub: sinon.SinonStub;
        let updateAttackerSpy: sinon.SinonSpy;

        beforeEach(() => {
            delayStub = sinon.stub(helper, 'delay').resolves();
            updateAttackerSpy = sinon.spy(combatManager as any, 'updateAttacker');
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should decrement remainEscape, handle failed escape, update logs, delay, and update attacker', async () => {
            combatManager['attackerManager'].fighter.remainEscape = 1;

            await combatManager['handleFailedEscape']();

            expect(combatManager['attackerManager'].fighter.remainEscape).to.equal(0);
            expect(sioStub.emit.calledWith(WsEventClient.EscapeFailed)).to.equal(true);
            expect(delayStub.calledWith(TIME_HANDLE_EVASION)).to.equal(true);
            expect(updateAttackerSpy.calledOnce).to.equal(true);
        });
    });

    describe('isEscapeAttemptsExhausted', () => {
        it('should return true if remainEscape is 0', () => {
            combatManager['attackerManager'].fighter.remainEscape = 0;
            expect(combatManager['isEscapeAttemptsExhausted']()).to.equal(true);
        });

        it('should return false if remainEscape is greater than 0', () => {
            combatManager['attackerManager'].fighter.remainEscape = 1;
            expect(combatManager['isEscapeAttemptsExhausted']()).to.equal(false);
        });
    });

    describe('terminateFightWithoutWinner', () => {
        it('should send fight terminated, update logs, reset all, and resume turn timer', () => {
            const resetAllSpy = sinon.spy(combatManager as any, 'resetAll');
            combatManager['terminateFightWithoutWinner']();
            expect(sioStub.emit.calledWith(WsEventClient.FightTerminated)).to.equal(true);
            expect(resetAllSpy.calledOnce).to.equal(true);
            expect(mockTurnManager.resumeTurnTimer.calledOnce).to.equal(true);
        });

        it('should call endRound if isTurnOver is true', () => {
            combatManager['isTurnOver'] = true;
            combatManager['terminateFightWithoutWinner']();
            expect(mockTurnManager.endRound.calledOnceWith(combatManager['initiator'].pid)).to.equal(true);
        });

        it('should not call endRound if isTurnOver is false', () => {
            combatManager['isTurnOver'] = false;
            combatManager['terminateFightWithoutWinner']();
            expect(mockTurnManager.endRound.called).to.equal(false);
        });
    });

    describe('assignFighters', () => {
        it('should assign initiator and target fighters', () => {
            const initiator = { pid: 'initiator' } as Fighter;
            const target = { pid: 'target' } as Fighter;

            combatManager['assignFighters'](initiator, target);

            expect(combatManager['initiator']).to.equal(initiator);
            expect(combatManager['target']).to.equal(target);
        });
    });

    describe('assignRoles', () => {
        let setFighterSpy1: sinon.SinonSpy;
        let setFighterSpy2: sinon.SinonSpy;

        beforeEach(() => {
            setFighterSpy1 = sinon.spy(combatManager['attackerManager'], 'setFighter');
            setFighterSpy2 = sinon.spy(combatManager['defenderManager'], 'setFighter');
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should assign fighters to attacker and defender managers', () => {
            const fighter1 = { pid: 'fighter1' } as Fighter;
            const fighter2 = { pid: 'fighter2' } as Fighter;

            combatManager['assignRoles'](fighter1, fighter2);

            expect(setFighterSpy1.calledOnceWith(fighter1)).to.equal(true);
            expect(setFighterSpy2.calledOnceWith(fighter2)).to.equal(true);
        });
    });

    describe('isAttacking', () => {
        it('should return true if player is attacker', () => {
            combatManager['attackerManager'].fighter = { pid: 'attacker' } as Fighter;
            const result = combatManager['isAttacking']({ pid: 'attacker' } as Fighter);
            expect(result).to.equal(true);
        });

        it('should return false if player is not attacker', () => {
            combatManager['attackerManager'].fighter = { pid: 'attacker' } as Fighter;
            const result = combatManager['isAttacking']({ pid: 'notAttacker' } as Fighter);
            expect(result).to.equal(false);
        });
    });

    describe('swapRoles', () => {
        let assignRolesSpy: sinon.SinonSpy;

        beforeEach(() => {
            assignRolesSpy = sinon.spy(combatManager as any, 'assignRoles');
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should swap roles to set target as attacker if initiator is currently attacker', () => {
            sinon.stub(combatManager as any, 'isAttacking').returns(true);
            combatManager['initiator'] = { pid: 'initiator' } as Fighter;
            combatManager['target'] = { pid: 'target' } as Fighter;
            combatManager['swapRoles']();
            expect(assignRolesSpy.calledOnceWith(combatManager['target'], combatManager['initiator'])).to.equal(true);
        });

        it('should swap roles to set initiator as attacker if initiator is not currently attacker', () => {
            sinon.stub(combatManager as any, 'isAttacking').returns(false);
            combatManager['initiator'] = { pid: 'initiator' } as Fighter;
            combatManager['target'] = { pid: 'target' } as Fighter;
            combatManager['swapRoles']();
            expect(assignRolesSpy.calledOnceWith(combatManager['initiator'], combatManager['target'])).to.equal(true);
        });
    });

    describe('sendRollDiceResult', () => {
        it('should send roll dice result for attacker and defender', () => {
            combatManager['sendRollDiceResult'](5, 3);
            expect(mockCombatManagerUtilities.sendRollDiceResult.calledWith(combatManager['attackerManager'], 5, true)).to.equal(true);
            expect(mockCombatManagerUtilities.sendRollDiceResult.calledWith(combatManager['defenderManager'], 3, false)).to.equal(true);
        });
    });

    describe('calculateDiceValues', () => {
        let attackRollSpy: any;
        let defenseRollSpy: any;
        let getMaxAttackRollSpy: any;
        let getMinDefenseRollSpy: any;
        beforeEach(() => {
            attackRollSpy = sinon.stub(combatManager['attackerManager'], 'attackRoll');
            defenseRollSpy = sinon.stub(combatManager['defenderManager'], 'defenseRoll');
            getMaxAttackRollSpy = sinon.stub(combatManager['attackerManager'], 'getMaxAttackRoll');
            getMinDefenseRollSpy = sinon.stub(combatManager['defenderManager'], 'getMinDefenseRoll');
            attackRollSpy.returns(3);
            defenseRollSpy.returns(3);
            getMaxAttackRollSpy.returns(6);
            getMinDefenseRollSpy.returns(1);
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should return max attack and min defense is on debug mode', () => {
            mockPartyService.isDebugMode.returns(true);
            expect(combatManager['calculateDiceValues']()).to.deep.equal({ attackDiceRollResult: 6, defenseDiceRollResult: 1 });
        });

        it('should return roll dice attack and roll dice defense is not on debug mode', () => {
            mockPartyService.isDebugMode.returns(false);
            expect(combatManager['calculateDiceValues']()).to.deep.equal({ attackDiceRollResult: 3, defenseDiceRollResult: 3 });
        });
    });

    it('should reset all fighters and subscriptions', () => {
        const unsubscribeUpdateTimerSpy = sinon.spy(combatManager['updateTimer'], 'unsubscribe');
        const unsubscribeEndTimerSpy = sinon.spy(combatManager['endTimer'], 'unsubscribe');
        combatManager.resetAll();
        expect(unsubscribeUpdateTimerSpy.called).to.equal(true);
        expect(unsubscribeEndTimerSpy.called).to.equal(true);
    });

    it('should reset all fighters and subscriptions', () => {
        const unsubscribeUpdateTimerSpy = sinon.spy(combatManager['updateTimer'], 'unsubscribe');
        const unsubscribeEndTimerSpy = sinon.spy(combatManager['endTimer'], 'unsubscribe');
        (combatManager as any).updateTimer = undefined;
        (combatManager as any).endTimer = undefined;
        combatManager.resetAll();
        expect(unsubscribeUpdateTimerSpy.called).to.equal(false);
        expect(unsubscribeEndTimerSpy.called).to.equal(false);
    });
    describe('configureTimerEvents', () => {
        let updateTimeCallback: (remainTime: number) => void;
        let endCallback: () => Promise<void>;
        let sendEventSpy: sinon.SinonSpy;
        let handleEvasionStub: sinon.SinonStub;
        let handleAttackStub: sinon.SinonStub;
        let isDefensiveVirtualPlayerStub: sinon.SinonStub;

        beforeEach(() => {
            sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');
            handleEvasionStub = sinon.stub(combatManager, 'handleEvasion').resolves();
            handleAttackStub = sinon.stub(combatManager, 'handleAttack').resolves();
            isDefensiveVirtualPlayerStub = sinon.stub(combatManager as any, 'isDefensiveVirtualPlayerWithDamageAndRemainEscape');
            sinon.stub(combatManager['fightingTimer'].updateTime$, 'subscribe').callsFake((callback) => {
                updateTimeCallback = callback;
                return new Subscription();
            });

            sinon.stub(combatManager['fightingTimer'].end$, 'subscribe').callsFake((callback) => {
                endCallback = callback as () => Promise<void>;
                return new Subscription();
            });
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should send the remaining time with PartyHelper when updateTime$ is triggered', () => {
            combatManager.configureTimerEvents();
            const remainTime = 10;
            updateTimeCallback(remainTime);
            expect(sendEventSpy.calledOnceWith(combatManager['partyId'], WsEventClient.UpdateRemainFightingTime, remainTime)).to.equal(true);
        });

        it('should call handleEvasion if the player is defensive, got damage and can still escape', async () => {
            combatManager.configureTimerEvents();
            isDefensiveVirtualPlayerStub.returns(true);
            await endCallback();
            expect(isDefensiveVirtualPlayerStub.calledOnce).to.equal(true);
            expect(handleEvasionStub.calledOnce).to.equal(true);
            expect(handleAttackStub.notCalled).to.equal(true);
        });

        it("should call handleAttack if the player isn't defensive or can't escape", async () => {
            combatManager.configureTimerEvents();
            isDefensiveVirtualPlayerStub.returns(false);
            await endCallback();
            expect(isDefensiveVirtualPlayerStub.calledOnce).to.equal(true);
            expect(handleAttackStub.calledOnce).to.equal(true);
            expect(handleEvasionStub.notCalled).to.equal(true);
        });

        it('should unsubscribe from the timers during resetAll', () => {
            const resetSpy = sinon.spy(Subscription.prototype, 'unsubscribe');
            combatManager.configureTimerEvents();
            combatManager.resetAll();
            expect(resetSpy.called).to.equal(true);
        });
    });

    describe('getTimerRound', () => {
        it('should return 2 if both attacker and defender are virtual players', () => {
            (combatManager['attackerManager'] as any).fighter.isVirtualPlayer = true;
            (combatManager['defenderManager'] as any).fighter.isVirtualPlayer = true;

            const result = combatManager['getTimerRound']();
            expect(result).to.equal(2);
        });

        it('should return TIME_PER_ROUND_WITH_NO_ESCAPE if attacker has no escape points left', () => {
            (combatManager['attackerManager'] as any).fighter.isVirtualPlayer = false;
            (combatManager['defenderManager'] as any).fighter.isVirtualPlayer = false;
            (combatManager['attackerManager'] as any).fighter.remainEscape = 0;

            const result = combatManager['getTimerRound']();

            expect(result).to.equal(TIME_PER_ROUND_WITH_NO_ESCAPE);
        });

        it('should return TIME_PER_ROUND if attacker has escape points left', () => {
            (combatManager['attackerManager'] as any).fighter.isVirtualPlayer = false;
            (combatManager['defenderManager'] as any).fighter.isVirtualPlayer = false;
            (combatManager['attackerManager'] as any).fighter.remainEscape = 1;
            const result = combatManager['getTimerRound']();
            expect(result).to.equal(TIME_PER_ROUND);
        });
    });

    describe('isDefensiveVirtualPlayerWithDamageAndRemainEscape', () => {
        it('should return true if attacker is a defensive virtual player, has taken damage, and has escape points', () => {
            (combatManager['attackerManager'] as any).fighter = {
                isVirtualPlayer: true,
                virtualPlayerProfile: BotProfile.Defensive,
                hasTakenDamage: true,
                remainEscape: 1,
            } as Fighter;
            const result = combatManager['isDefensiveVirtualPlayerWithDamageAndRemainEscape']();
            expect(result).to.equal(true);
        });

        it('should return false if attacker is not a virtual player', () => {
            (combatManager['attackerManager'] as any).fighter = {
                isVirtualPlayer: false,
                virtualPlayerProfile: 'Defensive',
                hasTakenDamage: true,
                remainEscape: 1,
            } as any;
            const result = combatManager['isDefensiveVirtualPlayerWithDamageAndRemainEscape']();
            expect(result).to.equal(false);
        });

        it('should return false if attacker is not defensive', () => {
            (combatManager['attackerManager'] as any).fighter = {
                isVirtualPlayer: true,
                virtualPlayerProfile: 'Aggressive',
                hasTakenDamage: true,
                remainEscape: 1,
            } as any;
            const result = combatManager['isDefensiveVirtualPlayerWithDamageAndRemainEscape']();
            expect(result).to.equal(false);
        });

        it('should return false if attacker has not taken damage', () => {
            (combatManager['attackerManager'] as any).fighter = {
                isVirtualPlayer: true,
                virtualPlayerProfile: 'Defensive',
                hasTakenDamage: false,
                remainEscape: 1,
            } as any;
            const result = combatManager['isDefensiveVirtualPlayerWithDamageAndRemainEscape']();
            expect(result).to.equal(false);
        });

        it('should return false if attacker has no escape points', () => {
            (combatManager['attackerManager'] as any).fighter = {
                isVirtualPlayer: true,
                virtualPlayerProfile: 'Defensive',
                hasTakenDamage: true,
                remainEscape: 0,
            } as any;
            const result = combatManager['isDefensiveVirtualPlayerWithDamageAndRemainEscape']();
            expect(result).to.equal(false);
        });
    });

    describe('isNeededToSendEndFightToBot', () => {
        it('should return true if winnerId is null, initiator is a virtual player, and it is not the end of the turn', () => {
            combatManager['initiator'] = { isVirtualPlayer: true } as any;
            combatManager['isTurnOver'] = false;
            const result = combatManager['isNeededToSendEndFightToBot'](null);
            expect(result).to.equal(true);
        });

        it('should return false if winnerId is null and it is the end of the turn', () => {
            combatManager['initiator'] = { isVirtualPlayer: true } as any;
            combatManager['isTurnOver'] = true;
            const result = combatManager['isNeededToSendEndFightToBot'](null);
            expect(result).to.equal(false);
        });

        it('should return true if winnerId is equal to initiator ID, initiator is a virtual player, and it is not the end of the round', () => {
            combatManager['initiator'] = { pid: 'winnerId', isVirtualPlayer: true } as any;
            sinon.stub(combatManager as any, 'shouldEndRound').returns(false);
            const result = combatManager['isNeededToSendEndFightToBot']('winnerId');
            expect(result).to.equal(true);
        });

        it('should return false if winnerId is equal to initiator ID but it is the end of the round', () => {
            combatManager['initiator'] = { pid: 'winnerId', isVirtualPlayer: true } as any;
            sinon.stub(combatManager as any, 'shouldEndRound').returns(true);
            const result = combatManager['isNeededToSendEndFightToBot']('winnerId');
            expect(result).to.equal(false);
        });

        it('should return false if winnerId is not equal to initiator ID', () => {
            combatManager['initiator'] = { pid: 'initiatorId', isVirtualPlayer: true } as any;
            const result = combatManager['isNeededToSendEndFightToBot']('winnerId');
            expect(result).to.equal(false);
        });

        it('should return false if initiator is not a virtual player', () => {
            combatManager['initiator'] = { pid: 'winnerId', isVirtualPlayer: false } as any;
            const result = combatManager['isNeededToSendEndFightToBot']('winnerId');
            expect(result).to.equal(false);
        });
    });
});
