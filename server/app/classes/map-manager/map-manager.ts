import { DOWN, LEFT, RIGHT, TILE_COSTS, UP, BASE_TILE_DECIMAL, DIRECTIONS } from '@app/utils/const';
import { Coordinate } from '@common/interfaces/coordinate';
import { ItemsPerMapSize, GameMapSize } from '@common/enums/game-infos';
import { TileType } from '@common/enums/tile';
import { ItemType } from '@common/enums/item';

export class MapManager {
    size: number;
    private closedDoorsPositions: Coordinate[];
    private _map: number[][];

    get map(): number[][] {
        return this._map;
    }

    setMap(newMap: number[][]): void {
        this._map = newMap;
        this.size = this._map.length;
        this.closedDoorsPositions = [];
        this.getClosedDoorsPositions();
    }

    getTile(position: Coordinate): number {
        return this._map[position.y][position.x];
    }
    getItem(position: Coordinate): number {
        return this.getTile(position) % BASE_TILE_DECIMAL;
    }

    setTile(position: Coordinate, value: number): void {
        this._map[position.y][position.x] = value;
    }

    move(position: Coordinate, direction: Coordinate): Coordinate {
        return { x: position.x + direction.x, y: position.y + direction.y };
    }

    isWall(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return Math.floor(this.getTile(position)) === TileType.Wall;
    }

    addItem(item: ItemType, pos: Coordinate) {
        if (this.getItem(pos) !== 0) return;
        this.setTile(pos, this.getTile(pos) + item);
    }

    removeItem(position: Coordinate): ItemType {
        const item = this.getItem(position);
        this.setTile(position, this.getTile(position) - item);
        return item;
    }

    isOpenDoor(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return Math.floor(this.getTile(position) / BASE_TILE_DECIMAL) === TileType.DoorOpen;
    }

    isClosedDoor(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return Math.floor(this.getTile(position) / BASE_TILE_DECIMAL) === TileType.DoorClosed;
    }

    isDoor(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return this.isClosedDoor(position) || this.isOpenDoor(position);
    }

    isIce(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return Math.floor(this.getTile(position) / BASE_TILE_DECIMAL) === TileType.Ice;
    }

    isOutOfBounds(position: Coordinate): boolean {
        return position.x < 0 || position.x >= this.size || position.y < 0 || position.y >= this.size;
    }

    isValidPosition(position: Coordinate): boolean {
        return !(this.isOutOfBounds(position) || this.isWall(position));
    }

    equals(firstPosition: Coordinate, secondPosition: Coordinate): boolean {
        if (!(firstPosition && secondPosition)) return false;
        return firstPosition.x === secondPosition.x && firstPosition.y === secondPosition.y;
    }

    isCorner(position: Coordinate): boolean {
        return position.x % (this.size - 1) === 0 && position.y % (this.size - 1) === 0;
    }

    isVerticalBoundary(position: Coordinate): boolean {
        return position.x === 0 || position.x === this.size - 1;
    }

    isHorizontalBoundary(position: Coordinate): boolean {
        return position.y === 0 || position.y === this.size - 1;
    }

    isBoundary(position: Coordinate): boolean {
        return this.isHorizontalBoundary(position) || this.isVerticalBoundary(position);
    }

    getNeighbor(position: Coordinate, direction: Coordinate): Coordinate | null {
        const neighbor = this.move(position, direction);
        return this.isValidPosition(neighbor) ? neighbor : null;
    }

    getVerticalNeighbors(position: Coordinate): Coordinate[] {
        return [this.getNeighbor(position, UP), this.getNeighbor(position, DOWN)].filter(Boolean) as Coordinate[];
    }

    getHorizontalNeighbors(position: Coordinate): Coordinate[] {
        return [this.getNeighbor(position, LEFT), this.getNeighbor(position, RIGHT)].filter(Boolean) as Coordinate[];
    }

    getAllNeighbors(position: Coordinate): Coordinate[] {
        const neighbors: Coordinate[] = [];
        DIRECTIONS.forEach((direction) => {
            const neighbor = this.getNeighbor(position, direction);
            if (neighbor) neighbors.push(neighbor);
        });
        return neighbors;
    }

    getMaxRequiredItems(): number {
        if (this.size === GameMapSize.Small) {
            return ItemsPerMapSize.Small;
        }
        if (this.size === GameMapSize.Medium) {
            return ItemsPerMapSize.Medium;
        }
        return ItemsPerMapSize.Large;
    }

    resolveCost(position: Coordinate): number {
        const tileType = Math.floor(this.getTile(position) / BASE_TILE_DECIMAL);
        return TILE_COSTS.get(tileType);
    }

    hasItem(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return !(this.getItem(position) === 0 || this.hasStartingPoint(position));
    }

    hasAttackItem(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return this.getItem(position) === ItemType.BoostAttack;
    }

    hasDefenseItem(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return this.getItem(position) === ItemType.BoostDefense;
    }

    hasStartingPoint(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return this.getItem(position) === ItemType.StartingPoint;
    }

    hasFlag(position: Coordinate): boolean {
        if (this.isOutOfBounds(position)) return false;
        return this.getItem(position) === ItemType.Flag;
    }

    isWalkable(position: Coordinate): boolean {
        if (!this.isValidPosition(position)) return false;
        const tileType = Math.floor(this.getTile(position) / BASE_TILE_DECIMAL);
        return tileType === TileType.Water || tileType === TileType.Ice || tileType === TileType.Base;
    }

    ignoreClosedDoors(): void {
        this.getClosedDoorsPositions().forEach((position) => this.setTile(position, TileType.Base * BASE_TILE_DECIMAL));
    }

    restoreClosedDoors(): void {
        this.closedDoorsPositions.forEach((position) => this.setTile(position, TileType.DoorClosed * BASE_TILE_DECIMAL));
    }

    getClosedDoorsPositions(): Coordinate[] {
        const closedDoorsPositions = this.getPositions((pos) => this.isClosedDoor(pos));
        this.closedDoorsPositions = [...closedDoorsPositions];
        return closedDoorsPositions;
    }

    getTotalDoors(): number {
        return this.getPositions((pos) => this.isDoor(pos)).length;
    }

    getTotalWalkableTiles(): number {
        return this.getPositions((pos) => this.isWalkable(pos)).length;
    }

    getItemsPositions(): Coordinate[] {
        return this.getPositions((pos) => !(!this.hasItem(pos) || this.hasAttackItem(pos) || this.hasDefenseItem(pos)));
    }

    getAttackItemsPositions(): Coordinate[] {
        return this.getPositions((pos) => this.hasAttackItem(pos));
    }

    getDefenseItemsPositions(): Coordinate[] {
        return this.getPositions((pos) => this.hasDefenseItem(pos));
    }

    getFlagPosition(): Coordinate | null {
        const flagPosition = this.getPositions((pos) => this.hasFlag(pos));
        return flagPosition.length ? flagPosition[0] : null;
    }

    getPositions(predicate: (pos: Coordinate) => boolean): Coordinate[] {
        const positions = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const pos = { x: i, y: j };
                if (predicate(pos)) {
                    positions.push(pos);
                }
            }
        }
        return positions;
    }
}
