/* eslint-disable @typescript-eslint/no-explicit-any */
import { GameMapInterface } from './game-map-interface';
import { GameMapSize } from '@common/enums/game-infos';
import { Item } from '@app/classes/item/item';
import { Coordinate } from '@app/interfaces/coordinate';
import { ItemType } from '@common/enums/item';
import { IceTile } from '@app/classes/ice-tile/ice-tile';
import { AttributeModifierItem } from '@app/classes/attribute-modifier-item/attribute-modifier-item';
import { Tile } from '@app/classes/tile/tile';
import { TileType } from '@common/enums/tile';

class TestableGameMapInterface extends GameMapInterface {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(size: number, width: number, height: number) {
        super(size, width, height);
    }
}
describe('GameMapInterface', () => {
    let gameMapInterface: GameMapInterface;
    const size = GameMapSize.Small;
    const width = 500;
    const height = 500;

    beforeEach(() => {
        gameMapInterface = new TestableGameMapInterface(size, width, height);
        gameMapInterface['_tiles'] = [
            [null, null],
            [null, null],
        ] as any;
        gameMapInterface.tiles[0][1] = new IceTile();
        gameMapInterface.tiles[0][1].setItem(new AttributeModifierItem(ItemType.BoostAttack));
    });

    describe('constructor', () => {
        it('should initialize the map with correct properties', () => {
            expect(gameMapInterface.size).toBe(size);
            expect(gameMapInterface.width).toBe(width);
            expect(gameMapInterface.height).toBe(height);
        });
    });

    describe('getters', () => {
        it('should return the correct tiles', () => {
            expect(gameMapInterface.tiles).toBe(gameMapInterface['_tiles']);
        });

        it('should calculate the correct tileSize', () => {
            const expectedTileSize = width / size;
            expect(gameMapInterface.tileSize).toBe(expectedTileSize);
        });

        it('should return the correct width', () => {
            expect(gameMapInterface.width).toBe(width);
        });

        it('should return the correct size', () => {
            expect(gameMapInterface.size).toBe(size);
        });

        it('should return the correct height', () => {
            expect(gameMapInterface.height).toBe(height);
        });

        it('should return the correct itemCounts', () => {
            expect(gameMapInterface.itemCounts).toBe(gameMapInterface['_itemCounts']);
        });
    });
    describe('applyItem', () => {
        it('should apply an item at the given position', () => {
            const item = { type: ItemType.BoostAttack } as Item;
            gameMapInterface.tiles[0][0] = new IceTile();
            const pos: Coordinate = { x: 0, y: 0 };
            const result = gameMapInterface.applyItem(pos, item);
            expect(result).toBeTrue();
            expect(gameMapInterface.tiles[0][0].item).toEqual(item);
        });

        it('should return false for an invalid position', () => {
            const item = { type: ItemType.BoostAttack } as Item;
            const pos: Coordinate = { x: -1, y: -1 };
            const result = gameMapInterface.applyItem(pos, item);
            expect(result).toBeFalse();
        });
    });

    describe('removeItem', () => {
        it('should remove an item from the given position', () => {
            const item = { type: ItemType.BoostAttack } as Item;
            const pos: Coordinate = { x: 0, y: 0 };
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            const tile = new Tile();
            tile.setItem(item);
            gameMapInterface['_tiles'] = [[tile]];
            gameMapInterface.removeItem(pos);
            expect(gameMapInterface.tiles[0][0].item).toBeNull();
        });
    });

    describe('hasItem', () => {
        it('should return true if the position has an item', () => {
            const item = { type: ItemType.BoostAttack } as Item;
            const pos: Coordinate = { x: 0, y: 0 };
            gameMapInterface['_tiles'] = [[{ item } as any]];
            expect(gameMapInterface.hasItem(pos)).toBeTrue();
        });

        it('should return false if the position has no item', () => {
            const pos: Coordinate = { x: 0, y: 0 };
            gameMapInterface['_tiles'] = [[{ item: null } as Tile]];
            expect(gameMapInterface.hasItem(pos)).toBeFalse();
        });

        it('should return false for an invalid position', () => {
            const pos: Coordinate = { x: -1, y: -1 };
            expect(gameMapInterface.hasItem(pos)).toBeFalse();
        });
    });

    describe('hasClosedDoor', () => {
        it('should return true if the position has closed door', () => {
            const pos: Coordinate = { x: 0, y: 0 };
            gameMapInterface['_tiles'] = [[{ type: TileType.DoorClosed } as Tile]];
            expect(gameMapInterface.hasClosedDoor(pos)).toBeTrue();
        });

        it('should return false if the position has no closed door', () => {
            const pos: Coordinate = { x: 0, y: 0 };
            gameMapInterface['_tiles'] = [[{ type: TileType.DoorOpen } as Tile]];
            expect(gameMapInterface.hasClosedDoor(pos)).toBeFalse();
        });

        it('should return false for an invalid position', () => {
            const pos: Coordinate = { x: -1, y: -1 };
            expect(gameMapInterface.hasClosedDoor(pos)).toBeFalse();
        });
    });

    describe('hasWall', () => {
        it('should return true if the position has wall', () => {
            const pos: Coordinate = { x: 0, y: 0 };
            gameMapInterface['_tiles'] = [[{ type: TileType.Wall } as Tile]];
            expect(gameMapInterface.hasWall(pos)).toBeTrue();
        });

        it('should return false if the position has no wall', () => {
            const pos: Coordinate = { x: 0, y: 0 };
            gameMapInterface['_tiles'] = [[{ type: TileType.Base } as Tile]];
            expect(gameMapInterface.hasWall(pos)).toBeFalse();
        });

        it('should return false for an invalid position', () => {
            const pos: Coordinate = { x: -1, y: -1 };
            expect(gameMapInterface.hasWall(pos)).toBeFalse();
        });
    });

    describe('isValidPosition', () => {
        it('should return true for valid positions', () => {
            expect(gameMapInterface.isValidPosition({ x: 0, y: 0 })).toBeTrue();
            expect(gameMapInterface.isValidPosition({ x: size - 1, y: size - 1 })).toBeTrue();
        });

        it('should return false for invalid positions', () => {
            expect(gameMapInterface.isValidPosition({ x: -1, y: 0 })).toBeFalse();
            expect(gameMapInterface.isValidPosition({ x: 0, y: -1 })).toBeFalse();
            expect(gameMapInterface.isValidPosition({ x: size, y: 0 })).toBeFalse();
            expect(gameMapInterface.isValidPosition({ x: 0, y: size })).toBeFalse();
        });
    });
});
