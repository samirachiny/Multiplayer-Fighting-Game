import { GameMapEditor } from './game-map-editor';
import { GameMode, GameMapSize, ItemsPerMapSize } from '@common/enums/game-infos';
import { Tile } from '@app/classes/tile/tile';
import { Coordinate } from '@app/interfaces/coordinate';
import { ItemType } from '@common/enums/item';
import { DECIMAL_TILE_BASE } from '@app/constants/consts';
import { IceTile } from '@app/classes/ice-tile/ice-tile';
import { AttributeModifierItem } from '@app/classes/attribute-modifier-item/attribute-modifier-item';
import { ConditionalItem } from '@app/classes/conditional-item/conditional-item';
import { FlagItem } from '@app/classes/flag-item/flag-item';
import { GameModifierItem } from '@app/classes/game-modifier-item/game-modifier-item';
import { ItemCountHelper } from '@app/classes/item-count-helper/item-count-helper';
import { RandomItem } from '@app/classes/random-item/random-item';
import { StartingPointItem } from '@app/classes/start-position-item/start-position-item';
import { TileType } from '@common/enums/tile';

describe('GameMapEditor', () => {
    let gameMapEditor: GameMapEditor;
    const size = GameMapSize.Small;
    const gameMode = GameMode.Flag;
    const width = 500;
    const height = 500;

    beforeEach(() => {
        gameMapEditor = new GameMapEditor(size, gameMode, width, height);
        gameMapEditor.tiles[0][1] = new IceTile();
        gameMapEditor.tiles[0][1].setItem(new AttributeModifierItem(ItemType.BoostAttack));
    });

    describe('constructor', () => {
        it('should initialize the map with correct properties', () => {
            expect(gameMapEditor.size).toBe(size);
            expect(gameMapEditor.width).toBe(width);
            expect(gameMapEditor.height).toBe(height);
            expect(gameMapEditor.tiles.length).toBe(size);
            expect(gameMapEditor.tiles[0].length).toBe(size);
        });

        it('should initialize item counts', () => {
            expect(gameMapEditor.itemCounts.size).toBeGreaterThan(0);
        });
    });

    describe('initializeMap', () => {
        it('should create an empty map when no data is provided', () => {
            gameMapEditor['initializeEditableMap']([]);
            expect(gameMapEditor.tiles.every((row) => row.every((tile) => tile instanceof Tile))).toBeTrue();
        });

        it('should create a map based on provided data', () => {
            const data = [
                [DECIMAL_TILE_BASE, 2 * DECIMAL_TILE_BASE + ItemType.BoostAttack],
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                [3 * DECIMAL_TILE_BASE, 4 * DECIMAL_TILE_BASE],
            ];
            gameMapEditor = new GameMapEditor(2, gameMode, width, height, data);
            expect(gameMapEditor.tiles.length).toBe(2);
            expect(gameMapEditor.tiles[0].length).toBe(2);
            expect(gameMapEditor.tiles[0][0].type).toBe(TileType.Base);
            expect(gameMapEditor.tiles[0][1].type).toBe(TileType.Ice);
            expect(gameMapEditor.tiles[0][1].item?.type).toBe(ItemType.BoostAttack);
            expect(gameMapEditor.tiles[1][0].type).toBe(TileType.Water);
            expect(gameMapEditor.tiles[1][1].type).toBe(TileType.DoorOpen);
        });
    });

    describe('applyTile', () => {
        it('should apply a tile at the given position', () => {
            const newTile = new Tile();
            const pos: Coordinate = { x: 0, y: 0 };
            gameMapEditor.applyTile(pos, newTile);
            expect(gameMapEditor.tiles[0][0]).toBe(newTile);
        });

        it('should not apply a tile at an invalid position', () => {
            const newTile = new Tile();
            const pos: Coordinate = { x: -1, y: -1 };
            gameMapEditor.applyTile(pos, newTile);
            expect(gameMapEditor.tiles[0][0]).not.toBe(newTile);
        });
    });

    describe('clone', () => {
        it('should create a deep copy of the map', () => {
            const clonedMap = gameMapEditor.clone();
            expect(clonedMap).not.toBe(gameMapEditor);
            expect(clonedMap.size).toEqual(gameMapEditor.size);
            expect(clonedMap.width).toEqual(gameMapEditor.width);
            expect(clonedMap.height).toEqual(gameMapEditor.height);
            expect(clonedMap.tiles).not.toBe(gameMapEditor.tiles);
        });
    });

    describe('toData', () => {
        it('should convert the map to a 2D number array', () => {
            const data = gameMapEditor.toData();
            expect(data.length).toEqual(gameMapEditor.size);
            expect(data[0].length).toEqual(gameMapEditor.size);
            expect(data.every((row) => row.every((value) => typeof value === 'number'))).toBeTrue();
        });
    });

    describe('initializeItemCounts', () => {
        it('should initialize item counts correctly for small map', () => {
            gameMapEditor = new GameMapEditor(GameMapSize.Small, GameMode.Classic, width, height);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (gameMapEditor as any).initializeItemCounts();
            const itemCounts = gameMapEditor.itemCounts;
            expect(ItemCountHelper.getItemCount(new AttributeModifierItem(ItemType.BoostAttack), itemCounts)).toEqual(1);
            expect(ItemCountHelper.getItemCount(new AttributeModifierItem(ItemType.BoostDefense), itemCounts)).toEqual(1);
            expect(ItemCountHelper.getItemCount(new GameModifierItem(ItemType.DoubleIceBreak), itemCounts)).toEqual(1);
            expect(ItemCountHelper.getItemCount(new GameModifierItem(ItemType.DecreaseLoserWins), itemCounts)).toEqual(1);
            expect(ItemCountHelper.getItemCount(new ConditionalItem(ItemType.SwapOpponentLife), itemCounts)).toEqual(1);
            expect(ItemCountHelper.getItemCount(new ConditionalItem(ItemType.SecondChance), itemCounts)).toEqual(1);
            expect(ItemCountHelper.getItemCount(new RandomItem(), itemCounts)).toEqual(ItemsPerMapSize.Small);
            expect(ItemCountHelper.getItemCount(new StartingPointItem(), itemCounts)).toEqual(ItemsPerMapSize.Small);
            expect(itemCounts.get(new FlagItem())).toBeUndefined();
        });

        it('should initialize item counts correctly for medium map', () => {
            gameMapEditor = new GameMapEditor(GameMapSize.Medium, GameMode.Classic, width, height);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (gameMapEditor as any).initializeItemCounts();

            const itemCounts = gameMapEditor.itemCounts;

            expect(ItemCountHelper.getItemCount(new RandomItem(), itemCounts)).toEqual(ItemsPerMapSize.Medium);
            expect(ItemCountHelper.getItemCount(new StartingPointItem(), itemCounts)).toEqual(ItemsPerMapSize.Medium);
        });

        it('should initialize item counts correctly for large map', () => {
            gameMapEditor = new GameMapEditor(GameMapSize.Large, GameMode.Classic, width, height);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (gameMapEditor as any).initializeItemCounts();

            const itemCounts = gameMapEditor.itemCounts;

            expect(ItemCountHelper.getItemCount(new RandomItem(), itemCounts)).toEqual(ItemsPerMapSize.Large);
            expect(ItemCountHelper.getItemCount(new StartingPointItem(), itemCounts)).toEqual(ItemsPerMapSize.Large);
        });

        it('should add FlagItem for Flag game mode', () => {
            gameMapEditor = new GameMapEditor(GameMapSize.Small, GameMode.Flag, width, height);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (gameMapEditor as any).initializeItemCounts();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const itemCounts = (gameMapEditor as any)._itemCounts;

            expect(ItemCountHelper.getItemCount(new FlagItem(), itemCounts)).toEqual(1);
        });
    });

    describe('updateItemCounts', () => {
        beforeEach(() => {
            gameMapEditor = new GameMapEditor(GameMapSize.Small, GameMode.Classic, width, height);
            spyOn(ItemCountHelper, 'decrementItem');
        });

        it('should call ItemCountHelper.decrementItem with correct parameters', () => {
            const item = new AttributeModifierItem(ItemType.BoostAttack);
            gameMapEditor['updateItemCounts'](item);
            expect(ItemCountHelper.decrementItem).toHaveBeenCalledWith(item, gameMapEditor.itemCounts);
        });

        it('should handle null item', () => {
            gameMapEditor['updateItemCounts'](null);
            expect(ItemCountHelper.decrementItem).toHaveBeenCalledWith(null, gameMapEditor.itemCounts);
        });
    });
});
