import { ITEM_IMAGES } from '@app/constants/image';
import { ItemType } from '@common/enums/item';
import { Item } from '@app/classes/item/item';
import { DESCRIPTIONS } from '@app/constants/consts';

export class FlagItem extends Item {
    constructor() {
        super(ITEM_IMAGES.flagItem, ItemType.Flag, DESCRIPTIONS.flagItem);
    }

    clone(): Item {
        return new FlagItem();
    }
}
