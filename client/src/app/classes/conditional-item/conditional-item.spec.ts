import { ItemType } from '@common/enums/item';
import { ConditionalItem } from '@app/classes/conditional-item/conditional-item';

describe('ConditionalItem', () => {
    it('should create an instance', () => {
        expect(new ConditionalItem(ItemType.SwapOpponentLife)).toBeTruthy();
    });

    it('should ConditionalItem clone itself', () => {
        const item = new ConditionalItem(ItemType.SwapOpponentLife);
        const clone = item.clone();
        expect(clone).not.toBe(item);
        expect(clone.type).toEqual(item.type);
        expect(clone.image).toEqual(item.image);
        expect(clone.description).toEqual(item.description);
        expect(clone.data).toEqual(item.data);
    });
});
