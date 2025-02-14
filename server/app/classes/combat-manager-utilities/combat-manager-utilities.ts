import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { GameEventType } from '@common/enums/game-event-type';
import { LogTypeEvent } from '@common/enums/log-type';
import { SendingOptions } from '@common/enums/sending-options';
import { Container } from 'typedi';
import { FighterManager } from '@app/classes/fighter-manager/fighter-manager';
import { WsEventClient } from '@common/enums/web-socket-event';
import { DiceRollResult } from '@common/interfaces/dice';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { Fighter } from '@common/interfaces/player-infos';

export class CombatManagerUtilities {
    private partyListener: PartyEventListener;

    constructor(private partyId: string) {
        this.partyListener = Container.get(PartyEventListener);
    }

    sendGameEvent(eventType: GameEventType, attackerPid: string, defenderPid?: string): void {
        const eventPayload = { partyId: this.partyId, attackerPid, defenderPid };
        this.partyListener.emit(eventType, eventPayload);
    }

    sendEndFightWithoutWinnerLog(playerIds: string[]) {
        this.emitLogEvent(LogTypeEvent.EndFightWithoutWinner, { playerIds }, SendingOptions.Broadcast);
    }

    sendFightLog<T>(fightLogEvent: LogTypeEvent, moreInfos: T, playerIds: string[]): void {
        this.emitLogEvent(fightLogEvent, { playerIds, moreInfos }, SendingOptions.Unicast);
    }

    sendEndFightLog(winnerId: string, loserId: string): void {
        this.emitLogEvent(LogTypeEvent.EndFight, { playerIds: [winnerId, loserId] }, SendingOptions.Broadcast);
    }

    sendDiceBonusLog(diceEvent: LogTypeEvent, bonus: number, target: number, playerIds: string[]): void {
        this.emitLogEvent(diceEvent, { playerIds, moreInfos: { faceNumber: bonus, targetToApply: target } }, SendingOptions.Unicast);
    }

    sendEscapeLog(playerIds: string[], isSuccess: boolean) {
        this.emitLogEvent(LogTypeEvent.EscapeFrom, { playerIds, moreInfos: isSuccess }, SendingOptions.Unicast);
    }

    sendRollDiceResult(fighterManager: FighterManager, diceRollResult: number, isAttackDice: boolean) {
        PartyHelper.sendEvent<DiceRollResult>(this.partyId, WsEventClient.RollDiceResult, {
            pid: fighterManager.pid,
            type: isAttackDice ? fighterManager.attackDice : fighterManager.defenseDice,
            result: diceRollResult,
        });
    }

    orderPlayersBySpeed(initiator: Fighter, target: Fighter): [Fighter, Fighter] {
        if (initiator.speed >= target.speed) return [initiator, target];
        return [target, initiator];
    }

    private emitLogEvent<T>(eventType: LogTypeEvent, logParameters: { playerIds: string[]; moreInfos?: T }, options: SendingOptions): void {
        this.partyListener.emit(eventType, {
            partyId: this.partyId,
            logParameters: { event: eventType, ...logParameters },
            options,
        });
    }
}
