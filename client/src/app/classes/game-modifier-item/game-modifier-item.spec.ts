import { ItemType } from '@common/enums/item';
import { GameModifierItem } from '@app/classes/game-modifier-item/game-modifier-item';

describe('GameModifierItem', () => {
    it('should create an instance', () => {
        expect(new GameModifierItem(ItemType.DoubleIceBreak)).toBeTruthy();
    });

    it('should AttributeModifierItem clone itself', () => {
        const item = new GameModifierItem(ItemType.DecreaseLoserWins);
        const clone = item.clone();
        expect(clone).not.toBe(item);
        expect(clone.type).toEqual(item.type);
        expect(clone.image).toEqual(item.image);
        expect(clone.description).toEqual(item.description);
        expect(clone.data).toEqual(item.data);
    });
});
