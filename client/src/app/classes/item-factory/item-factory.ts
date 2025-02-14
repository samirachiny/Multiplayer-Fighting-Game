import { ItemType } from '@common/enums/item';
import { AttributeModifierItem } from '@app/classes/attribute-modifier-item/attribute-modifier-item';
import { ConditionalItem } from '@app/classes/conditional-item/conditional-item';
import { FlagItem } from '@app/classes/flag-item/flag-item';
import { GameModifierItem } from '@app/classes/game-modifier-item/game-modifier-item';
import { Item } from '@app/classes/item/item';
import { RandomItem } from '@app/classes/random-item/random-item';
import { StartingPointItem } from '@app/classes/start-position-item/start-position-item';
import { DECIMAL_TILE_BASE } from '@app/constants/consts';

export class ItemFactory {
    static createItem(value: number): Item | null {
        const itemValue = value % DECIMAL_TILE_BASE;
        switch (itemValue) {
            case ItemType.BoostAttack:
                return new AttributeModifierItem(ItemType.BoostAttack);
            case ItemType.BoostDefense:
                return new AttributeModifierItem(ItemType.BoostDefense);
            case ItemType.SwapOpponentLife:
                return new ConditionalItem(ItemType.SwapOpponentLife);
            case ItemType.SecondChance:
                return new ConditionalItem(ItemType.SecondChance);
            case ItemType.DoubleIceBreak:
                return new GameModifierItem(ItemType.DoubleIceBreak);
            case ItemType.DecreaseLoserWins:
                return new GameModifierItem(ItemType.DecreaseLoserWins);
            case ItemType.Flag:
                return new FlagItem();
            case ItemType.StartingPoint:
                return new StartingPointItem();
            case ItemType.Random:
                return new RandomItem();
            default:
                return null;
        }
    }
}
