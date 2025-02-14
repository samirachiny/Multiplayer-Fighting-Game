import { ItemType } from '@common/enums/item';
import { ItemFactory } from './item-factory';
import { DECIMAL_TILE_BASE } from '@app/constants/consts';
import { AttributeModifierItem } from '@app/classes/attribute-modifier-item/attribute-modifier-item';
import { ConditionalItem } from '@app/classes/conditional-item/conditional-item';
import { FlagItem } from '@app/classes/flag-item/flag-item';
import { GameModifierItem } from '@app/classes/game-modifier-item/game-modifier-item';
import { RandomItem } from '@app/classes/random-item/random-item';
import { StartingPointItem } from '@app/classes/start-position-item/start-position-item';

describe('ItemFactory', () => {
    it('should create an instance', () => {
        expect(new ItemFactory()).toBeTruthy();
    });
    describe('createItem', () => {
        it('should create BoostAttack item', () => {
            const item = ItemFactory.createItem(ItemType.BoostAttack);
            expect(item).toBeInstanceOf(AttributeModifierItem);
            expect((item as AttributeModifierItem).type).toBe(ItemType.BoostAttack);
        });

        it('should create BoostDefense item', () => {
            const item = ItemFactory.createItem(ItemType.BoostDefense);
            expect(item).toBeInstanceOf(AttributeModifierItem);
            expect((item as AttributeModifierItem).type).toBe(ItemType.BoostDefense);
        });

        it('should create SwapOpponentLife item', () => {
            const item = ItemFactory.createItem(ItemType.SwapOpponentLife);
            expect(item).toBeInstanceOf(ConditionalItem);
            expect((item as ConditionalItem).type).toBe(ItemType.SwapOpponentLife);
        });

        it('should create SecondChance item', () => {
            const item = ItemFactory.createItem(ItemType.SecondChance);
            expect(item).toBeInstanceOf(ConditionalItem);
            expect((item as ConditionalItem).type).toBe(ItemType.SecondChance);
        });

        it('should create DoubleIceBreak item', () => {
            const item = ItemFactory.createItem(ItemType.DoubleIceBreak);
            expect(item).toBeInstanceOf(GameModifierItem);
            expect((item as GameModifierItem).type).toBe(ItemType.DoubleIceBreak);
        });

        it('should create decreaseLoserWins item', () => {
            const item = ItemFactory.createItem(ItemType.DecreaseLoserWins);
            expect(item).toBeInstanceOf(GameModifierItem);
            expect((item as GameModifierItem).type).toBe(ItemType.DecreaseLoserWins);
        });

        it('should create Flag item', () => {
            const item = ItemFactory.createItem(ItemType.Flag);
            expect(item).toBeInstanceOf(FlagItem);
        });

        it('should create StartingPoint item', () => {
            const item = ItemFactory.createItem(ItemType.StartingPoint);
            expect(item).toBeInstanceOf(StartingPointItem);
        });

        it('should create Random item', () => {
            const item = ItemFactory.createItem(ItemType.Random);
            expect(item).toBeInstanceOf(RandomItem);
        });

        it('should return null for invalid item type', () => {
            const item = ItemFactory.createItem(DECIMAL_TILE_BASE); // This should be an invalid value
            expect(item).toBeNull();
        });

        it('should handle values greater than DECIMAL_TILE_BASE', () => {
            const item = ItemFactory.createItem(DECIMAL_TILE_BASE + ItemType.BoostAttack);
            expect(item).toBeInstanceOf(AttributeModifierItem);
            expect((item as AttributeModifierItem).type).toBe(ItemType.BoostAttack);
        });
    });
});
