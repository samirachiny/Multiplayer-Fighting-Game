import { TILE_IMAGES } from '@app/constants/image';
import { TileType } from '@common/enums/tile';
import { Tile } from '@app/classes/tile/tile';
import { DESCRIPTIONS } from '@app/constants/consts';

export class IceTile extends Tile {
    constructor() {
        super(TileType.Ice, TILE_IMAGES.ice, DESCRIPTIONS.iceTile);
    }

    clone(): Tile {
        const tile = new IceTile();
        tile._item = this._item;
        return tile;
    }
}
