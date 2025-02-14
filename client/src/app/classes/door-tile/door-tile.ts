import { TILE_IMAGES } from '@app/constants/image';
import { TileType } from '@common/enums/tile';
import { Item } from '@app/classes/item/item';
import { Tile } from '@app/classes/tile/tile';
import { DESCRIPTIONS } from '@app/constants/consts';

export class DoorTile extends Tile {
    constructor(type: TileType) {
        const image: string = type === TileType.DoorClosed ? TILE_IMAGES.doorClosed : TILE_IMAGES.doorOpened;
        super(type, image, DESCRIPTIONS.doorTile);
        this.isDoor = true;
    }

    toggleDoor(): void {
        this._type = this._type === TileType.DoorOpen ? TileType.DoorClosed : TileType.DoorOpen;
        this._image = this._type === TileType.DoorClosed ? TILE_IMAGES.doorClosed : TILE_IMAGES.doorOpened;
    }
    setItem(item: Item | null): boolean {
        this._item = item;
        this._item = null;
        return false;
    }

    clone(): Tile {
        const tile = new DoorTile(this.type);
        tile._item = this._item;
        return tile;
    }
}
