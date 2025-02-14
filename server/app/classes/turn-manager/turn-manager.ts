import { Timer } from '@app/classes/timer/timer';
import { PartyService } from '@app/services/party/party.service';
import { LogTypeEvent } from '@common/enums/log-type';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient } from '@common/enums/web-socket-event';
import { Observable, Subject, Subscription } from 'rxjs';
import { COUNTDOWN_TIME, ROUND_TIME } from '@app/utils/const';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { GameEventType } from '@common/enums/game-event-type';
import { SendingOptions } from '@common/enums/sending-options';
import { Container } from 'typedi';

export class TurnManager {
    readonly isVirtualPlayer$: Observable<string>;
    private partyService: PartyService;
    private partyListener: PartyEventListener;
    private players: PlayerInfos[];
    private currentPlayerIndex: number;
    private timer: Timer;
    private countdown: Timer;
    private subscriptions: Subscription;
    private isVirtualPlayer: Subject<string>;

    constructor(private partyId: string) {
        this.partyService = Container.get(PartyService);
        this.partyListener = Container.get(PartyEventListener);
        this.currentPlayerIndex = 0;
        this.players = this.partyService.getOrderPlayers(this.partyId);
        this.setPlayerCurrentState(this.players[this.currentPlayerIndex], true);
        this.timer = new Timer(ROUND_TIME);
        this.countdown = new Timer(COUNTDOWN_TIME);
        this.subscriptions = new Subscription();
        this.isVirtualPlayer = new Subject<string>();
        this.isVirtualPlayer$ = this.isVirtualPlayer.asObservable();
    }

    get currentPlayerPid(): string {
        return this.players[this.currentPlayerIndex].pid;
    }

    get currentPlayerName(): string {
        return this.players[this.currentPlayerIndex].name;
    }

    get isCurrentVirtualPlayer(): boolean {
        return this.players[this.currentPlayerIndex].isVirtualPlayer;
    }
    initializeTurnCycle(): void {
        PartyHelper.sendEvent(this.partyId, WsEventClient.CountdownStart);
        this.countdown.start();
        this.subscribeToCountdownEvents();
        this.subscribeToTimerEvents();
    }

    destroyTurnCycle(): void {
        this.subscriptions.unsubscribe();
        this.timer.stop();
        this.countdown.stop();
        this.isVirtualPlayer.unsubscribe();
    }

    pauseTurnTimer(isFighting: boolean = true): void {
        this.timer.stop();
        const event = isFighting ? WsEventClient.TimerPauseForFight : WsEventClient.TimerPauseForChoosingItem;
        PartyHelper.sendEvent(this.partyId, event);
    }

    resumeTurnTimer(): void {
        this.timer.start();
        PartyHelper.sendEvent(this.partyId, WsEventClient.TimerResume);
    }

    endRound(playerId: string): void {
        this.timer.stop();
        this.partyListener.emit(GameEventType.RoundCount, { partyId: this.partyId });
        this.partyListener.emit(LogTypeEvent.EndTurn, {
            partyId: this.partyId,
            logParameters: { event: LogTypeEvent.EndTurn, playerIds: [this.currentPlayerPid] },
            options: SendingOptions.Broadcast,
        });
        this.partyService.resetAttributePlayer(this.partyId, playerId);
        this.updateCurrentPlayer();
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerListUpdated, this.players);
        PartyHelper.sendEvent(this.partyId, WsEventClient.CountdownStart, this.currentPlayerName);
        this.countdown.reset();
    }

    updateCurrentPlayer(): void {
        this.setPlayerCurrentState(this.players[this.currentPlayerIndex], false);
        this.partyService.resetAttributePlayer(this.partyId, this.currentPlayerPid);
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        while (this.players[this.currentPlayerIndex].isGiveUp) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        }
        this.setPlayerCurrentState(this.players[this.currentPlayerIndex], true);
    }

    isCurrentPlayer(playerId: string) {
        return this.currentPlayerPid === playerId;
    }

    private subscribeToCountdownEvents(): void {
        this.subscriptions.add(this.countdown.updateTime$.subscribe(this.handleCountdownUpdate.bind(this)));
        this.subscriptions.add(this.countdown.end$.subscribe(this.handleCountdownEnd.bind(this)));
    }

    private handleCountdownUpdate(timeBeforeStart: number): void {
        PartyHelper.sendEvent(this.partyId, WsEventClient.CountdownUpdate, timeBeforeStart);
    }

    private handleCountdownEnd(): void {
        PartyHelper.sendEvent(this.partyId, WsEventClient.CountdownEnd);
        this.partyListener.emit(LogTypeEvent.StartTurn, {
            partyId: this.partyId,
            logParameters: { event: LogTypeEvent.StartTurn, playerIds: [this.currentPlayerPid] },
            options: SendingOptions.Broadcast,
        });
        this.timer.reset();
        if (this.isCurrentVirtualPlayer) this.isVirtualPlayer.next(this.currentPlayerPid);
    }

    private subscribeToTimerEvents(): void {
        this.subscriptions.add(this.timer.updateTime$.subscribe(this.handleTimerUpdate.bind(this)));
        this.subscriptions.add(this.timer.end$.subscribe(this.handleTimerEnd.bind(this)));
    }

    private handleTimerUpdate(remainingTime: number): void {
        PartyHelper.sendEvent(this.partyId, WsEventClient.UpdateRemainTime, remainingTime);
        if (remainingTime === 1 && this.partyService.getParty(this.partyId).isChoosingItem) {
            this.pauseTurnTimer(false);
        }
    }

    private handleTimerEnd(): void {
        this.partyListener.emit(LogTypeEvent.EndTurn, {
            partyId: this.partyId,
            logParameters: { event: LogTypeEvent.EndTurn, playerIds: [this.currentPlayerPid] },
            options: SendingOptions.Broadcast,
        });
        this.partyListener.emit(GameEventType.RoundCount, { partyId: this.partyId });
        this.partyService.resetAttributePlayer(this.partyId, this.currentPlayerPid);
        this.updateCurrentPlayer();
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerListUpdated, this.players);
        PartyHelper.sendEvent(this.partyId, WsEventClient.CountdownStart);
        this.countdown.reset();
    }

    private setPlayerCurrentState(player: PlayerInfos, isCurrent: boolean): void {
        player.isCurrentPlayer = isCurrent;
        this.partyService.setCurrentPlayer(this.partyId, player.pid, isCurrent);
    }
}
