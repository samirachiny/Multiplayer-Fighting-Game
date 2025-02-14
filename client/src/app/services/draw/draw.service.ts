import { ElementRef, Injectable } from '@angular/core';
import { GameMap } from '@app/classes/game-map/game-map';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';
import { Tile } from '@app/classes/tile/tile';
import { Coordinate } from '@app/interfaces/coordinate';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { ImageService } from '@app/services/image/image.service';
import { CIRCLE_RADIUS_SCALE, CANVAS_DIMENSION, HIGH_LIGHT_OPACITY, CIRCLE_COLOR } from '@app/constants/consts';
import { Color } from '@app/interfaces/color';

@Injectable({
    providedIn: 'root',
})
export class DrawService {
    private canvas: ElementRef<HTMLCanvasElement>;
    private context: CanvasRenderingContext2D | null;
    private tileSize: number;

    constructor(private imageService: ImageService) {}

    initialize(canvas: ElementRef<HTMLCanvasElement>, tileSize: number): void {
        this.canvas = canvas;
        this.tileSize = tileSize;
        this.context = this.canvas.nativeElement.getContext(CANVAS_DIMENSION);
    }

    drawGameMap(map: GameMapEditor | GameMap): void {
        for (let x = 0; x < map.size; x++) {
            for (let y = 0; y < map.tiles[x].length; y++) {
                const tile = map.tiles[x][y];
                this.drawTile({ x, y }, tile);
            }
        }
        if (map instanceof GameMap) this.drawPlayers(map.players);
    }

    drawTile(coordinate: Coordinate, tile: Tile): void {
        this.drawImage(coordinate, tile.image);
        if (tile.item) this.drawImage(coordinate, tile.item.image);
    }

    drawPlayers(players: PlayerInfos[]): void {
        players.forEach((player) => this.drawPlayer(player));
    }

    drawPlayer(player: PlayerInfos) {
        if (!player.currentPosition) return;
        this.drawImage(player.currentPosition, player.character.imagePath);
    }

    drawImage(coordinate: Coordinate, imagePath: string): void {
        const img = this.getImage(imagePath);
        if (!(img && this.context)) return;
        this.context.drawImage(img, coordinate.x * this.tileSize, coordinate.y * this.tileSize, this.tileSize, this.tileSize);
    }

    drawCircle(pos: Coordinate): void {
        if (!this.context) return;
        const radius = this.tileSize / CIRCLE_RADIUS_SCALE;
        const centerX = pos.y * this.tileSize + this.tileSize / 2;
        const centerY = pos.x * this.tileSize + this.tileSize / 2;
        this.context.beginPath();
        this.context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.context.fillStyle = CIRCLE_COLOR;
        this.context.fill();
    }

    drawHighlight(coordinate: Coordinate, color: Color): void {
        if (!this.context) return;
        this.context.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, ${HIGH_LIGHT_OPACITY})`;
        this.context.fillRect(coordinate.y * this.tileSize, coordinate.x * this.tileSize, this.tileSize, this.tileSize);
    }

    private getImage(path: string): HTMLImageElement | undefined {
        return this.imageService.getImage(path);
    }
}
