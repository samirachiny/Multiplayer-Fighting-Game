import { ITEM_IMAGES } from '@app/constants/image';
import { ItemType } from '@common/enums/item';
import { Item } from '@app/classes/item/item';
import { DESCRIPTIONS } from '@app/constants/consts';

export class StartingPointItem extends Item {
    constructor() {
        super(ITEM_IMAGES.startPositionItem, ItemType.StartingPoint, DESCRIPTIONS.startPositionItem);
    }

    clone(): Item {
        return new StartingPointItem();
    }
}
