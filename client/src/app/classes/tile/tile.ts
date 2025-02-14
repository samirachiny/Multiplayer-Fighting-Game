import { TILE_IMAGES } from '@app/constants/image';
import { TileType } from '@common/enums/tile';
import { Item } from '@app/classes/item/item';
import { DESCRIPTIONS } from '@app/constants/consts';

export class Tile {
    isDoor: boolean;
    isWall: boolean;
    protected _type: TileType;
    protected _image: string;
    protected _description: string;
    protected _item: Item | null;

    constructor(type: TileType = TileType.Base, image: string = TILE_IMAGES.grass, description: string = DESCRIPTIONS.tile) {
        this.isDoor = false;
        this.isWall = false;
        this._item = null;
        this._type = type;
        this._image = image;
        this._description = description;
    }

    get type(): TileType {
        return this._type;
    }

    get description(): string {
        return this._description;
    }

    get image(): string {
        return this._image;
    }

    get data(): number {
        return this._type;
    }

    get item(): Item | null {
        return this._item;
    }

    setItem(item: Item | null): boolean {
        if (this._item) return false;
        this._item = item;
        return true;
    }

    removeItem() {
        this._item = null;
    }

    clone(): Tile {
        const tile = new Tile();
        tile._item = this._item;
        return tile;
    }
}
