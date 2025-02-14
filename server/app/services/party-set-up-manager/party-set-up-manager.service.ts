import * as io from 'socket.io';
import { Service } from 'typedi';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient } from '@common/enums/web-socket-event';
import { ResponseAccessCode } from '@common/interfaces/response-code';
import { SetUpPartyParams } from '@common/interfaces/set-up-party-params';
import { PartyService } from '@app/services/party/party.service';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { MAP_SIZE_TO_MAX_PLAYERS } from '@common/constants/map-size-to-max-players';
import { CHARACTERS_OPTIONS_SIZE, GAME_NOT_AVAILABLE, VALIDATE_ACCESS_CODE_FEEDBACK } from '@app/utils/const';
import { Party } from '@common/interfaces/party';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';

@Service()
export class PartySetUpManagerService {
    constructor(
        private partyService: PartyService,
        private partyStatService: PartyStatisticsService,
    ) {}

    setUpPartyInfos(socket: io.Socket, callback: (data: SetUpPartyParams) => void) {
        const party = this.partyService.getParty(PartyHelper.getPartyId(socket));
        callback({
            players: this.partyService.getPlayers(party.id),
            player: this.partyService.getPlayer(party.id, socket.id),
            game: party.game,
            accessCode: party.accessCode,
            isLocked: party.isLocked,
            maxPlayers: MAP_SIZE_TO_MAX_PLAYERS[party.game.mapSize],
        });
    }

    joinParty(socket: io.Socket, player: PlayerInfos, callback: (isSuccessful: boolean) => void) {
        const partyId = PartyHelper.getPartyId(socket);
        player = { ...player, name: PartyHelper.generateValidName(player.name, this.partyService.getPlayers(partyId)) };
        if (!this.partyService.setPlayer(partyId, socket.id, player)) {
            return callback(false);
        }
        this.partyStatService.setPlayerStatistic(partyId, socket.id, player.name);
        if (this.partyService.isPartyFull(partyId)) {
            this.partyService.setLock(partyId, true);
            PartyHelper.sendEvent(partyId, WsEventClient.PartyFull, true, socket.id);
        }
        PartyHelper.sendEvent(partyId, WsEventClient.AllPlayers, this.partyService.getPlayers(partyId));
        callback(true);
    }

    leaveParty(socket: io.Socket, playerId: string, isEjection: boolean = false) {
        const partyId = PartyHelper.getPartyId(socket);
        const player = this.partyService.getPlayer(partyId, playerId);
        const wasPartyFull = this.partyService.isPartyFull(partyId);
        if (this.partyService.removePlayer(partyId, playerId)) {
            this.partyStatService.deletePlayerStatistic(partyId, playerId);
            this.handlePartyUnlockIfNeeded(partyId, wasPartyFull);
            this.notifyPlayersOnLeave(partyId, socket, isEjection, player.name);
            this.updateOccupiedCharacters(partyId);
            PartyHelper.removePlayerFromParty(playerId, partyId);
        }
    }

    getCharactersOccupied(socket: io.Socket, callback: (data: number[]) => void): void {
        callback(this.partyService.getCharactersOccupied(PartyHelper.getPartyId(socket)));
    }

    endParty(socket: io.Socket): void {
        const partyId = PartyHelper.getPartyId(socket);
        PartyHelper.sendEvent(partyId, WsEventClient.PartyEnd, socket.id);
        this.partyService.deleteParty(partyId);
        this.partyStatService.deletePartyStatistic(partyId);
    }

    async createParty(socket: io.Socket, gid: string, callback: (isSuccessful: boolean, result: string[]) => void): Promise<void> {
        const partyId: string = socket.id + gid;
        if (!(await this.partyService.createParty(partyId, gid))) return callback(false, [GAME_NOT_AVAILABLE]);
        this.partyStatService.initializePartyStatistic(partyId);
        socket.join(partyId);
        callback(true, [gid, partyId]);
    }

    toggleLockParty(socket: io.Socket, callback: (isLocked: boolean) => void): void {
        const party = this.partyService.getParty(PartyHelper.getPartyId(socket));
        if (this.partyService.isPartyFull(PartyHelper.getPartyId(socket))) return callback(false);
        party.isLocked = !party.isLocked;
        callback(party.isLocked);
        if (party.isLocked) socket.to(PartyHelper.getPartyId(socket)).emit(WsEventClient.PartyLocked);
    }

    updateCharacterOccupied(socket: io.Socket, newCharacterSelected: number) {
        const partyId = PartyHelper.getPartyId(socket);
        if (!this.partyService.replaceCharacterOccupied(partyId, socket.id, newCharacterSelected)) return;
        PartyHelper.sendEvent(partyId, WsEventClient.CharacterOccupiedUpdated, this.partyService.getCharactersOccupied(partyId));
    }

    validateAccessCode(socket: io.Socket, accessCode: number, callback: (response: ResponseAccessCode) => void): void {
        const party: Party = this.partyService.getPartyWithAccessCode(accessCode);
        if (!party) return callback({ isValid: false, feedback: VALIDATE_ACCESS_CODE_FEEDBACK.invalidCode });
        if (party.isLocked) {
            const feedback = this.isPartyFull(party) ? VALIDATE_ACCESS_CODE_FEEDBACK.partyFull : VALIDATE_ACCESS_CODE_FEEDBACK.partyLocked;
            return callback({ isValid: false, feedback });
        }
        if (party.charactersOccupiedIds.size === CHARACTERS_OPTIONS_SIZE)
            return callback({ isValid: false, feedback: VALIDATE_ACCESS_CODE_FEEDBACK.partyRoomFull });
        socket.join(party.id);
        callback({ isValid: true });
    }

    private handlePartyUnlockIfNeeded(partyId: string, wasPartyFull: boolean) {
        if (!wasPartyFull) return;
        this.partyService.setLock(partyId, false);
        PartyHelper.sendEvent(partyId, WsEventClient.PartyFull, false);
    }

    private notifyPlayersOnLeave(partyId: string, socket: io.Socket, isEjection: boolean, playerName: string) {
        PartyHelper.sendEvent(partyId, WsEventClient.AllPlayers, this.partyService.getPlayers(partyId));
        PartyHelper.sendEvent(partyId, isEjection ? WsEventClient.EjectPlayer : WsEventClient.LeftParty, playerName, socket.id);
    }

    private updateOccupiedCharacters(partyId: string) {
        PartyHelper.sendEvent(partyId, WsEventClient.CharacterOccupiedUpdated, this.partyService.getCharactersOccupied(partyId));
    }

    private isPartyFull(party: Party): boolean {
        return this.partyService.isPartyFull(party.id) || party.charactersOccupiedIds.size === CHARACTERS_OPTIONS_SIZE;
    }
}
