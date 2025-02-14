import { ElementRef, Injectable } from '@angular/core';
import { DoorTile } from '@app/classes/door-tile/door-tile';
import { Item } from '@app/classes/item/item';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';
import { Tile } from '@app/classes/tile/tile';
import { Coordinate } from '@app/interfaces/coordinate';
import { DrawService } from '@app/services/draw/draw.service';
import { MAX_COLOR_VALUE } from '@app/constants/consts';

@Injectable({
    providedIn: 'root',
})
export class MapEditorService {
    private originalMap: GameMapEditor;
    private map: GameMapEditor;
    private updatePositions: Coordinate[];
    private invalidPositions: Coordinate[];

    constructor(private drawService: DrawService) {
        this.updatePositions = [];
        this.invalidPositions = [];
    }

    initialize(map: GameMapEditor, canvas: ElementRef<HTMLCanvasElement>): void {
        this.originalMap = map;
        this.map = map.clone();
        this.drawService.initialize(canvas, map.tileSize);
        this.drawService.drawGameMap(this.originalMap);
    }

    applyItem(coordinate: Coordinate, item: Item): boolean {
        if (!this.map.applyItem(coordinate, item)) return false;
        this.drawService.drawTile(coordinate, this.getTile(coordinate));
        return true;
    }

    getItem(coordinate: Coordinate): Item | null {
        return this.getTile(coordinate).item;
    }
    removeItem(coordinate: Coordinate): void {
        this.map.removeItem(coordinate);
        this.drawService.drawTile(coordinate, this.getTile(coordinate));
    }

    hasItem(coordinate: Coordinate): boolean {
        return this.map.hasItem(coordinate);
    }

    clearCoordinateToUpdate(): void {
        this.updatePositions = [];
    }

    hightLightNoAccessTiles(accessPosTiles: Coordinate[]) {
        if (accessPosTiles.length === 0) return;
        this.getAllTilePositions().forEach((posTile) => {
            const isAccessTiles = accessPosTiles.some((pos) => pos.x === posTile.x && pos.y === posTile.y);
            if (!(isAccessTiles || this.getTile({ x: posTile.y, y: posTile.x }).isWall)) {
                this.invalidPositions.push(posTile);
                this.drawService.drawHighlight(posTile, { red: MAX_COLOR_VALUE, green: 0, blue: 0 });
            }
        });
    }

    hightLightInvalidDoors(invalidDoorsPos: Coordinate[]) {
        invalidDoorsPos.forEach((invalidDoorPos) => {
            this.invalidPositions.push(invalidDoorPos);
            this.drawService.drawHighlight(invalidDoorPos, { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
        });
    }

    removeHightLightFormTile(): void {
        if (this.invalidPositions.length === 0) return;
        this.invalidPositions.forEach((pos) => this.drawService.drawTile({ x: pos.y, y: pos.x }, this.getTile({ x: pos.y, y: pos.x })));
        this.invalidPositions = [];
    }

    updateMap(coordinate: Coordinate, tile: Tile, isRemove: boolean): boolean {
        this.removeHightLightFormTile();
        if (!this.map.isValidPosition(coordinate)) return false;
        if (this.updatePositions.some((coord) => coord.x === coordinate.x && coord.y === coordinate.y)) return false;
        this.updatePositions.push(coordinate);
        if (isRemove) {
            this.removeTile(coordinate);
            return true;
        }
        this.applyTile(coordinate, tile);
        return true;
    }

    getUpdateMap(): number[][] {
        return this.map.toData();
    }

    resetMap() {
        this.map = this.originalMap.clone();
        this.drawService.drawGameMap(this.map);
    }
    private getTile(coordinate: Coordinate): Tile {
        return this.map.tiles[coordinate.x][coordinate.y];
    }
    private applyTile(coordinate: Coordinate, tile: Tile): void {
        if (!tile) return;
        tile = tile.clone();
        const tileMap = this.getTile(coordinate);
        if (!tileMap) return;
        tile.setItem(tileMap.item);
        if (tile.isDoor && tileMap.isDoor) {
            tile = tileMap.clone();
            (tile as DoorTile).toggleDoor();
        }
        this.map.applyTile(coordinate, tile);
        this.drawService.drawTile(coordinate, tile);
    }

    private removeTile(coordinate: Coordinate) {
        const tileMap = this.getTile(coordinate);
        const baseTile = new Tile();
        baseTile.setItem(tileMap.item);
        this.map.applyTile(coordinate, baseTile);
        this.drawService.drawTile(coordinate, baseTile);
    }

    private getAllTilePositions(): Coordinate[] {
        const posTiles: Coordinate[] = [];
        Array.from({ length: this.map.size }, (_, i) => Array.from({ length: this.map.size }, (__, j) => posTiles.push({ x: i, y: j })));
        return posTiles;
    }
}
