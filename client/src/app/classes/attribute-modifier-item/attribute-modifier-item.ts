import { ITEM_IMAGES } from '@app/constants/image';
import { ItemType } from '@common/enums/item';
import { Item } from '@app/classes/item/item';
import { DESCRIPTIONS } from '@app/constants/consts';

export class AttributeModifierItem extends Item {
    constructor(type: ItemType) {
        const description = type === ItemType.BoostAttack ? DESCRIPTIONS.boostAttackItem : DESCRIPTIONS.boostDefenseItem;
        const image = type === ItemType.BoostAttack ? ITEM_IMAGES.boostAttackItem : ITEM_IMAGES.boostDefenseItem;
        super(image, type, description);
    }

    clone(): Item {
        return new AttributeModifierItem(this._type);
    }
}
