/* eslint-disable @typescript-eslint/no-explicit-any */
import { ItemType } from '@common/enums/item';
import { Item } from '@app/classes/item/item';

describe('Item', () => {
    const item: Item = new Item('IMAGE', ItemType.BoostAttack, 'DESCRIPTION');

    it('should create an instance', () => {
        expect(new Item('', ItemType.Random, '')).toBeTruthy();
    });

    it('should Item clone itself', () => {
        const clone = item.clone();
        expect(clone).not.toBe(item);
        expect(clone.type).toEqual(item.type);
        expect(clone.image).toEqual(item.image);
        expect(clone.description).toEqual(item.description);
        expect(clone.data).toEqual(item.data);
    });

    it('should get image return the image of the item', () => {
        expect(item.image).toEqual((item as any)._image);
    });

    it('should get data return the data of the item', () => {
        expect(item.data).toEqual(item.type as number);
    });

    it('should get description return the description of the item', () => {
        expect(item.description).toEqual((item as any)._description);
    });

    it('should get type return the type of the item', () => {
        expect(item.type).toEqual((item as any)._type);
    });
});
