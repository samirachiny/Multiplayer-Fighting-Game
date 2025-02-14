import { FlagItem } from '@app/classes/flag-item/flag-item';

describe('FlagItem', () => {
    it('should create an instance', () => {
        expect(new FlagItem()).toBeTruthy();
    });

    it('should FlagItem clone itself', () => {
        const item = new FlagItem();
        const clone = item.clone();
        expect(clone).not.toBe(item);
        expect(clone.type).toEqual(item.type);
        expect(clone.image).toEqual(item.image);
        expect(clone.description).toEqual(item.description);
        expect(clone.data).toEqual(item.data);
    });
});
