import { ItemType } from '@common/enums/item';

export class Item {
    protected _image: string;
    protected _type: ItemType;
    protected _description: string;

    constructor(image: string, type: ItemType, description: string) {
        this._image = image;
        this._type = type;
        this._description = description;
    }

    get image(): string {
        return this._image;
    }

    get type(): ItemType {
        return this._type;
    }

    get data(): number {
        return this.type;
    }

    get description(): string {
        return this._description;
    }

    clone(): Item {
        return new Item(this.image, this.type, this._description);
    }
}
