/* eslint-disable @typescript-eslint/no-explicit-any */
import { TILE_IMAGES } from '@app/constants/image';
import { TileType } from '@common/enums/tile';
import { Item } from '@app/classes/item/item';
import { Tile } from './tile';
import { DESCRIPTIONS } from '@app/constants/consts';

describe('Tile', () => {
    let tile: Tile;

    beforeEach(() => {
        tile = new Tile();
    });

    it('should create an instance', () => {
        expect(new Tile()).toBeTruthy();
    });

    it('should create a tile with default values', () => {
        expect(tile.type).toBe(TileType.Base);
        expect(tile.image).toBe(TILE_IMAGES.grass);
        expect(tile.description).toBe(DESCRIPTIONS.tile);
        expect(tile.isDoor).toBe(false);
        expect(tile.isWall).toBe(false);
        expect(tile.item).toBeNull();
    });

    it('should create a tile with custom values', () => {
        const customTile = new Tile(TileType.Wall, TILE_IMAGES.wall, 'Wall Tile');
        expect(customTile.type).toBe(TileType.Wall);
        expect(customTile.image).toBe(TILE_IMAGES.wall);
        expect(customTile.description).toBe('Wall Tile');
    });

    it('should return correct type', () => {
        expect(tile.type).toBe((tile as any)._type);
    });

    it('should return correct description', () => {
        expect(tile.description).toBe((tile as any)._description);
    });

    it('should return correct image', () => {
        expect(tile.image).toBe((tile as any)._image);
    });

    it('should return correct data', () => {
        expect(tile.data).toBe(tile.type as number);
    });

    it('should return null for item initially', () => {
        expect(tile.item).toBe((tile as any)._item);
    });

    it('should set item when tile is empty', () => {
        const item = {} as Item;
        expect(tile.setItem(item)).toBe(true);
        expect(tile.item).toBe(item);
    });

    it('should not set item when tile already has an item', () => {
        const item1 = {} as Item;
        const item2 = {} as Item;
        tile.setItem(item1);
        expect(tile.setItem(item2)).toBe(false);
        expect(tile.item).toBe(item1);
    });

    it('should remove the item from the tile', () => {
        const item = {} as Item;
        tile.setItem(item);
        tile.removeItem();
        expect(tile.item).toBeNull();
    });

    it('should create a new tile with the same properties', () => {
        const item = {} as Item;
        tile.setItem(item);
        const clonedTile = tile.clone();
        expect(clonedTile).toBeInstanceOf(Tile);
        expect(clonedTile).not.toBe(tile);
        expect(clonedTile.type).toBe(tile.type);
        expect(clonedTile.image).toBe(tile.image);
        expect(clonedTile.description).toBe(tile.description);
        expect(clonedTile.item).toBe(tile.item);
    });
});
