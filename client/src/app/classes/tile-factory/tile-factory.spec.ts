import { DECIMAL_TILE_BASE } from '@app/constants/consts';
import { TileType } from '@common/enums/tile';
import { DoorTile } from '@app/classes/door-tile/door-tile';
import { IceTile } from '@app/classes/ice-tile/ice-tile';
import { Tile } from '@app/classes/tile/tile';
import { TileFactory } from '@app/classes/tile-factory/tile-factory';
import { WallTile } from '@app/classes/wall-tile/wall-tile';
import { WaterTile } from '@app/classes/water-tile/water-tile';

describe('TileFactory', () => {
    it('should create an instance', () => {
        expect(new TileFactory()).toBeTruthy();
    });
    describe('createTile', () => {
        it('should create a WallTile', () => {
            const tile = TileFactory.createTile(TileType.Wall * DECIMAL_TILE_BASE);
            expect(tile).toBeInstanceOf(WallTile);
        });

        it('should create a base Tile', () => {
            const tile = TileFactory.createTile(TileType.Base * DECIMAL_TILE_BASE);
            expect(tile).toBeInstanceOf(Tile);
            expect(tile.type).toBe(TileType.Base);
        });

        it('should create an IceTile', () => {
            const tile = TileFactory.createTile(TileType.Ice * DECIMAL_TILE_BASE);
            expect(tile).toBeInstanceOf(IceTile);
        });

        it('should create a WaterTile', () => {
            const tile = TileFactory.createTile(TileType.Water * DECIMAL_TILE_BASE);
            expect(tile).toBeInstanceOf(WaterTile);
        });

        it('should create an open DoorTile', () => {
            const tile = TileFactory.createTile(TileType.DoorOpen * DECIMAL_TILE_BASE);
            expect(tile).toBeInstanceOf(DoorTile);
            expect(tile.type).toBe(TileType.DoorOpen);
        });

        it('should create a closed DoorTile', () => {
            const tile = TileFactory.createTile(TileType.DoorClosed * DECIMAL_TILE_BASE);
            expect(tile).toBeInstanceOf(DoorTile);
            expect(tile.type).toBe(TileType.DoorClosed);
        });

        it('should create a base Tile for unknown tile type', () => {
            const tileNumber = 999;
            const tile = TileFactory.createTile(tileNumber * DECIMAL_TILE_BASE);
            expect(tile).toBeInstanceOf(Tile);
            expect(tile.type).toBe(TileType.Base);
        });
    });
});
