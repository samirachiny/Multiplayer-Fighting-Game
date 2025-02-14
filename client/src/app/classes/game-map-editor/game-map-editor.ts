import { DECIMAL_TILE_BASE, ITEMS_MAX_PER_MAP_SIZE } from '@app/constants/consts';
import { ItemType } from '@common/enums/item';
import { Coordinate } from '@app/interfaces/coordinate';
import { GameMode } from '@common/enums/game-infos';
import { AttributeModifierItem } from '@app/classes/attribute-modifier-item/attribute-modifier-item';
import { ConditionalItem } from '@app/classes/conditional-item/conditional-item';
import { FlagItem } from '@app/classes/flag-item/flag-item';
import { GameModifierItem } from '@app/classes/game-modifier-item/game-modifier-item';
import { GameMapInterface } from '@app/classes/game-map-interface/game-map-interface';
import { ItemCountHelper } from '@app/classes/item-count-helper/item-count-helper';
import { ItemFactory } from '@app/classes/item-factory/item-factory';
import { Item } from '@app/classes/item/item';
import { RandomItem } from '@app/classes/random-item/random-item';
import { StartingPointItem } from '@app/classes/start-position-item/start-position-item';
import { TileFactory } from '@app/classes/tile-factory/tile-factory';
import { Tile } from '@app/classes/tile/tile';

export class GameMapEditor extends GameMapInterface {
    private _numberItemPerSize: { [key: number]: number };
    private _gameMode: GameMode;

    constructor(size: number, gameMode: GameMode, width: number, height: number, data: number[][] = []) {
        super(size, width, height);
        this._gameMode = gameMode;
        this._numberItemPerSize = ITEMS_MAX_PER_MAP_SIZE;
        this.initializeItemCounts();
        this.initializeEditableMap(data);
    }

    applyTile(pos: Coordinate, tile: Tile): void {
        if (this.isValidPosition(pos)) {
            this.tiles[pos.x][pos.y] = tile;
        }
    }

    clone(): GameMapEditor {
        const newMap = new GameMapEditor(this.size, this._gameMode, this._width, this._height);
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                newMap.tiles[x][y] = this.getTile({ x, y }).clone();
            }
        }
        return newMap;
    }

    toData(): number[][] {
        return Array.from({ length: this.size }, (_, x) =>
            Array.from({ length: this.size }, (__, y) => {
                const tileValue: number = this.getTile({ x, y }).data;
                const item = this.getTile({ x, y }).item;
                let itemValue = 0;
                if (item) itemValue = item.data;
                return tileValue * DECIMAL_TILE_BASE + itemValue;
            }),
        );
    }
    private initializeEditableMap(data: number[][]): void {
        if (this.isDataEmpty(data)) {
            this.createEmptyTiles();
            return;
        }
        this.createTilesFromData(data);
    }

    private isDataEmpty(data: number[][]): boolean {
        return data && data.length === 0;
    }

    private createEmptyTiles(): void {
        this._tiles = Array.from({ length: this.size }, () => Array.from({ length: this.size }, () => new Tile()));
    }

    private createTilesFromData(data: number[][]): void {
        this._tiles = Array.from({ length: this.size }, (_, row) =>
            Array.from({ length: this.size }, (__, col) => this.createTileWithItem(data, row, col)),
        );
    }

    private createTileWithItem(data: number[][], row: number, col: number): Tile {
        const value = data[row][col];
        const tile = TileFactory.createTile(value);
        const item = ItemFactory.createItem(value);
        if (item) {
            tile.setItem(item);
            this.updateItemCounts(item);
        }
        return tile;
    }

    private initializeItemCounts(): void {
        const nbRandomItemsAndStartingPoints = this._numberItemPerSize[this._size];
        this._itemCounts.set(new AttributeModifierItem(ItemType.BoostAttack), 1);
        this._itemCounts.set(new AttributeModifierItem(ItemType.BoostDefense), 1);
        this._itemCounts.set(new GameModifierItem(ItemType.DoubleIceBreak), 1);
        this._itemCounts.set(new GameModifierItem(ItemType.DecreaseLoserWins), 1);
        this._itemCounts.set(new ConditionalItem(ItemType.SwapOpponentLife), 1);
        this._itemCounts.set(new ConditionalItem(ItemType.SecondChance), 1);
        this._itemCounts.set(new RandomItem(), nbRandomItemsAndStartingPoints);
        this._itemCounts.set(new StartingPointItem(), nbRandomItemsAndStartingPoints);
        if (this._gameMode === GameMode.Flag) this._itemCounts.set(new FlagItem(), 1);
    }

    private updateItemCounts(item: Item | null): void {
        ItemCountHelper.decrementItem(item, this.itemCounts);
    }
}
