import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item/item';
import { Coordinate } from '@app/interfaces/coordinate';
import { ItemService } from '@app/services/item/item.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';

@Injectable({
    providedIn: 'root',
})
export class DragService {
    isDragSuccess: boolean;
    draggedItem: Item | null;
    private _divItemImage: string;
    private _startDragCoordinate: Coordinate | null;

    constructor(
        private mapEditorService: MapEditorService,
        private itemService: ItemService,
    ) {
        this.draggedItem = null;
        this._startDragCoordinate = null;
        this.isDragSuccess = false;
    }

    get divItemImage(): string {
        return this._divItemImage;
    }

    isStartDragFromTile(): boolean {
        return this._startDragCoordinate !== null;
    }

    setDivItemImage(coordinate: Coordinate): void {
        this._startDragCoordinate = coordinate;
        const item = this.mapEditorService.getItem(coordinate);
        if (!item) return;
        this._divItemImage = item.image;
    }

    handleDropFromItemTools(coord: Coordinate): boolean {
        if (!this.draggedItem) return false;
        this.isDragSuccess = this.mapEditorService.applyItem(coord, this.draggedItem);
        if (this.isDragSuccess) this.itemService.decrementItem(this.draggedItem);
        return this.isDragSuccess;
    }

    handleDropFromTile(isMouseInsideCanvas: boolean, coord: Coordinate): void {
        this.mapEditorService.removeHightLightFormTile();
        if (!this._startDragCoordinate) return;
        const item = this.mapEditorService.getItem(this._startDragCoordinate);
        if (!isMouseInsideCanvas) {
            this.mapEditorService.removeItem(this._startDragCoordinate);
            this.itemService.incrementItem(item);
            return;
        }
        if (item && this.mapEditorService.applyItem(coord, item)) this.mapEditorService.removeItem(this._startDragCoordinate);
        this._startDragCoordinate = null;
    }
}
