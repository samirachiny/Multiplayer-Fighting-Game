import { MapValidationIndicator } from '@common/interfaces/map-validation-indicator';
import { Coordinate } from '@common/interfaces/coordinate';
import { Service } from 'typedi';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { MIN_FREE_TILE_PERCENT_REQUIRED, MIN_ITEM_COUNT } from '@app/utils/const';
import { MapValidationInformation } from '@common/interfaces/map-validation-information';

@Service()
export class MapValidator {
    private mapManager = new MapManager();
    private queue: Coordinate[] = [];
    private visited: Coordinate[] = [];
    private doorPositions: Coordinate[] = [];
    private anomalousPositions: Coordinate[] = [];
    private freeTiles: number;
    private itemCount: number;
    private startPoints: number;
    private flagCount: number;

    setMap(newMap: number[][]) {
        this.mapManager.setMap(newMap);
        this.freeTiles = this.mapManager.size * this.mapManager.size;
        this.doorPositions = [];
        this.anomalousPositions = [];
        this.itemCount = 0;
        this.startPoints = 0;
        this.flagCount = 0;
    }

    generateResponse(isFlagMode: boolean = false): MapValidationIndicator {
        this.analyzeItems();
        const res: MapValidationInformation = {
            isMapConnected: this.runBFS(),
            isMapSurfaceCorrect: this.isSurfaceValid(),
            areDoorsValid: this.validateDoors(),
            areItemsPlaced: this.isItemCountOnMapValid(),
            areStartingPointValid: this.startPoints === this.mapManager.getMaxRequiredItems(),
        };
        return this.generateMapValidationResponse(res, isFlagMode);
    }

    private isItemCountOnMapValid(): boolean {
        return MIN_ITEM_COUNT <= this.itemCount && this.itemCount <= this.mapManager.getMaxRequiredItems();
    }

    private generateMapValidationResponse(mapInfos: MapValidationInformation, isFlagMode: boolean = false): MapValidationIndicator {
        const response: MapValidationIndicator = {
            mapStatus: this.isMapValid(mapInfos, isFlagMode),
            blockedSection: mapInfos.isMapConnected ? [] : [...this.visited],
            invalidDoors: mapInfos.areDoorsValid ? [] : [...this.anomalousPositions],
            excessTiles: mapInfos.isMapSurfaceCorrect ? 0 : (this.mapManager.size * this.mapManager.size) / 2 - this.freeTiles,
            areItemsPlaced: mapInfos.areItemsPlaced,
            areStartingPointPlaced: mapInfos.areStartingPointValid,
        };
        if (isFlagMode) response.isFlagInMap = this.flagCount === 1;

        return response;
    }

    private isMapValid(mapInfos: MapValidationInformation, isFlagMode: boolean = false): boolean {
        return (
            mapInfos.isMapConnected &&
            mapInfos.isMapSurfaceCorrect &&
            mapInfos.areDoorsValid &&
            mapInfos.areItemsPlaced &&
            mapInfos.areStartingPointValid &&
            (isFlagMode ? mapInfos.isFlagInMap : true)
        );
    }

    private hasItem(position: Coordinate): boolean {
        return this.mapManager.hasItem(position);
    }

    private hasStartingPoint(position: Coordinate): boolean {
        return this.mapManager.hasStartingPoint(position);
    }

    private hasFlag(position: Coordinate): boolean {
        return this.mapManager.hasFlag(position);
    }
    private isInDoors(position: Coordinate): boolean {
        return this.doorPositions.some((tile) => this.mapManager.equals(position, tile));
    }

    private isQueued(position: Coordinate): boolean {
        return this.queue.some((tile) => this.mapManager.equals(position, tile));
    }

    private isAnomalous(position: Coordinate): boolean {
        return this.anomalousPositions.some((tile) => this.mapManager.equals(position, tile));
    }

    private isVisited(position: Coordinate): boolean {
        return this.visited.some((tile) => this.mapManager.equals(position, tile));
    }

    private isAnyNotVisited(positions: Coordinate[]): boolean {
        return positions.some((position) => !this.isVisited(position));
    }

    private isDoorValid(position: Coordinate): boolean {
        if (this.mapManager.isBoundary(position)) return false;
        return this.isHorizontallySurrounded(position) !== this.isVerticallySurrounded(position);
    }

    private isHorizontallySurrounded(position: Coordinate): boolean {
        const horizontalNeighbors = this.mapManager.getHorizontalNeighbors(position);
        return !horizontalNeighbors.length && this.mapManager.getVerticalNeighbors(position).length === 2;
    }

    private isVerticallySurrounded(position: Coordinate): boolean {
        const verticalNeighbors = this.mapManager.getVerticalNeighbors(position);
        return !verticalNeighbors.length && this.mapManager.getHorizontalNeighbors(position).length === 2;
    }

    private getStartPosition(): Coordinate | null {
        let startPosition: Coordinate | null = null;
        this.forEachTile((position) => {
            if (!startPosition && this.mapManager.isValidPosition(position)) startPosition = position;
        });
        return startPosition;
    }

    private analyzeTile(position: Coordinate): void {
        if (this.mapManager.isWall(position)) {
            this.freeTiles--;
        } else if (this.mapManager.isDoor(position) && !this.isInDoors(position)) {
            this.doorPositions.push(position);
        }
    }

    private analyzeMap(): void {
        this.freeTiles = this.mapManager.size * this.mapManager.size;
        this.forEachTile((position) => this.analyzeTile(position));
    }

    private analyzeItem(position: Coordinate): void {
        if (!this.isLandTypeTile(position)) return;
        this.itemCount = this.hasItem(position) && !this.hasFlag(position) ? ++this.itemCount : this.itemCount;
        this.startPoints = this.hasStartingPoint(position) ? ++this.startPoints : this.startPoints;
        this.flagCount = this.hasFlag(position) ? ++this.flagCount : this.flagCount;
    }

    private isLandTypeTile(position: Coordinate): boolean {
        return !(this.mapManager.isWall(position) || this.mapManager.isDoor(position));
    }

    private analyzeItems(): void {
        this.itemCount = 0;
        this.startPoints = 0;
        this.flagCount = 0;
        this.forEachTile((position) => this.analyzeItem(position));
    }

    private runBFS(): boolean {
        if (!this.initializeBFS()) return false;
        let currentPosition = this.getStartPosition();

        do {
            this.addNeighborsToQueue(currentPosition);
            currentPosition = this.queue.length ? this.queue.shift() : currentPosition;
            this.visited.push(currentPosition);
        } while (this.checkIfRoadEnd(currentPosition));
        return this.visited.length === this.freeTiles;
    }

    private initializeBFS(): boolean {
        this.analyzeMap();
        this.queue = [];
        this.visited = [];
        const currentPosition = this.getStartPosition();
        if (!currentPosition) return false;
        this.visited.push(currentPosition);
        return true;
    }

    private addNeighborsToQueue(currentPosition: Coordinate): void {
        this.mapManager.getAllNeighbors(currentPosition).forEach((tile) => {
            if (!(this.isVisited(tile) || this.isQueued(tile))) {
                this.queue.push(tile);
            }
        });
    }

    private checkIfRoadEnd(currentPosition: Coordinate): boolean {
        return this.isAnyNotVisited(this.mapManager.getAllNeighbors(currentPosition)) || this.queue.length > 0;
    }

    private validateDoors(): boolean {
        let isValid = true;
        this.doorPositions.forEach((position) => {
            if (!(this.isDoorValid(position) || this.isAnomalous(position))) {
                this.anomalousPositions.push(position);
                isValid = false;
            }
        });
        return isValid;
    }

    private isSurfaceValid(): boolean {
        return this.freeTiles / (this.mapManager.size * this.mapManager.size) >= MIN_FREE_TILE_PERCENT_REQUIRED;
    }
    private forEachTile(callback: (position: Coordinate) => void): void {
        for (let i = 0; i < this.mapManager.size; i++) {
            for (let j = 0; j < this.mapManager.size; j++) {
                callback({ x: j, y: i });
            }
        }
    }
}
