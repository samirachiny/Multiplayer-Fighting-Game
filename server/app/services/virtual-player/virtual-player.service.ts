import * as io from 'socket.io';
import { Service } from 'typedi';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient } from '@common/enums/web-socket-event';
import { PartyService } from '@app/services/party/party.service';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { Dice } from '@common/enums/dice';
import { Character } from '@common/interfaces/character';
import { CHARACTERS } from '@common/constants/character';
import { BASE_STAT, BOT_NAMES, PID_BASE, PID_LENGTH, PID_START_INDEX, STAT_BOOST } from '@app/utils/const';

@Service()
export class VirtualPlayerService {
    constructor(
        private partyService: PartyService,
        private partyStatService: PartyStatisticsService,
    ) {}

    addVirtualPlayer(socket: io.Socket, profile: BotProfile) {
        const partyId = PartyHelper.getPartyId(socket);
        const virtualPlayer = this.initializeVirtualPlayer(partyId, profile);
        if (virtualPlayer.character === null) return;
        if (!this.partyService.setPlayer(partyId, virtualPlayer.pid, virtualPlayer)) return;
        this.partyStatService.setPlayerStatistic(partyId, virtualPlayer.pid, virtualPlayer.name);
        if (this.partyService.isPartyFull(partyId)) {
            this.partyService.setLock(partyId, true);
            PartyHelper.sendEvent(partyId, WsEventClient.PartyFull, true);
        }
        PartyHelper.sendEvent(partyId, WsEventClient.AllPlayers, this.partyService.getPlayers(partyId));
        if (!this.partyService.replaceCharacterOccupied(partyId, virtualPlayer.pid, virtualPlayer.character.id)) return;
        PartyHelper.sendEvent(partyId, WsEventClient.CharacterOccupiedUpdated, this.partyService.getCharactersOccupied(partyId));
    }

    private generateVirtualPlayerName(partyId: string): string {
        const index = Math.floor(Math.random() * BOT_NAMES.length);
        return PartyHelper.generateValidName(BOT_NAMES[index], this.partyService.getPlayers(partyId));
    }

    private getRandomCharacter(partyId: string): Character | null {
        const occupiedCharacterPids = this.partyService.getCharactersOccupied(partyId);
        const availableCharacters = CHARACTERS.filter((_, index) => !occupiedCharacterPids.includes(index + 1));
        if (availableCharacters.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * availableCharacters.length);
        return availableCharacters[randomIndex];
    }

    private generateRandomPid(): string {
        return Math.random().toString(PID_BASE).substr(PID_START_INDEX, PID_LENGTH);
    }

    private getRandomAttributes(): { speed: number; life: number } {
        const valueAttributes = [BASE_STAT, BASE_STAT];
        const randomIndex = Math.floor(Math.random() * valueAttributes.length);
        valueAttributes[randomIndex] += STAT_BOOST;
        return { speed: valueAttributes[0], life: valueAttributes[1] };
    }

    private getRandomDiceAssignment(): { attack: Dice; defense: Dice } {
        const diceAssignments = [
            { attack: Dice.D4, defense: Dice.D6 },
            { attack: Dice.D6, defense: Dice.D4 },
        ];
        const randomIndex = Math.floor(Math.random() * diceAssignments.length);
        return diceAssignments[randomIndex];
    }

    private initializeVirtualPlayer(partyId: string, profile: BotProfile): PlayerInfos {
        const randomAttributes = this.getRandomAttributes();
        return {
            pid: this.generateRandomPid(),
            name: this.generateVirtualPlayerName(partyId),
            character: this.getRandomCharacter(partyId),
            isOrganizer: false,
            isGiveUp: false,
            isCurrentPlayer: false,
            speed: randomAttributes.speed,
            attack: BASE_STAT,
            defense: BASE_STAT,
            life: randomAttributes.life,
            wins: 0,
            items: [],
            availableMoves: randomAttributes.speed,
            remainingAction: 1,
            diceAssignment: this.getRandomDiceAssignment(),
            startPosition: null,
            currentPosition: null,
            previousPosition: null,
            isVirtualPlayer: true,
            virtualPlayerProfile: profile,
        };
    }
}
