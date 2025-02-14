/* eslint-disable @typescript-eslint/no-explicit-any */
import { WallTile } from '@app/classes/wall-tile/wall-tile';
import { Item } from '@app/classes/item/item';

describe('WallTile', () => {
    let wallTile: WallTile;

    beforeEach(() => {
        wallTile = new WallTile();
    });
    it('should create an instance', () => {
        expect(new WallTile()).toBeTruthy();
    });

    describe('setItem', () => {
        it('should always return false', () => {
            const item = {} as Item;
            expect(wallTile.setItem(item)).toBe(false);
            expect(wallTile.item).toBeNull();
        });

        it('should not set item even when null is passed', () => {
            expect(wallTile.setItem(null)).toBe(false);
        });
    });

    describe('clone', () => {
        it('should create a new WallTile with the same properties', () => {
            const clonedTile = wallTile.clone();
            expect(clonedTile).toBeInstanceOf(WallTile);
            expect(clonedTile).not.toBe(wallTile);
            expect(clonedTile.type).toEqual((wallTile as any)._type);
            expect(clonedTile.image).toEqual((wallTile as any)._image);
            expect(clonedTile.description).toEqual((wallTile as any)._description);
            expect(clonedTile.isWall).toEqual(true);
        });
    });
});
