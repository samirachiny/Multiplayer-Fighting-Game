import { TILE_IMAGES } from '@app/constants/image';
import { TileType } from '@common/enums/tile';
import { Item } from '@app/classes/item/item';
import { Tile } from '@app/classes/tile/tile';
import { DESCRIPTIONS } from '@app/constants/consts';

export class WallTile extends Tile {
    constructor() {
        super(TileType.Wall, TILE_IMAGES.wall, DESCRIPTIONS.wallTile);
        this.isWall = true;
    }

    setItem(item: Item | null): boolean {
        this._item = item;
        this._item = null;
        return false;
    }

    clone(): Tile {
        const tile = new WallTile();
        tile._item = this._item;
        return tile;
    }
}
