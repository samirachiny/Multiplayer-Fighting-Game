import { Component, Input, OnDestroy } from '@angular/core';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { DiceComponent } from '@app/components/dice/dice.component';
import { Fighter } from '@common/interfaces/player-infos';
import { NgClass } from '@angular/common';
import { DiceRollResult } from '@common/interfaces/dice';
import { Router } from '@angular/router';
import { UrlPath } from '@app/enums/url-path';
import { MatRipple } from '@angular/material/core';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DELAY_TO_SHOW_DAMAGE, FIGHT_MESSAGES, SNACK_BAR_PROPERTIES_SET_UP, STAT_BONUS } from '@app/constants/consts';

@Component({
    selector: 'app-fight-view',
    standalone: true,
    imports: [DiceComponent, NgClass, MatRipple],
    templateUrl: './fight-view.component.html',
    styleUrl: './fight-view.component.scss',
})
export class FightViewComponent implements OnDestroy {
    @Input() playerId: string;
    myFighter: Fighter;
    opponentFighter: Fighter;
    myDiceRollResult: DiceRollResult;
    opponentDiceRollResult: DiceRollResult;
    isAttacker: boolean;
    isActionCompleted: boolean;
    remainTime: number;
    isLoading: boolean;
    showResult: boolean;
    isAttackSuccessful: boolean;

    constructor(
        private socketClientService: SocketClientService,
        private router: Router,
        private snackBar: MatSnackBar,
    ) {
        this.isLoading = true;
        this.showResult = false;
        this.initializeFight();
        this.setupSocketListeners();
    }

    ngOnDestroy(): void {
        this.removeSocketListeners();
    }

    onAttack() {
        if (!this.isActionCompleted) {
            this.executeAction(WsEventServer.Attack);
        }
    }

    onEscape() {
        if (!this.isActionCompleted) {
            this.executeAction(WsEventServer.Escape);
        }
    }

    onGiveUp() {
        if (!this.isActionCompleted) {
            this.executeAction(WsEventServer.FightingGiveUp);
            this.router.navigate([UrlPath.Home]);
        }
    }

    private initializeFight(): void {
        this.socketClientService.send(WsEventServer.GetFighters, (data: FightParticipants) => {
            const isAttacker = this.playerId === data.attacker.pid;
            this.myFighter = isAttacker ? data.attacker : data.defender;
            this.opponentFighter = isAttacker ? data.defender : data.attacker;
            this.isAttacker = isAttacker;
            this.isLoading = false;
            this.showFightInformation(this.isAttacker ? FIGHT_MESSAGES.turnStarted() : FIGHT_MESSAGES.opponentTurnStarted(this.opponentFighter.name));
        });
    }

    private setupSocketListeners(): void {
        this.socketClientService.on(WsEventClient.UpdateRemainFightingTime, (remainTime: number) => this.updateRemainFightingTime(remainTime));
        this.socketClientService.on(WsEventClient.UpdateCurrentAttacker, (playerId: string) => this.updateCurrentAttacker(playerId));
        this.socketClientService.on(WsEventClient.RollDiceResult, (diceRollResult: DiceRollResult) => this.rollDiceResult(diceRollResult));
        this.socketClientService.on(WsEventClient.AttackPassed, () => this.handleAttack(true));
        this.socketClientService.on(WsEventClient.AttackFailed, () => this.handleAttack(false));
        this.socketClientService.on(WsEventClient.DecrementFighterLife, () => this.decrementFighterLife());
        this.socketClientService.on(WsEventClient.EscapeFailed, () => this.handleEscape(false));
        this.socketClientService.on(WsEventClient.EscapePassed, () => this.handleEscape(true));
        this.socketClientService.on(WsEventClient.FighterGiveUp, () => this.fighterGiverUp());
        this.socketClientService.on(WsEventClient.AddDefenderLife, () => this.addDefenderFighterLife());
        this.socketClientService.on(WsEventClient.SwapFightersLives, () => this.swapFightersLives());
    }
    private addDefenderFighterLife(): void {
        if (this.isAttacker) {
            this.opponentFighter.life += STAT_BONUS;
            this.opponentFighter.hasSecondChanceEffect = false;
            return;
        }
        this.myFighter.life += STAT_BONUS;
        this.myFighter.hasSecondChanceEffect = false;
    }
    private swapFightersLives(): void {
        const tempLife = this.opponentFighter.life;
        this.opponentFighter.life = this.myFighter.life;
        this.myFighter.life = tempLife;
        this.myFighter.hasSwapOpponentLifeEffect = false;
        this.opponentFighter.hasSwapOpponentLifeEffect = false;
    }

    private removeSocketListeners(): void {
        this.socketClientService.off(WsEventClient.UpdateRemainFightingTime);
        this.socketClientService.off(WsEventClient.UpdateCurrentAttacker);
        this.socketClientService.off(WsEventClient.DecrementFighterLife);
        this.socketClientService.off(WsEventClient.AttackFailed);
        this.socketClientService.off(WsEventClient.AttackPassed);
        this.socketClientService.off(WsEventClient.RollDiceResult);
        this.socketClientService.off(WsEventClient.EscapeFailed);
        this.socketClientService.off(WsEventClient.EscapePassed);
        this.socketClientService.off(WsEventClient.FighterGiveUp);
        this.socketClientService.off(WsEventClient.AddDefenderLife);
        this.socketClientService.off(WsEventClient.SwapFightersLives);
    }

    private updateRemainFightingTime(remainTime: number): void {
        this.remainTime = remainTime;
    }

    private updateCurrentAttacker(playerId: string): void {
        this.isActionCompleted = false;
        this.showResult = false;
        this.isAttacker = this.playerId === playerId;
        this.showFightInformation(this.isAttacker ? FIGHT_MESSAGES.turnStarted() : FIGHT_MESSAGES.opponentTurnStarted(this.opponentFighter.name));
    }

    private decrementFighterLife(): void {
        const fighter = this.isAttacker ? this.opponentFighter : this.myFighter;
        fighter.life--;
        if (fighter.life !== 0) return;
        this.showFightInformation(this.isAttacker ? FIGHT_MESSAGES.youWon() : FIGHT_MESSAGES.youLost());
    }

    private rollDiceResult(diceRollResult: DiceRollResult): void {
        if (diceRollResult.pid === this.playerId) this.myDiceRollResult = diceRollResult;
        else this.opponentDiceRollResult = diceRollResult;
        this.showResult = true;
    }

    private handleAttack(isSuccessful: boolean) {
        this.isAttackSuccessful = isSuccessful;
        setTimeout(() => {
            this.isAttackSuccessful = false;
        }, DELAY_TO_SHOW_DAMAGE);
        if (isSuccessful) {
            this.showFightInformation(
                this.isAttacker ? FIGHT_MESSAGES.attackSuccessful() : FIGHT_MESSAGES.opponentAttackSuccessful(this.opponentFighter.name),
            );
            return;
        }
        this.showFightInformation(this.isAttacker ? FIGHT_MESSAGES.attackFailed() : FIGHT_MESSAGES.opponentAttackFailed(this.opponentFighter.name));
    }

    private handleEscape(isSuccessful: boolean): void {
        if (isSuccessful) {
            this.showFightInformation(
                this.isAttacker ? FIGHT_MESSAGES.escapeSuccessful() : FIGHT_MESSAGES.opponentEscapeSuccessful(this.opponentFighter.name),
            );
            return;
        }
        if (this.isAttacker) {
            this.myFighter.remainEscape--;
        }
        this.showFightInformation(this.isAttacker ? FIGHT_MESSAGES.escapeFailed() : FIGHT_MESSAGES.opponentEscapeFailed(this.opponentFighter.name));
    }

    private fighterGiverUp(): void {
        this.showFightInformation(FIGHT_MESSAGES.opponentGaveUp(this.opponentFighter.name));
    }

    private executeAction(event: WsEventServer): void {
        this.socketClientService.send(event);
        this.isActionCompleted = true;
    }

    private showFightInformation(message: string): void {
        this.snackBar.openFromComponent(SnackBarComponent, {
            data: { message },
            ...SNACK_BAR_PROPERTIES_SET_UP,
        });
    }
}
