import { ITEM_IMAGES } from '@app/constants/image';
import { ItemType } from '@common/enums/item';
import { Item } from '@app/classes/item/item';
import { DESCRIPTIONS } from '@app/constants/consts';

export class RandomItem extends Item {
    constructor() {
        super(ITEM_IMAGES.randomItem, ItemType.Random, DESCRIPTIONS.randomItem);
    }

    clone(): Item {
        return new RandomItem();
    }
}
