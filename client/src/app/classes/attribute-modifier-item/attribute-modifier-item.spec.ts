import { AttributeModifierItem } from './attribute-modifier-item';
import { ItemType } from '@common/enums/item';

describe('AttributeModifierItem', () => {
    it('should create an instance', () => {
        expect(new AttributeModifierItem(ItemType.BoostAttack)).toBeTruthy();
    });

    it('should AttributeModifierItem clone itself', () => {
        const item = new AttributeModifierItem(ItemType.BoostAttack);
        expect(item.clone()).not.toBe(item);
        const clone = item.clone();
        expect(clone.type).toEqual(item.type);
        expect(clone.image).toEqual(item.image);
        expect(clone.description).toEqual(item.description);
        expect(clone.data).toEqual(item.data);
    });
});
