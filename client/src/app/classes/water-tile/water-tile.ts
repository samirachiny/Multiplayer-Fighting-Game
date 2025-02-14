import { TILE_IMAGES } from '@app/constants/image';
import { TileType } from '@common/enums/tile';
import { Tile } from '@app/classes/tile/tile';
import { DESCRIPTIONS } from '@app/constants/consts';

export class WaterTile extends Tile {
    constructor() {
        super(TileType.Water, TILE_IMAGES.water, DESCRIPTIONS.waterTile);
    }

    clone(): Tile {
        const tile = new WaterTile();
        tile._item = this._item;
        return tile;
    }
}
