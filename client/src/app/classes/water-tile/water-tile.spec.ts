/* eslint-disable @typescript-eslint/no-explicit-any */
import { WaterTile } from './water-tile';

describe('WaterTile', () => {
    it('should create an instance', () => {
        expect(new WaterTile()).toBeTruthy();
    });

    it('should create a new waterTile with the same properties', () => {
        const waterTile = new WaterTile();
        const clonedTile = waterTile.clone();
        expect(clonedTile).toBeInstanceOf(WaterTile);
        expect(clonedTile).not.toBe(waterTile);
        expect(clonedTile.type).toBe((waterTile as any)._type);
        expect(clonedTile.image).toBe((waterTile as any)._image);
        expect(clonedTile.description).toBe((waterTile as any)._description);
    });
});
