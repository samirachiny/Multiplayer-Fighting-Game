import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DoorTile } from '@app/classes/door-tile/door-tile';
import { IceTile } from '@app/classes/ice-tile/ice-tile';
import { Tile } from '@app/classes/tile/tile';
import { WallTile } from '@app/classes/wall-tile/wall-tile';
import { WaterTile } from '@app/classes/water-tile/water-tile';
import { TileType } from '@common/enums/tile';
const TILES: Tile[] = [new WallTile(), new IceTile(), new WaterTile(), new DoorTile(TileType.DoorClosed)];

@Component({
    selector: 'app-tile-tools',
    standalone: true,
    imports: [MatTooltipModule, CommonModule],
    templateUrl: './tile-tools.component.html',
    styleUrl: './tile-tools.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class TileToolsComponent {
    @Output() tileClicked: EventEmitter<Tile>;
    tiles: Tile[];
    selectedIndex: number;

    constructor() {
        this.tileClicked = new EventEmitter<Tile>();
        this.tiles = TILES;
        this.selectedIndex = this.tiles.length;
    }

    onSelectedTile(index: number): void {
        this.selectedIndex = index;
        this.tileClicked.emit(this.tiles[index]);
    }

    onDragStart(event: DragEvent) {
        event.preventDefault();
    }
}
