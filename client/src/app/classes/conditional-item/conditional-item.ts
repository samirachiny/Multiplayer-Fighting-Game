import { ITEM_IMAGES } from '@app/constants/image';
import { ItemType } from '@common/enums/item';
import { Item } from '@app/classes/item/item';
import { DESCRIPTIONS } from '@app/constants/consts';

export class ConditionalItem extends Item {
    constructor(type: ItemType) {
        const image = type === ItemType.SwapOpponentLife ? ITEM_IMAGES.swapOpponentLife : ITEM_IMAGES.secondChanceItem;
        const description = type === ItemType.SwapOpponentLife ? DESCRIPTIONS.swapOpponentLifeItem : DESCRIPTIONS.secondChance;
        super(image, type, description);
    }

    clone(): Item {
        return new ConditionalItem(this._type);
    }
}
