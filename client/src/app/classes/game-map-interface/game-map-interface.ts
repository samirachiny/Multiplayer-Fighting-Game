import { Tile } from '@app/classes/tile/tile';
import { Item } from '@app/classes/item/item';
import { Coordinate } from '@common/interfaces/coordinate';
import { TileType } from '@common/enums/tile';

export class GameMapInterface {
    protected _tiles: Tile[][];
    protected _size: number;
    protected _width: number;
    protected _itemCounts: Map<Item, number>;
    protected _height: number;
    protected constructor(size: number, width: number, height: number) {
        this._size = size;
        this._width = width;
        this._height = height;
        this._itemCounts = new Map<Item, number>();
        this._tiles = [];
    }
    get tiles(): Tile[][] {
        return this._tiles;
    }

    get tileSize(): number {
        return this._width / this.size;
    }

    get width(): number {
        return this._width;
    }

    get size(): number {
        return this._size;
    }

    get height(): number {
        return this._height;
    }

    get itemCounts(): Map<Item, number> {
        return this._itemCounts;
    }

    hasItem(pos: Coordinate): boolean {
        if (!this.isValidPosition(pos)) return false;
        return this.getTile(pos).item !== null;
    }

    hasClosedDoor(pos: Coordinate) {
        if (!this.isValidPosition(pos)) return false;
        return this.getTile(pos).type === TileType.DoorClosed;
    }

    hasWall(pos: Coordinate) {
        if (!this.isValidPosition(pos)) return false;
        return this.getTile(pos).type === TileType.Wall;
    }
    applyItem(pos: Coordinate, item: Item): boolean {
        if (!this.isValidPosition(pos)) return false;
        return this.getTile(pos).setItem(item);
    }
    isValidPosition(pos: Coordinate): boolean {
        return pos.x >= 0 && pos.x < this.size && pos.y >= 0 && pos.y < this.size;
    }

    removeItem(pos: Coordinate): void {
        this.getTile(pos).removeItem();
    }

    protected getTile(coords: Coordinate): Tile {
        return this._tiles[coords.x][coords.y];
    }
}
