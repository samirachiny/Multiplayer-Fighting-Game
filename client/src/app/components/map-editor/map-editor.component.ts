import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { CanvasHelper } from '@app/classes/canvas-helper/canvas-helper';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';
import { Tile } from '@app/classes/tile/tile';
import { ItemToolsComponent } from '@app/components/item-tools/item-tools.component';
import { TileToolsComponent } from '@app/components/tile-tools/tile-tools.component';
import { DRAG_DATA_ENABLED_INDEX, RIGHT_CLICK } from '@app/constants/consts';
import { Coordinate } from '@app/interfaces/coordinate';
import { DragService } from '@app/services/drag/drag.service';
import { ItemService } from '@app/services/item/item.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';

@Component({
    selector: 'app-map-editor',
    standalone: true,
    imports: [ItemToolsComponent, TileToolsComponent, CommonModule, MatRipple],
    templateUrl: './map-editor.component.html',
    styleUrl: './map-editor.component.scss',
})
export class MapEditorComponent implements AfterViewInit {
    @Input() gameMapEditor: GameMapEditor;
    @Output() mapChanged = new EventEmitter<number[][]>();
    @Output() mapReset = new EventEmitter<number[][]>();
    @ViewChild('map') canvas: ElementRef<HTMLCanvasElement>;
    @ViewChild('draggedDiv') draggedDiv: ElementRef<HTMLDivElement>;
    @ViewChild('draggedImg') draggedImg: ElementRef<HTMLImageElement>;
    leftPositionDiv: number;
    topPositionDiv: number;
    isShowDraggableDiv: boolean;
    private selectedTile: Tile;
    private isMousePressed: boolean;
    private isRightClick: boolean;

    constructor(
        private mapEditorService: MapEditorService,
        private itemService: ItemService,
        private dragService: DragService,
    ) {
        this.isShowDraggableDiv = false;
        this.isMousePressed = false;
        this.isRightClick = false;
    }

    get itemImage() {
        return this.dragService.divItemImage;
    }

    @HostListener('window:mouseup', ['$event'])
    onMouseUp(event: MouseEvent): void {
        event.preventDefault();
        this.isRightClick = false;
        this.isMousePressed = false;
        this.mapEditorService.clearCoordinateToUpdate();
        this.isShowDraggableDiv = false;
        this.mapChanged.emit(this.mapEditorService.getUpdateMap());
    }

    @HostListener('window:drop', ['$event'])
    onDrop(event: DragEvent) {
        event.preventDefault();
        if (!event.dataTransfer?.getData(DRAG_DATA_ENABLED_INDEX)) return;
        const isMouseInsideCanvas = CanvasHelper.isMouseInsideCanvas(event, this.canvas);
        const coordinate: Coordinate = CanvasHelper.getCanvasPosition(event, this.canvas, this.gameMapEditor.tileSize);
        if (this.dragService.draggedItem) {
            this.handleDropFromItemTools(isMouseInsideCanvas, coordinate);
        } else if (this.dragService.isStartDragFromTile()) {
            this.handleDropFromTile(isMouseInsideCanvas, coordinate);
            this.isShowDraggableDiv = false;
        }
        this.isMousePressed = false;
    }

    @HostListener('window:dragover', ['$event'])
    onDragOver(event: DragEvent) {
        this.isMousePressed = false;
        event.preventDefault();
    }

    ngAfterViewInit() {
        this.itemService.initializeItemCounts(this.gameMapEditor);
        this.mapEditorService.initialize(this.gameMapEditor, this.canvas);
    }

    onDragStart(event: DragEvent) {
        event.dataTransfer?.setData(DRAG_DATA_ENABLED_INDEX, JSON.stringify(true));
    }

    onMouseDown(event: MouseEvent): void {
        this.isRightClick = event.button === RIGHT_CLICK;
        const coordinate: Coordinate = CanvasHelper.getCanvasPosition(event, this.canvas, this.gameMapEditor.tileSize);
        if (this.mapEditorService.hasItem(coordinate)) {
            if (!this.isRightClick) {
                this.dragService.setDivItemImage(coordinate);
                [this.leftPositionDiv, this.topPositionDiv] = CanvasHelper.getItemPositionInCanvas(
                    this.canvas,
                    coordinate,
                    this.gameMapEditor.tileSize,
                );
                this.isShowDraggableDiv = true;
                return;
            }
            const removedItem = this.mapEditorService.getItem(coordinate);
            this.itemService.incrementItem(removedItem);
            this.mapEditorService.removeItem(coordinate);
            this.isMousePressed = true;
            return;
        }
        if (!this.selectedTile && !this.isRightClick) return;
        this.isMousePressed = this.mapEditorService.updateMap(coordinate, this.selectedTile, this.isRightClick);
    }

    onMouseMove(event: MouseEvent): void {
        event.preventDefault();
        if (!CanvasHelper.isMouseInsideCanvas(event, this.canvas)) return;
        if (!this.isMousePressed) return;
        const coordinate: Coordinate = CanvasHelper.getCanvasPosition(event, this.canvas, this.gameMapEditor.tileSize);
        if (this.mapEditorService.hasItem(coordinate) && !this.isRightClick && (this.selectedTile.isWall || this.selectedTile.isDoor)) {
            const removedItem = this.mapEditorService.getItem(coordinate);
            this.itemService.incrementItem(removedItem);
            this.mapEditorService.removeItem(coordinate);
        }
        this.mapEditorService.updateMap(coordinate, this.selectedTile, this.isRightClick);
    }

    disabledContextMenu(event: MouseEvent) {
        event.preventDefault();
    }

    handleDropFromItemTools(isMouseInsideCanvas: boolean, coord: Coordinate): void {
        if (isMouseInsideCanvas && this.dragService.handleDropFromItemTools(coord)) {
            this.mapChanged.emit(this.mapEditorService.getUpdateMap());
        }
    }

    handleDropFromTile(isMouseInsideCanvas: boolean, coord: Coordinate): void {
        this.dragService.handleDropFromTile(isMouseInsideCanvas, coord);
        this.mapChanged.emit(this.mapEditorService.getUpdateMap());
    }

    onSelectedTile(tile: Tile): void {
        this.selectedTile = tile.clone();
    }

    onResetMap(): void {
        this.mapEditorService.resetMap();
        this.itemService.initializeItemCounts(this.gameMapEditor);
        this.mapReset.emit(this.mapEditorService.getUpdateMap());
    }

    getCanvas(): ElementRef<HTMLCanvasElement> {
        return this.canvas;
    }
}
