import { ItemType } from '@common/enums/item';
import { ItemFactory } from '@app/classes/item-factory/item-factory';
import { TileFactory } from '@app/classes/tile-factory/tile-factory';
import { Coordinate } from '@common/interfaces/coordinate';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { DoorState, TileType } from '@common/enums/tile';
import { DoorTile } from '@app/classes/door-tile/door-tile';
import { GameMapInterface } from '@app/classes/game-map-interface/game-map-interface';
import { Tile } from '@app/classes/tile/tile';

export class GameMap extends GameMapInterface {
    players: PlayerInfos[];
    constructor(size: number, width: number, height: number, data: number[][], players: PlayerInfos[] = []) {
        super(size, width, height);
        this.players = players;
        this.initializeMap(data);
    }

    toggleDoor(pos: Coordinate, doorState: DoorState) {
        const doorTileType = doorState === DoorState.Open ? TileType.DoorOpen : TileType.DoorClosed;
        this._tiles[pos.x][pos.y] = new DoorTile(doorTileType);
    }

    hasPlayer(pos: Coordinate): boolean {
        if (!this.isValidPosition(pos)) return false;
        return this.players.some((player) => player.currentPosition?.x === pos.x && player.currentPosition?.y === pos.y);
    }

    getPlayer(pos: Coordinate): PlayerInfos | null {
        for (const player of this.players) {
            if (player.currentPosition?.x === pos.x && player.currentPosition?.y === pos.y) return player;
        }
        return null;
    }

    hasStartPoint(pos: Coordinate) {
        if (!this.isValidPosition(pos)) return false;
        return this.getTile(pos).item?.type === ItemType.StartingPoint;
    }

    private initializeMap(data: number[][]): void {
        this._tiles = Array.from({ length: this.size }, (_, row) => Array.from({ length: this.size }, (__, col) => this.createTile(data, row, col)));
    }

    private createTile(data: number[][], row: number, col: number): Tile {
        const value = data[row][col];
        const tile = TileFactory.createTile(value);
        const item = ItemFactory.createItem(value);
        const isPlayerAtPosition = this.isPlayerAtPosition(row, col);
        if (item && (item.type !== ItemType.StartingPoint || isPlayerAtPosition)) {
            tile.setItem(item);
        }
        return tile;
    }

    private isPlayerAtPosition(row: number, col: number): boolean {
        return this.players.some((player) => player.startPosition?.x === row && player.startPosition?.y === col);
    }
}
