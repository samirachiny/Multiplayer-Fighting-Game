import { RandomItem } from '@app/classes/random-item/random-item';

describe('RandomItem', () => {
    it('should create an instance', () => {
        expect(new RandomItem()).toBeTruthy();
    });

    it('should RandomItem clone itself', () => {
        const item = new RandomItem();
        const clone = item.clone();
        expect(clone).not.toBe(item);
        expect(clone.type).toEqual(item.type);
        expect(clone.image).toEqual(item.image);
        expect(clone.description).toEqual(item.description);
        expect(clone.data).toEqual(item.data);
    });
});
