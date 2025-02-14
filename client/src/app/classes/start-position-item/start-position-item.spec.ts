import { StartingPointItem } from './start-position-item';

describe('StartPositionItem', () => {
    it('should create an instance', () => {
        expect(new StartingPointItem()).toBeTruthy();
    });

    it('should StartPositionItem clone itself', () => {
        const item = new StartingPointItem();
        const clone = item.clone();
        expect(clone).not.toBe(item);
        expect(clone.type).toEqual(item.type);
        expect(clone.image).toEqual(item.image);
        expect(clone.description).toEqual(item.description);
        expect(clone.data).toEqual(item.data);
    });
});
