import { ElementRef, Injectable } from '@angular/core';
import { GameMap } from '@app/classes/game-map/game-map';
import { DrawService } from '@app/services/draw/draw.service';
import { Coordinate } from '@common/interfaces/coordinate';
import { Tile } from '@app/classes/tile/tile';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { TILE_IMAGES } from '@app/constants/image';
import { DoorState } from '@common/enums/tile';
import { MAX_COLOR_VALUE } from '@app/constants/consts';
import { ItemType } from '@common/enums/item';
import { ItemFactory } from '@app/classes/item-factory/item-factory';
import { Color } from '@app/interfaces/color';

@Injectable({
    providedIn: 'root',
})
export class GameMapService {
    isMapInteractionEnabled: boolean;
    private map: GameMap;
    private hightLightPositions: Coordinate[];
    private rememberPath: Coordinate[];

    constructor(private drawService: DrawService) {
        this.hightLightPositions = [];
        this.rememberPath = [];
        this.isMapInteractionEnabled = false;
    }

    initialize(map: GameMap, canvas: ElementRef<HTMLCanvasElement>): void {
        this.map = map;
        this.drawService.initialize(canvas, map.tileSize);
        this.drawService.drawGameMap(this.map);
    }

    setPlayers(players: PlayerInfos[]): void {
        this.map.players = [];
        players.forEach((player) => {
            if (!player.isGiveUp) this.map.players.push(player);
        });
    }

    toggleDoor(pos: Coordinate, doorState: DoorState) {
        this.map.toggleDoor(pos, doorState);
        this.drawService.drawTile(pos, this.getTile(pos));
    }

    movePlayer(player: PlayerInfos): void {
        if (!player.previousPosition) return;
        this.drawService.drawTile(player.previousPosition, this.getTile(player.previousPosition));
        this.drawService.drawPlayer(player);
    }

    shouldTeleportTo(pos: Coordinate) {
        if (!this.map.isValidPosition(pos)) return false;
        return !(
            this.map.hasPlayer(pos) ||
            (this.map.hasItem(pos) && !this.map.hasStartPoint(pos)) ||
            this.map.hasWall(pos) ||
            this.map.hasClosedDoor(pos)
        );
    }

    showIceBreak(pos: Coordinate): void {
        this.drawService.drawImage({ x: pos.y, y: pos.x }, TILE_IMAGES.iceBreak);
    }

    hightLightTiles(hightLightPositions: Coordinate[], color: Color) {
        this.removeHightLightFormTile();
        this.hightLightPositions = hightLightPositions;
        hightLightPositions.forEach((pos: Coordinate) => {
            this.drawService.drawHighlight(pos, color);
        });
    }

    isAccessiblePosition(pos: Coordinate) {
        return this.hightLightPositions.some((position) => position.x === pos.x && position.y === pos.y);
    }

    showPath(path: Coordinate[]): void {
        this.erasePath();
        this.rememberPath = path;
        path.forEach((pos: Coordinate) => this.drawService.drawCircle(pos));
    }

    erasePath(): void {
        this.rememberPath.forEach((pos) => {
            if (this.hasPlayer({ x: pos.y, y: pos.x })) return;
            this.drawService.drawTile({ x: pos.y, y: pos.x }, this.getTile({ x: pos.y, y: pos.x }));
            this.drawService.drawHighlight(pos, { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
        });
        this.resetPath();
    }

    resetPath() {
        this.rememberPath = [];
    }

    replaceItem(pos: Coordinate, itemNumber: ItemType): void {
        const item = ItemFactory.createItem(itemNumber);
        if (!item) return;
        this.map.applyItem(pos, item);
        this.drawService.drawTile(pos, this.getTile(pos));
        this.redrawPlayer(pos);
        if (this.isAccessiblePosition(pos)) this.drawService.drawHighlight(pos, { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
    }

    removeItem(pos: Coordinate): void {
        this.map.removeItem({ x: pos.y, y: pos.x });
        this.drawService.drawTile({ x: pos.y, y: pos.x }, this.getTile({ x: pos.y, y: pos.x }));
        this.redrawPlayer({ x: pos.y, y: pos.x });
    }

    removeHightLightFormTile() {
        if (!this.hightLightPositions.length) return;
        this.hightLightPositions.forEach((pos) => {
            this.drawService.drawTile({ x: pos.y, y: pos.x }, this.getTile({ x: pos.y, y: pos.x }));
            this.redrawPlayer({ x: pos.y, y: pos.x });
        });
        this.hightLightPositions = [];
    }

    removePlayer(player: PlayerInfos) {
        if (player.startPosition) {
            this.map.removeItem(player.startPosition);
            this.drawService.drawTile(player.startPosition, this.getTile(player.startPosition));
        }
        if (player.currentPosition) this.drawService.drawTile(player.currentPosition, this.getTile(player.currentPosition));
    }

    replacePlayer(player: PlayerInfos) {
        if (!player.currentPosition) return;
        this.drawService.drawTile(player.currentPosition, this.getTile(player.currentPosition));
        this.drawService.drawPlayer(player);
    }

    getTileInfos(pos: Coordinate): Tile | PlayerInfos | null {
        if (!this.map.isValidPosition(pos)) return null;
        if (this.hasPlayer(pos)) return this.map.getPlayer(pos);
        return this.getTile(pos);
    }
    private hasPlayer(position: Coordinate): boolean {
        return this.map.hasPlayer(position);
    }

    private getPlayer(coordinate: Coordinate): PlayerInfos | null {
        return this.map.getPlayer(coordinate);
    }
    private getTile(coordinate: Coordinate): Tile {
        return this.map.tiles[coordinate.x][coordinate.y];
    }
    private redrawPlayer(pos: Coordinate): void {
        if (!this.hasPlayer(pos)) return;
        const player = this.getPlayer(pos);
        if (player) this.drawService.drawPlayer(player);
    }
}
