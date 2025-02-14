import { Item } from '@app/classes/item/item';

export class ItemCountHelper {
    static incrementItem(item: Item | null, itemCounts: Map<Item, number>): void {
        const itemKey = this.getKeyItem(item, itemCounts);
        if (!itemKey) return;
        const currentCount = this.getItemCount(itemKey, itemCounts);
        itemCounts.set(itemKey, currentCount + 1);
    }

    static decrementItem(item: Item | null, itemCounts: Map<Item, number>): boolean {
        const itemKey = this.getKeyItem(item, itemCounts);
        if (!itemKey) return false;
        const currentCount = this.getItemCount(itemKey, itemCounts);
        if (currentCount <= 0) return false;
        itemCounts.set(itemKey, currentCount - 1);
        return true;
    }

    static getItemCount(item: Item, itemCounts: Map<Item, number>): number {
        const keyItem = this.getKeyItem(item, itemCounts);
        return keyItem ? itemCounts.get(keyItem) || 0 : 0;
    }

    static getKeyItem(item: Item | null, itemCounts: Map<Item, number>): Item | null {
        if (!item) return null;
        for (const itemCount of itemCounts) {
            if (itemCount[0].type === item.type) return itemCount[0];
        }
        return null;
    }
}
