import { Fighter } from '@common/interfaces/player-infos';
import { FighterManager } from '@app/classes/fighter-manager/fighter-manager';
import { Timer } from '@app/classes/timer/timer';
import { WsEventClient } from '@common/enums/web-socket-event';
import { FightParticipants } from '@common/interfaces/fight-participants';
import {
    DICE_ROLL_RESULT_TIME,
    TIME_PER_ROUND,
    TIME_PER_ROUND_WITH_NO_ESCAPE,
    TIME_BEFORE_END_BATTLE,
    TIME_HANDLE_EVASION,
    TIME_HANDLE_ATTACK,
} from '@app/utils/const';
import { PartyService } from '@app/services/party/party.service';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { DiceRollBonus } from '@common/interfaces/dice';
import { Observable, Subject, Subscription } from 'rxjs';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { LogTypeEvent } from '@common/enums/log-type';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { Container } from 'typedi';
import { GameEventType } from '@common/enums/game-event-type';
import { delay } from '@app/utils/helper';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { EndFightEvent } from '@common/types/end-fight-event';
import { CombatManagerUtilities } from '@app/classes/combat-manager-utilities/combat-manager-utilities';

export class CombatManager {
    readonly endFightEvent$: Observable<EndFightEvent>;
    private initiator: Fighter;
    private target: Fighter;
    private attackerManager: FighterManager;
    private defenderManager: FighterManager;
    private combatManagerUtilities: CombatManagerUtilities;
    private fightingTimer: Timer;
    private updateTimer: Subscription;
    private endTimer: Subscription;
    private isTurnOver: boolean;
    private endFightEvent: Subject<EndFightEvent>;
    private partyService: PartyService = Container.get(PartyService);

    constructor(
        private partyId: string,
        private respawnManager: RespawnManager,
        private turnManger: TurnManager,
    ) {
        this.combatManagerUtilities = new CombatManagerUtilities(partyId);
        this.endFightEvent = new Subject<EndFightEvent>();
        this.endFightEvent$ = this.endFightEvent.asObservable();
        this.attackerManager = new FighterManager();
        this.defenderManager = new FighterManager();
        this.fightingTimer = new Timer(TIME_PER_ROUND);
    }

    initFight(initiator: Fighter, target: Fighter, isTurnOver: boolean) {
        this.isTurnOver = isTurnOver;
        this.setFighters(initiator, target);
        this.combatManagerUtilities.sendGameEvent(GameEventType.BeginFight, initiator.pid, target.pid);
        PartyHelper.sendEvent(this.partyId, WsEventClient.FightInit, this.getFighters());
        this.fightingTimer.setDuration(this.getTimerRound());
        this.startTimer();
        this.configureTimerEvents();
    }

    resetAll() {
        if (this.updateTimer) this.updateTimer.unsubscribe();
        if (this.endTimer) this.endTimer.unsubscribe();
    }

    startTimer() {
        this.fightingTimer.resetRemainingTime();
        this.fightingTimer.start();
    }

    stopTimer() {
        this.fightingTimer.stop();
    }

    configureTimerEvents() {
        this.updateTimer = this.fightingTimer.updateTime$.subscribe((remainTime: number) => {
            PartyHelper.sendEvent(this.partyId, WsEventClient.UpdateRemainFightingTime, remainTime);
        });

        this.endTimer = this.fightingTimer.end$.subscribe(async () => {
            if (this.isDefensiveVirtualPlayerWithDamageAndRemainEscape()) {
                await this.handleEvasion();
                return;
            }
            await this.handleAttack();
        });
    }

    setFighters(initiator: Fighter, target: Fighter): void {
        this.assignFighters(initiator, target);
        const [fasterPlayer, slowerPlayer] = this.combatManagerUtilities.orderPlayersBySpeed(initiator, target);
        this.assignRoles(fasterPlayer, slowerPlayer);
    }

    getFighters(): FightParticipants {
        return { attacker: this.attackerManager.fighter, defender: this.defenderManager.fighter };
    }

    async handleAttack() {
        this.stopTimer();
        await this.executeAttackSequence();
        if (await this.isBattleEnd()) return;
        this.updateAttacker();
    }

    async handleEvasion() {
        if (this.isEscapeAttemptsExhausted()) {
            this.updateAttacker();
            return;
        }
        this.stopTimer();
        if (this.attackerManager.hasEscapeSuccessful()) {
            await this.handleSuccessfulEscape();
            return;
        }
        await this.handleFailedEscape();
    }

    async handleGiveUp(loserId: string) {
        this.stopTimer();
        const winnerId: string = this.getWinnerId(loserId);
        this.handleWinCount(winnerId);
        this.combatManagerUtilities.sendGameEvent(GameEventType.PlayerVictory, winnerId, loserId);
        this.combatManagerUtilities.sendEndFightLog(winnerId, loserId);
        PartyHelper.sendEvent(this.partyId, WsEventClient.FighterGiveUp);
        this.endFightEvent.next({ winnerId, sendEndFightToBot: this.isNeededToSendEndFightToBot(winnerId) });
        await delay(TIME_BEFORE_END_BATTLE);
        PartyHelper.sendEvent(this.partyId, WsEventClient.FightTerminated);
        if (this.shouldEndRound(winnerId)) this.turnManger.endRound(this.initiator.pid);
        this.turnManger.resumeTurnTimer();
        this.resetAll();
    }

    private getWinnerId(loserId: string): string {
        return loserId === this.attackerManager.pid ? this.defenderManager.pid : this.attackerManager.pid;
    }

    private getTimerRound(): number {
        if (this.attackerManager.isVirtualPlayer && this.defenderManager.isVirtualPlayer) return 2;
        return this.attackerManager.remainEscape === 0 ? TIME_PER_ROUND_WITH_NO_ESCAPE : TIME_PER_ROUND;
    }

    private updateAttacker() {
        this.swapRoles();
        PartyHelper.sendEvent(this.partyId, WsEventClient.UpdateCurrentAttacker, this.attackerManager.pid);
        this.fightingTimer.setDuration(this.getTimerRound());
        this.fightingTimer.reset();
    }

    private async executeAttackSequence(): Promise<void> {
        const { attackDiceRollResult, defenseDiceRollResult } = this.calculateDiceValues();
        this.sendRollDiceResult(attackDiceRollResult, defenseDiceRollResult);
        this.handleBonusAttributionWithDiceLogs(attackDiceRollResult, defenseDiceRollResult);
        await delay(DICE_ROLL_RESULT_TIME);
        if (this.isAttackSuccessful(attackDiceRollResult, defenseDiceRollResult)) {
            await this.handleAttackSuccessful();
            return;
        }
        this.manageFightLogs(0);
        PartyHelper.sendEvent(this.partyId, WsEventClient.AttackFailed);
        await delay(TIME_HANDLE_ATTACK);
    }

    private calculateDiceValues(): DiceRollBonus {
        if (this.partyService.isDebugMode(this.partyId))
            return { attackDiceRollResult: this.attackerManager.getMaxAttackRoll(), defenseDiceRollResult: this.defenderManager.getMinDefenseRoll() };
        return { attackDiceRollResult: this.attackerManager.attackRoll(), defenseDiceRollResult: this.defenderManager.defenseRoll() };
    }

    private handleBonusAttributionWithDiceLogs(attackBonus: number, defenseBonus: number): void {
        const players: FightParticipants = this.getFighters();
        this.combatManagerUtilities.sendDiceBonusLog(LogTypeEvent.ComputeDiceAttackBonus, attackBonus, players.attacker.attack, this.getFighterIds());
        this.combatManagerUtilities.sendDiceBonusLog(
            LogTypeEvent.ComputeDiceDefenseBonus,
            defenseBonus,
            players.defender.defense,
            this.getFighterIds(true),
        );
    }

    private async handleAttackSuccessful() {
        this.manageFightLogs(1);
        this.defenderManager.takeDamage();
        PartyHelper.sendEvent(this.partyId, WsEventClient.AttackPassed);
        PartyHelper.sendEvent(this.partyId, WsEventClient.DecrementFighterLife);
        this.combatManagerUtilities.sendGameEvent(GameEventType.LifePointDamage, this.attackerManager.pid, this.defenderManager.pid);
        await delay(TIME_HANDLE_ATTACK / 2);
        if (this.defenderManager.handleSwapOpponentLife(this.attackerManager.fighter))
            PartyHelper.sendEvent(this.partyId, WsEventClient.SwapFightersLives);
        if (this.defenderManager.handleSecondLife()) PartyHelper.sendEvent(this.partyId, WsEventClient.AddDefenderLife);
        await delay(TIME_HANDLE_ATTACK / 2);
    }

    private manageFightLogs(damage: number): void {
        this.combatManagerUtilities.sendFightLog(LogTypeEvent.AttackTo, damage, [this.getFighters().attacker.pid, this.getFighters().defender.pid]);
        this.combatManagerUtilities.sendFightLog(LogTypeEvent.DefenseFrom, damage <= 0, [
            this.getFighters().defender.pid,
            this.getFighters().attacker.pid,
        ]);
    }

    private isAttackSuccessful(attackDiceRollResult: number, defenseDiceRollResult: number): boolean {
        return this.attackerManager.fighter.attack + attackDiceRollResult > this.defenderManager.fighter.defense + defenseDiceRollResult;
    }

    private async isBattleEnd(): Promise<boolean> {
        if (this.defenderManager.isDead()) {
            await this.terminateFight();
            return true;
        }
        return false;
    }

    private async terminateFight() {
        await delay(TIME_BEFORE_END_BATTLE);
        this.handleWinCount(this.attackerManager.pid);
        this.combatManagerUtilities.sendGameEvent(GameEventType.PlayerVictory, this.attackerManager.pid, this.defenderManager.pid);
        this.combatManagerUtilities.sendEndFightLog(this.attackerManager.pid, this.defenderManager.pid);
        if (this.partyService.hasPartyDecreaseLoserWins(this.partyId)) this.handleWinCount(this.defenderManager.pid, -1);
        this.respawnManager.replacePlayer(this.defenderManager.pid);
        PartyHelper.sendEvent(this.partyId, WsEventClient.FightTerminated);
        this.endFightEvent.next({
            winnerId: this.attackerManager.pid,
            sendEndFightToBot: this.isNeededToSendEndFightToBot(this.attackerManager.pid),
        });
        if (this.shouldEndRound(this.attackerManager.pid)) this.turnManger.endRound(this.initiator.pid);
        this.turnManger.resumeTurnTimer();
        this.resetAll();
    }

    private handleWinCount(fighterId: string, amount: number = 1): void {
        this.partyService.addToWinCount(this.partyId, fighterId, amount);
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerListUpdated, this.partyService.getOrderPlayers(this.partyId));
    }

    private shouldEndRound(winnerId: string): boolean {
        return winnerId !== this.initiator.pid || this.isTurnOver;
    }

    private async handleSuccessfulEscape(): Promise<void> {
        this.combatManagerUtilities.sendGameEvent(GameEventType.EscapeAttempt, this.attackerManager.pid);
        PartyHelper.sendEvent(this.partyId, WsEventClient.EscapePassed);
        this.combatManagerUtilities.sendEscapeLog(this.getFighterIds(), true);
        await delay(TIME_HANDLE_EVASION);
        this.terminateFightWithoutWinner();
    }

    private async handleFailedEscape(): Promise<void> {
        this.attackerManager.fighter.remainEscape--;
        PartyHelper.sendEvent(this.partyId, WsEventClient.EscapeFailed);
        this.combatManagerUtilities.sendEscapeLog(this.getFighterIds(), false);
        await delay(TIME_HANDLE_EVASION);
        this.updateAttacker();
    }

    private isEscapeAttemptsExhausted(): boolean {
        return this.attackerManager.fighter.remainEscape === 0;
    }

    private terminateFightWithoutWinner(): void {
        PartyHelper.sendEvent(this.partyId, WsEventClient.FightTerminated);
        this.endFightEvent.next({ winnerId: null, sendEndFightToBot: this.isNeededToSendEndFightToBot(null) });
        this.combatManagerUtilities.sendEndFightWithoutWinnerLog(this.getFighterIds());
        this.turnManger.resumeTurnTimer();
        if (this.isTurnOver) this.turnManger.endRound(this.initiator.pid);
        this.resetAll();
    }

    private assignFighters(initiator: Fighter, target: Fighter): void {
        this.initiator = initiator;
        this.target = target;
    }

    private assignRoles(firstPlayer: Fighter, secondPlayer: Fighter): void {
        this.attackerManager.setFighter(firstPlayer);
        this.defenderManager.setFighter(secondPlayer);
    }

    private isAttacking(fighter: Fighter): boolean {
        return this.attackerManager.pid === fighter.pid;
    }

    private swapRoles(): void {
        if (this.isAttacking(this.initiator)) this.assignRoles(this.target, this.initiator);
        else this.assignRoles(this.initiator, this.target);
    }

    private getFighterIds(reverse: boolean = false): string[] {
        const fighters: FightParticipants = this.getFighters();
        return reverse ? [fighters.defender.pid, fighters.attacker.pid] : [fighters.attacker.pid, fighters.defender.pid];
    }

    private sendRollDiceResult(attackDiceRollResult: number, defenseDiceRollResult: number) {
        this.combatManagerUtilities.sendRollDiceResult(this.attackerManager, attackDiceRollResult, true);
        this.combatManagerUtilities.sendRollDiceResult(this.defenderManager, defenseDiceRollResult, false);
    }

    private isDefensiveVirtualPlayerWithDamageAndRemainEscape(): boolean {
        const fighter = this.attackerManager.fighter;
        return fighter.isVirtualPlayer && fighter.virtualPlayerProfile === BotProfile.Defensive && fighter.hasTakenDamage && fighter.remainEscape > 0;
    }

    private isNeededToSendEndFightToBot(winnerId: string): boolean {
        if (!winnerId) return this.initiator.isVirtualPlayer && !this.isTurnOver;
        const isInitiatorWon = this.initiator.pid === winnerId;
        return this.initiator.isVirtualPlayer && isInitiatorWon && !this.shouldEndRound(winnerId);
    }
}
