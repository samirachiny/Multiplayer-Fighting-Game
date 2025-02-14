import { Service } from 'typedi';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { Coordinate } from '@common/interfaces/coordinate';
import { ItemType } from '@common/enums/item';
import { WsEventClient } from '@common/enums/web-socket-event';

@Service()
export class PlayerService {
    private partiesPlayers: Map<string, Map<string, PlayerInfos>> = new Map<string, Map<string, PlayerInfos>>();

    initPartyPlayers(partyId: string): void {
        this.partiesPlayers.set(partyId, new Map<string, PlayerInfos>());
    }

    setPlayer(partyId: string, playerId: string, player: PlayerInfos): void {
        const players = this.partiesPlayers.get(partyId);
        players.set(playerId, {
            ...player,
            pid: playerId,
            isOrganizer: !players.size,
        });
    }

    deletePartyPlayers(partyId: string) {
        this.partiesPlayers.delete(partyId);
    }

    getPlayer(partyId: string, playerId: string): PlayerInfos | null {
        const players = this.partiesPlayers.get(partyId);
        if (!(players && playerId)) return null;
        return players.get(playerId);
    }

    removePlayer(partyId: string, playerId: string): boolean {
        const players = this.partiesPlayers.get(partyId);
        if (!players) return false;
        return players.delete(playerId);
    }

    getPlayers(partyId: string): PlayerInfos[] {
        const players = this.partiesPlayers.get(partyId);
        if (!players) return [];
        return Array.from(players.values());
    }

    getOrderPlayers(partyId: string): PlayerInfos[] {
        const players = this.getPlayers(partyId);
        return players.sort((player1, player2) => player2.speed - player1.speed);
    }

    setCurrentPlayer(partyId: string, playerId: string, isCurrentPlayer: boolean) {
        const player = this.getPlayer(partyId, playerId);
        if (player) player.isCurrentPlayer = isCurrentPlayer;
    }

    setPlayerGiveUp(partyId: string, playerId: string) {
        const player = this.getPlayer(partyId, playerId);
        if (player) player.isGiveUp = true;
    }

    setPlayerAvailableMove(partyId: string, playerId: string, availableMoves: number) {
        const player = this.getPlayer(partyId, playerId);
        if (player) player.availableMoves = availableMoves;
    }

    decrementRemainingAction(partyId: string, playerId: string) {
        const player = this.getPlayer(partyId, playerId);
        if (player) player.remainingAction = player.remainingAction - 1;
    }

    addToWinCount(partyId: string, playerId: string, amount: number): number {
        const player = this.getPlayer(partyId, playerId);
        if (!player) return 0;
        if (player.wins + amount < 0) return player.wins;
        player.wins = player.wins + amount;
        return player.wins;
    }

    resetAttributePlayer(partyId: string, playerId: string) {
        const player = this.getPlayer(partyId, playerId);
        if (!player) return;
        player.remainingAction = 1;
        player.availableMoves = player.speed;
    }

    updatePlayerPosition(partyId: string, playerId: string, newPosition: Coordinate) {
        const player = this.getPlayer(partyId, playerId);
        if (!player) return;
        player.previousPosition = player.currentPosition;
        player.currentPosition = { x: newPosition.y, y: newPosition.x };
    }

    addPlayerItem(partyId: string, playerId: string, item: ItemType): void {
        const player = this.getPlayer(partyId, playerId);
        if (!player) return;
        if (item === ItemType.Flag) this.changeFlagOwnerIfFlagExistFor(partyId, player, true);
        player.items.push(item);
    }

    removePlayerItem(partyId: string, playerId: string, item: ItemType): void {
        const player = this.getPlayer(partyId, playerId);
        if (!player) return;
        if (item === ItemType.Flag) this.changeFlagOwnerIfFlagExistFor(partyId, player, false);
        player.items = player.items.filter((currentItem) => currentItem !== item);
    }

    removeAllPlayerItem(partyId: string, playerId: string): void {
        const player = this.getPlayer(partyId, playerId);
        if (!player) return;
        if (player.hasFlag) this.changeFlagOwnerIfFlagExistFor(partyId, player, false);
        player.items = [];
    }

    getPlayerItems(partyId: string, playerId: string): ItemType[] {
        const player = this.getPlayer(partyId, playerId);
        if (!player) return [];
        return player.items;
    }

    changeFlagOwnerIfFlagExistFor(partyId: string, player: PlayerInfos, hasFlag: boolean): void {
        player.hasFlag = hasFlag;
        PartyHelper.sendEvent(partyId, WsEventClient.PlayerListUpdated, this.getPlayers(partyId));
    }
}
