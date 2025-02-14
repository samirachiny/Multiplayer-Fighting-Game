import { Party } from '@common/interfaces/party';
import { MIN_ACCESS_CODE, MAX_ACCESS_CODE_RANGE } from '@app/utils/const';
import { PlayerInfos } from '@common/interfaces/player-infos';
import * as io from 'socket.io';
import { LogTypeEvent } from '@common/enums/log-type';
import { GameLogs } from '@common/interfaces/game-logs';
import { calculateDurationInSeconds, convertToTimestamp, formatDuration } from '@app/utils/helper';
import { WsEventClient } from '@common/enums/web-socket-event';

export class PartyHelper {
    private static sio: io.Server;

    static init(sio: io.Server) {
        this.sio = sio;
    }

    static generateValidAccessCode(parties: Party[]): number {
        let code: number;
        do {
            code = Math.floor(MIN_ACCESS_CODE + Math.random() * MAX_ACCESS_CODE_RANGE);
        } while (parties.some((party) => party.accessCode === code));
        return code;
    }

    static generateValidName(initialName: string, players: PlayerInfos[]): string {
        let existName: PlayerInfos = players.find((playerItem) => playerItem.name === initialName);
        let count = 2;
        let name = initialName;
        while (existName) {
            name = `${initialName}-${count}`;
            existName = players.find((playerItem) => playerItem.name === name);
            count++;
        }
        return name;
    }

    static getPartyId(socket: io.Socket): string {
        return Array.from(socket.rooms).at(1);
    }

    static isInParty(socket: io.Socket): boolean {
        return socket.rooms.size > 1;
    }

    static isOrganizer(socket: io.Socket): boolean {
        return PartyHelper.getPartyId(socket)?.startsWith(socket.id);
    }

    static getPartyDuration(logs: GameLogs[]): string {
        const beginLog = logs.find((log) => log.type === LogTypeEvent.BeginParty);
        const endLog = logs.find((log) => log.type === LogTypeEvent.EndGame);
        if (!(beginLog && endLog)) return '0';
        const startTime = convertToTimestamp(beginLog.time);
        const endTime = convertToTimestamp(endLog.time);
        return formatDuration(calculateDurationInSeconds(startTime, endTime));
    }

    static sendEvent<T>(roomId: string, event: WsEventClient, data?: T, excludeRoomId?: string): void {
        if (excludeRoomId) {
            this.sio.to(roomId).except(excludeRoomId).emit(event, data);
            return;
        }
        this.sio.to(roomId).emit(event, data);
    }

    static removePlayerFromParty(playerId: string, partyId: string): void {
        this.sio.in(playerId).socketsLeave(partyId);
    }

    static disconnectSocketsFromParty(partyId: string) {
        this.sio.socketsLeave(partyId);
    }
}
