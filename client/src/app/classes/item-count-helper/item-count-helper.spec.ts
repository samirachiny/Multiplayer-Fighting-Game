import { ItemCountHelper } from './item-count-helper';
import { Item } from '@app/classes/item/item';

describe('ItemCountHelper', () => {
    let itemCounts: Map<Item, number>;
    let mockItem1: Item;
    let mockItem2: Item;

    beforeEach(() => {
        itemCounts = new Map<Item, number>();
        mockItem1 = { type: 1 } as Item;
        mockItem2 = { type: 2 } as Item;
        itemCounts.set(mockItem1, 1);
    });

    it('should create an instance', () => {
        expect(new ItemCountHelper()).toBeTruthy();
    });

    describe('incrementItem', () => {
        it('should increment count for existing item', () => {
            ItemCountHelper.incrementItem(mockItem1, itemCounts);
            expect(itemCounts.get(mockItem1)).toBe(2);
        });

        it('should not increment count for non-existing item', () => {
            ItemCountHelper.incrementItem(mockItem2, itemCounts);
            expect(itemCounts.get(mockItem2)).toBeUndefined();
        });

        it('should not modify map for null item', () => {
            ItemCountHelper.incrementItem(null, itemCounts);
            expect(itemCounts.size).toBe(1);
        });
    });

    describe('decrementItem', () => {
        it('should decrement count for existing item', () => {
            const result = ItemCountHelper.decrementItem(mockItem1, itemCounts);
            expect(result).toBe(true);
            expect(itemCounts.get(mockItem1)).toBe(0);
        });

        it('should return false for non-existing item', () => {
            const result = ItemCountHelper.decrementItem(mockItem2, itemCounts);
            expect(result).toBe(false);
        });

        it('should return false for item with zero count', () => {
            itemCounts.set(mockItem1, 0);
            const result = ItemCountHelper.decrementItem(mockItem1, itemCounts);
            expect(result).toBe(false);
        });

        it('should return false for null item', () => {
            const result = ItemCountHelper.decrementItem(null, itemCounts);
            expect(result).toBe(false);
        });
    });

    describe('getItemCount', () => {
        it('should return correct count for existing item', () => {
            const count = ItemCountHelper.getItemCount(mockItem1, itemCounts);
            expect(count).toBe(1);
        });

        it('should return 0 for non-existing item', () => {
            const count = ItemCountHelper.getItemCount(mockItem2, itemCounts);
            expect(count).toBe(0);
        });
    });

    describe('getKeyItem', () => {
        it('should return existing item with matching type', () => {
            const result = ItemCountHelper.getKeyItem({ type: 1 } as Item, itemCounts);
            expect(result).toBe(mockItem1);
        });

        it('should return null for non-existing item type', () => {
            const result = ItemCountHelper.getKeyItem({ type: 3 } as Item, itemCounts);
            expect(result).toBeNull();
        });

        it('should return null for null item', () => {
            const result = ItemCountHelper.getKeyItem(null, itemCounts);
            expect(result).toBeNull();
        });
    });
});
