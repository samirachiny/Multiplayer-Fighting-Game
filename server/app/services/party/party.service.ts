import { Party } from '@common/interfaces/party';
import { Service } from 'typedi';
import { GameService } from '@app/services/game/game.service';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { MAP_SIZE_TO_MAX_PLAYERS } from '@common/constants/map-size-to-max-players';
import { ChatMessage } from '@common/interfaces/chat-message';
import { Coordinate } from '@common/interfaces/coordinate';
import { GameLogs } from '@common/interfaces/game-logs';
import { BASE_TILE_DECIMAL, FIGHT_LOGS_TYPES } from '@app/utils/const';
import { ItemType } from '@common/enums/item';
import { PlayerService } from '@app/services/player/player.service';
import { ItemService } from '@app/services/item/item.service';
import { GameMode } from '@common/enums/game-infos';

@Service()
export class PartyService {
    private parties: Map<string, Party> = new Map<string, Party>();
    constructor(
        private gameService: GameService,
        private playerService: PlayerService,
        private itemService: ItemService,
    ) {}

    getParty(partyId: string): Party {
        return this.parties.get(partyId);
    }
    getMap(partyId: string): number[][] {
        return this.getParty(partyId).game.gameMap;
    }

    async createParty(partyId: string, gameId: string): Promise<boolean> {
        const game = await this.gameService.getGameById(gameId);
        if (!game) return false;
        this.parties.set(partyId, {
            id: partyId,
            chatMessages: [],
            charactersOccupiedIds: new Map(),
            game,
            isLocked: false,
            logs: [],
            accessCode: PartyHelper.generateValidAccessCode(Array.from(this.parties.values())),
            isDebugMode: false,
        });
        this.playerService.initPartyPlayers(partyId);
        return true;
    }

    replaceCharacterOccupied(partyId: string, socketId: string, newCharacterId: number): boolean {
        const party = this.parties.get(partyId);
        if (!party) return false;
        party.charactersOccupiedIds.set(socketId, newCharacterId);
        return true;
    }
    getPartyWithAccessCode(accessCode: number): Party | null {
        for (const party of this.parties.values()) {
            if (party.accessCode === accessCode) return party;
        }
        return null;
    }

    getCharactersOccupied(partyId: string): number[] {
        const party = this.parties.get(partyId);
        return Array.from(party.charactersOccupiedIds.values());
    }

    isPartyFull(partyId: string): boolean {
        const party = this.parties.get(partyId);
        return this.playerService.getPlayers(partyId).length === MAP_SIZE_TO_MAX_PLAYERS[party.game.mapSize];
    }

    setPlayer(partyId: string, playerId: string, player: PlayerInfos): boolean {
        if (this.isPartyFull(partyId)) return false;
        this.playerService.setPlayer(partyId, playerId, player);
        return true;
    }

    deleteParty(partyId: string): void {
        PartyHelper.disconnectSocketsFromParty(partyId);
        this.parties.delete(partyId);
        this.playerService.deletePartyPlayers(partyId);
    }

    addMessageToChat(partyId: string, message: ChatMessage): void {
        const party = this.parties.get(partyId);
        if (!party) return;
        party.chatMessages.push(message);
    }

    getChatMessages(partyId: string): ChatMessage[] | null {
        const party = this.parties.get(partyId);
        if (!party) return null;
        return party.chatMessages;
    }

    addLog(partyId: string, log: GameLogs): void {
        const party = this.parties.get(partyId);
        if (!party) return;
        party.logs.push(log);
    }

    getLogs(partyId: string, playerId?: string): GameLogs[] {
        const party = this.parties.get(partyId);
        if (!party) return [];
        return party.logs.filter((log) => {
            if (!FIGHT_LOGS_TYPES.has(log.type)) return true;
            return log.playerIds?.includes(playerId) ?? false;
        });
    }

    getPlayer(partyId: string, playerId: string): PlayerInfos | null {
        return this.playerService.getPlayer(partyId, playerId);
    }

    removePlayer(partyId: string, playerId: string): boolean {
        const party = this.parties.get(partyId);
        if (!party) return false;
        party.charactersOccupiedIds.delete(playerId);
        return this.playerService.removePlayer(partyId, playerId);
    }

    setLock(partyId: string, isLocked: boolean): void {
        const party = this.parties.get(partyId);
        if (!party) return;
        party.isLocked = isLocked;
    }

    getPlayers(partyId: string): PlayerInfos[] {
        return this.playerService.getPlayers(partyId);
    }

    getOrderPlayers(partyId: string): PlayerInfos[] {
        return this.playerService.getOrderPlayers(partyId);
    }

    setCurrentPlayer(partyId: string, playerId: string, isCurrentPlayer: boolean) {
        this.playerService.setCurrentPlayer(partyId, playerId, isCurrentPlayer);
    }

    setPlayerGiveUp(partyId: string, playerId: string) {
        this.playerService.setPlayerGiveUp(partyId, playerId);
    }

    setPlayerAvailableMove(partyId: string, playerId: string, availableMoves: number) {
        this.playerService.setPlayerAvailableMove(partyId, playerId, availableMoves);
    }

    decrementRemainingAction(partyId: string, playerId: string) {
        this.playerService.decrementRemainingAction(partyId, playerId);
    }

    addToWinCount(partyId: string, playerId: string, amount: number): number {
        return this.playerService.addToWinCount(partyId, playerId, amount);
    }

    resetAttributePlayer(partyId: string, playerId: string): void {
        this.playerService.resetAttributePlayer(partyId, playerId);
    }

    updatePlayerPosition(partyId: string, playerId: string, newPosition: Coordinate): void {
        this.playerService.updatePlayerPosition(partyId, playerId, newPosition);
    }

    updateMap(partyId: string, pos: Coordinate, newValue: number): void {
        const party = this.getParty(partyId);
        if (party) party.game.gameMap[pos.y][pos.x] = newValue;
    }

    setPartyDebugMode(partyId: string, isDebugMode: boolean): void {
        const party = this.getParty(partyId);
        if (party) party.isDebugMode = isDebugMode;
    }

    togglePartyMode(partyId: string): void {
        const party = this.getParty(partyId);
        this.setPartyDebugMode(partyId, !party.isDebugMode);
    }

    isDebugMode(partyId: string): boolean {
        const party = this.getParty(partyId);
        if (!party) return false;
        return party.isDebugMode;
    }

    addPlayerItem(partyId: string, playerId: string, item: ItemType): void {
        this.playerService.addPlayerItem(partyId, playerId, item);
        this.itemService.applyItemEffect(this.getParty(partyId), this.getPlayer(partyId, playerId), item);
    }

    removePlayerItem(partyId: string, playerId: string, item: ItemType): void {
        this.itemService.removeItemEffect(this.getParty(partyId), this.getPlayer(partyId, playerId), item);
        this.playerService.removePlayerItem(partyId, playerId, item);
    }

    removeAllPlayerItem(partyId: string, playerId: string): void {
        this.itemService.removeAllItemEffect(this.getParty(partyId), this.getPlayer(partyId, playerId));
        this.playerService.removeAllPlayerItem(partyId, playerId);
    }

    getPlayerItems(partyId: string, playerId: string): ItemType[] {
        return this.playerService.getPlayerItems(partyId, playerId);
    }

    getStartPositions(partyId: string): Coordinate[] {
        const party = this.getParty(partyId);
        if (!party) return [];
        const startPositions: Coordinate[] = [];
        for (let i = 0; i < party.game.mapSize; i++) {
            for (let j = 0; j < party.game.mapSize; j++) {
                if (party.game.gameMap[j][i] % BASE_TILE_DECIMAL === ItemType.StartingPoint) {
                    startPositions.push({ x: j, y: i });
                }
            }
        }
        return startPositions;
    }

    hasPartyDoubleIceBreak(partyId: string): boolean {
        return this.getParty(partyId)?.hasDoubleIceBreakEffect ?? false;
    }

    hasPartyDecreaseLoserWins(partyId: string): boolean {
        return this.getParty(partyId)?.hasDecreaseLoserWinsEffect ?? false;
    }

    getPartyGameMode(partyId: string): GameMode {
        const party = this.getParty(partyId);
        if (!party) return null;
        return party.game.mode as GameMode;
    }

    getPartyDuration(partyId: string): string {
        const party = this.getParty(partyId);
        if (!party) return '';
        return PartyHelper.getPartyDuration(party.logs);
    }
}
