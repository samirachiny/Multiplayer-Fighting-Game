/* eslint-disable @typescript-eslint/no-explicit-any */
import { IceTile } from './ice-tile';

describe('IceTile', () => {
    let iceTile: IceTile;

    beforeEach(() => {
        iceTile = new IceTile();
    });
    it('should create an instance', () => {
        expect(new IceTile()).toBeTruthy();
    });

    it('should create a new iceTile with the same properties', () => {
        const clonedTile = iceTile.clone();
        expect(clonedTile).toBeInstanceOf(IceTile);
        expect(clonedTile).not.toBe(iceTile);
        expect(clonedTile.type).toBe((iceTile as any)._type);
        expect(clonedTile.image).toBe((iceTile as any)._image);
        expect(clonedTile.description).toBe((iceTile as any)._description);
    });
});
