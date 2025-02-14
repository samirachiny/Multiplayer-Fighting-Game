import { TileType } from '@common/enums/tile';
import { DoorTile } from '@app/classes/door-tile/door-tile';
import { IceTile } from '@app/classes/ice-tile/ice-tile';
import { Tile } from '@app/classes/tile/tile';
import { WallTile } from '@app/classes/wall-tile/wall-tile';
import { WaterTile } from '@app/classes/water-tile/water-tile';
import { DECIMAL_TILE_BASE } from '@app/constants/consts';

export class TileFactory {
    static createTile(value: number): Tile {
        const tileValue = Math.floor(value / DECIMAL_TILE_BASE);
        switch (tileValue) {
            case TileType.Wall:
                return new WallTile();
            case TileType.Base:
                return new Tile();
            case TileType.Ice:
                return new IceTile();
            case TileType.Water:
                return new WaterTile();
            case TileType.DoorOpen:
                return new DoorTile(TileType.DoorOpen);
            case TileType.DoorClosed:
                return new DoorTile(TileType.DoorClosed);
            default:
                return new Tile();
        }
    }
}
