import { ITEM_IMAGES } from '@app/constants/image';
import { ItemType } from '@common/enums/item';
import { Item } from '@app/classes/item/item';
import { DESCRIPTIONS } from '@app/constants/consts';

export class GameModifierItem extends Item {
    constructor(type: ItemType) {
        const image = type === ItemType.DoubleIceBreak ? ITEM_IMAGES.doubleIceBreakItem : ITEM_IMAGES.decreaseLoserWinsItem;
        const description = type === ItemType.DoubleIceBreak ? DESCRIPTIONS.doubleIceBreakItem : DESCRIPTIONS.decreaseLoserWins;
        super(image, type, description);
    }

    clone(): Item {
        return new GameModifierItem(this._type);
    }
}
