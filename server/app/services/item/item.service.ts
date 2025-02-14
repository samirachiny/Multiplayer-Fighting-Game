import { Service } from 'typedi';
import { ItemType } from '@common/enums/item';
import { Party } from '@common/interfaces/party';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { ALL_ITEMS, BASE_STAT, BASE_TILE_DECIMAL, BOOSTED_STAT } from '@app/utils/const';
import { shuffleArray } from '@app/utils/helper';

@Service()
export class ItemService {
    removeRandomItems(party: Party): void {
        if (!party) return;
        const unUsedItems = this.getUnUsedItems(party);
        const gameMap = this.getGameMap(party);
        if (unUsedItems.length === 0) return;
        let index = 0;
        gameMap.forEach((row, j) => {
            row.forEach((tile, i) => {
                if (tile % BASE_TILE_DECIMAL === ItemType.Random) {
                    const newValue = Math.floor(tile / BASE_TILE_DECIMAL) * BASE_TILE_DECIMAL + unUsedItems[index];
                    gameMap[j][i] = newValue;
                    index++;
                }
            });
        });
    }

    applyItemEffect(party: Party, player: PlayerInfos, item: ItemType): void {
        switch (item) {
            case ItemType.BoostAttack:
                player.attack = BOOSTED_STAT;
                break;
            case ItemType.BoostDefense:
                player.defense = BOOSTED_STAT;
                break;
            case ItemType.SwapOpponentLife:
                player.hasSwapOpponentLifeEffect = true;
                break;
            case ItemType.SecondChance:
                player.hasSecondChanceEffect = true;
                break;
            case ItemType.DoubleIceBreak:
                party.hasDoubleIceBreakEffect = true;
                break;
            case ItemType.DecreaseLoserWins:
                party.hasDecreaseLoserWinsEffect = true;
                break;
        }
    }

    removeAllItemEffect(party: Party, player: PlayerInfos) {
        player.items.forEach((item) => this.removeItemEffect(party, player, item));
    }

    removeItemEffect(party: Party, player: PlayerInfos, item: ItemType): void {
        switch (item) {
            case ItemType.BoostAttack:
                player.attack = BASE_STAT;
                break;
            case ItemType.BoostDefense:
                player.defense = BASE_STAT;
                break;
            case ItemType.SwapOpponentLife:
                player.hasSwapOpponentLifeEffect = false;
                break;
            case ItemType.SecondChance:
                player.hasSecondChanceEffect = false;
                break;
            case ItemType.DoubleIceBreak:
                party.hasDoubleIceBreakEffect = false;
                break;
            case ItemType.DecreaseLoserWins:
                party.hasDecreaseLoserWinsEffect = false;
                break;
        }
    }

    private getUnUsedItems(party: Party): ItemType[] {
        if (!party) return [];
        const usedItems: ItemType[] = [];
        this.getGameMap(party).forEach((row) => {
            row.forEach((tile) => {
                const item = tile % BASE_TILE_DECIMAL;
                if (ALL_ITEMS.includes(item)) {
                    usedItems.push(item);
                }
            });
        });
        const unUsedItems = ALL_ITEMS.filter((item) => !usedItems.includes(item));
        return shuffleArray(unUsedItems);
    }

    private getGameMap(party: Party) {
        return party.game.gameMap;
    }
}
