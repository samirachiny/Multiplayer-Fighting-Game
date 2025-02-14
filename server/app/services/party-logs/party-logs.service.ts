import { GameLogs } from '@common/interfaces/game-logs';
import { LogMessageFunction } from '@common/types/log-message-template';
import { Service } from 'typedi';
import { WsEventClient } from '@common/enums/web-socket-event';
import { LogParameter } from '@common/interfaces/log-parameter';
import { PartyService } from '@app/services/party/party.service';
import { LOGS_MESSAGES } from '@app/utils/const';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { SendingOptions } from '@common/enums/sending-options';
@Service()
export class PartyLogService {
    constructor(private partyService: PartyService) {}

    getGameLogs(partyId: string, playerId: string): GameLogs[] {
        return this.partyService.getLogs(partyId, playerId);
    }

    addLog(partyId: string, logParameter: LogParameter, options?: SendingOptions): void {
        this.buildLogParameter(partyId, logParameter, logParameter.playerIds);
        this.updateGameLogs(partyId, logParameter, options);
    }

    private updateGameLogs(partyId: string, logParameter: LogParameter, options: SendingOptions): void {
        const gameLog: GameLogs = this.buildLogMessage(logParameter);
        if (logParameter.playerIds) gameLog.playerIds = logParameter.playerIds;
        this.partyService.addLog(partyId, gameLog);
        if (options === SendingOptions.Broadcast) {
            this.sendEventToAll(partyId, gameLog);
            return;
        }
        this.sendEventToIndividualPlayers(logParameter.playerIds, gameLog);
    }

    private buildLogParameter(partyId: string, logParameter: LogParameter, playerIds?: string[]): void {
        if (playerIds) {
            logParameter.players = playerIds.map((playerId: string) => this.partyService.getPlayer(partyId, playerId)?.name);
        }
    }

    private sendEventToAll(partyId: string, logs: GameLogs): void {
        PartyHelper.sendEvent(partyId, WsEventClient.NewPartyLog, logs);
    }

    private sendEventToIndividualPlayers(playerIds: string[], logs: GameLogs): void {
        playerIds.forEach((playerId: string) => {
            PartyHelper.sendEvent(playerId, WsEventClient.NewPartyLog, logs);
        });
    }

    private buildLogMessage(logParameter: LogParameter): GameLogs {
        const logMessageFunc: LogMessageFunction = LOGS_MESSAGES[logParameter.event];
        const message: string = this.generateLogMessage(logMessageFunc, logParameter);
        return { time: new Date(), message, type: logParameter.event };
    }

    private generateLogMessage(logMessageFunc: LogMessageFunction, logParameter: LogParameter): string {
        if (logParameter.players && logParameter.moreInfos) return logMessageFunc(logParameter.players, logParameter.moreInfos);
        if (logParameter.players) return logMessageFunc(logParameter.players);
        return logMessageFunc();
    }
}
