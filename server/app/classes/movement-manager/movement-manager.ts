import { TileNode } from '@app/interfaces/node';
import { BASE_TILE_DECIMAL, SLIP_ARRAY, SLIP_DOUBLE_ARRAY } from '@app/utils/const';
import { TileType } from '@common/enums/tile';
import { Coordinate } from '@common/interfaces/coordinate';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { MapManager } from '@app/classes/map-manager/map-manager';

export class MovementManager {
    private nodeMap: TileNode[][];
    private availableMoves: number;
    private visited: Coordinate[] = [];
    private queue: Coordinate[] = [];
    private stack: Coordinate[] = [];
    private neighborMap: Map<Coordinate, Coordinate[]> = new Map();

    constructor(private mapManager: MapManager) {
        this.acquireNodeMap();
    }

    setNodeMap(players: PlayerInfos[], startPosition: Coordinate) {
        this.acquireNodeMap();
        this.markPlayerPositions(players, startPosition);
    }

    getPath(start: Coordinate, end: Coordinate): Coordinate[] {
        if (this.hasNoValidPath(start, end)) return [];
        const path: Coordinate[] = [];
        let current: Coordinate = start;
        this.resetAttributes(current);

        while (!this.isAccessPoint(current, end)) {
            this.addNeighborsToStack(current);
            current = this.stack.pop();
            this.addToVisited(current);
            path.push(current);
        }
        path.push(end);
        return this.optimizePath(start, path);
    }

    getPlayerPathTo(player: PlayerInfos, endPosition: Coordinate): Coordinate[] {
        if (!player) return [];
        return this.getPath({ x: player.currentPosition.y, y: player.currentPosition.x }, endPosition);
    }

    getAccessiblePositions(playerId: string, players: PlayerInfos[]): Coordinate[] {
        this.initMove(players, playerId);
        const player: PlayerInfos = players.find((p) => p.pid === playerId);
        if (!player) return [];
        return this.getAccessibleTiles({ x: player.currentPosition.y, y: player.currentPosition.x });
    }

    initMove(players: PlayerInfos[], playerId: string): void {
        const player: PlayerInfos = players.find((p) => p.pid === playerId);
        if (!player) return;
        this.setMovementPoints(player.availableMoves);
        this.setNodeMap(players, player.currentPosition);
    }

    setMovementPoints(value: number): void {
        this.availableMoves = value;
    }

    getNode(position: Coordinate): TileNode {
        return this.nodeMap[position.y][position.x];
    }

    hasSlipped(position: Coordinate, doubleSlip: boolean): boolean {
        const slipArray = doubleSlip ? SLIP_DOUBLE_ARRAY : SLIP_ARRAY;
        const randomIndex = Math.floor(Math.random() * slipArray.length);
        return slipArray[randomIndex] === 1 && this.mapManager.isIce(position);
    }

    isAccessible(sourcePosition: Coordinate, targetPosition: Coordinate): boolean {
        return this.getAccessibleTiles(sourcePosition).some((position) => this.mapManager.equals(position, targetPosition));
    }

    acquireNodeMap(): void {
        this.nodeMap = this.mapManager.map.map((row, rowIndex) => row.map((_col, colIndex) => this.transformToNode({ x: colIndex, y: rowIndex })));
    }

    getPathCost(path: Coordinate[]): number {
        this.ignoreClosedDoors();
        const pathCost = path.reduce((totalCost, position) => {
            return totalCost + this.mapManager.resolveCost(position);
        }, 0);
        this.restoreClosedDoors();
        return pathCost;
    }

    ignoreClosedDoors(): void {
        this.mapManager.ignoreClosedDoors();
        this.acquireNodeMap();
    }

    restoreClosedDoors(): void {
        this.mapManager.restoreClosedDoors();
        this.acquireNodeMap();
    }

    private getAccessibleTiles(position: Coordinate): Coordinate[] {
        let current = position;
        this.initializeTraversal(current);
        do {
            this.queueNeighbors(current);
            this.visitNeighbors(current);
            current = this.getNextPosition();
            this.filterDeadEnds();
        } while (this.shouldContinueTraversal(current));
        return this.visited;
    }

    private addNeighborsToStack(current: Coordinate): void {
        if (!current) return;
        this.mapManager.getAllNeighbors(current).forEach((neighbor) => {
            if (this.shouldAddToStack(current, neighbor)) {
                this.stack.push(neighbor);
            }
        });
    }

    private initializeTraversal(startPosition: Coordinate): void {
        this.resetAttributes(startPosition);
        this.setAvailableMoves(startPosition, this.availableMoves);
    }

    private queueNeighbors(current: Coordinate): void {
        this.getNeighbors(current).forEach((neighbor) => {
            if (this.canBeQueued(neighbor)) this.queue.push(neighbor);
        });
    }

    private getNextPosition(): Coordinate | undefined {
        return this.queue.shift();
    }

    private shouldAddToStack(currentPosition: Coordinate, neighborPosition: Coordinate): boolean {
        return this.canBeStacked(neighborPosition) && this.isSuccessor(currentPosition, neighborPosition);
    }

    private hasNoValidPath(start: Coordinate, end: Coordinate): boolean {
        return !this.isAccessible(start, end) || this.mapManager.equals(start, end);
    }

    private shouldContinueTraversal(position: Coordinate): boolean {
        return this.queue.length > 0 || this.isAnyNeighborAccessible(position);
    }

    private markPlayerPositions(players: PlayerInfos[], startPosition: Coordinate): void {
        players.forEach((player) => {
            const position = { x: player.currentPosition.y, y: player.currentPosition.x };
            if (!player.isGiveUp && !this.mapManager.equals(position, startPosition)) {
                this.getNode(position).cost = -1;
            }
        });
    }

    private isSuccessor(sourcePosition: Coordinate, neighbor: Coordinate): boolean {
        const neighborTileType = Math.floor(this.mapManager.getTile(neighbor) / BASE_TILE_DECIMAL);
        if (neighborTileType === TileType.Ice) return this.getNode(sourcePosition).remainingMoves >= this.getNode(neighbor).remainingMoves;
        return this.getNode(sourcePosition).remainingMoves > this.getNode(neighbor).remainingMoves;
    }

    private resetAttributes(position: Coordinate) {
        this.queue = [];
        this.stack = [];
        this.neighborMap.clear();
        this.visited = [position];
    }

    private setAvailableMoves(position: Coordinate, value: number): void {
        this.getNode(position).remainingMoves = value;
    }

    private transformToNode(position: Coordinate): TileNode {
        return { position, remainingMoves: -1, cost: this.mapManager.resolveCost(position) };
    }

    private getNeighbors(position: Coordinate): Coordinate[] {
        this.neighborMap.set(position, this.mapManager.getAllNeighbors(position));
        return this.neighborMap.get(position);
    }

    private addToVisited(position: Coordinate): void {
        if (!this.isVisited(position)) this.visited.push(position);
    }

    private visitNeighbor(position: Coordinate, neighbor: Coordinate): void {
        if (this.isNotVisitableNeighbor(position, neighbor)) return;
        const currentNode = this.getNode(position);
        if (currentNode.remainingMoves === 0) return;
        const nextNode = this.getNode(neighbor);
        const currentRemainingMoves = nextNode.remainingMoves;
        const newRemainingMoves = currentNode.remainingMoves - nextNode.cost;
        this.setAvailableMoves(neighbor, Math.max(currentRemainingMoves, newRemainingMoves));
        this.addNeighborToQueueIfNeeded(neighbor, currentRemainingMoves, newRemainingMoves);
        this.addToVisited(neighbor);
    }

    private addNeighborToQueueIfNeeded(neighbor: Coordinate, currentRemainingMoves: number, newRemainingMoves: number): void {
        const hasImprovedRemainingMoves = currentRemainingMoves !== -1 && newRemainingMoves > currentRemainingMoves;
        if (hasImprovedRemainingMoves) this.queue.push(neighbor);
    }

    private isNotVisitableNeighbor(position: Coordinate, neighbor: Coordinate): boolean {
        return !this.isNeighborAccessible(position, neighbor) || this.getNode(neighbor).cost === -1;
    }

    private visitNeighbors(position: Coordinate): void {
        this.neighborMap.get(position).forEach((neighbor) => {
            this.visitNeighbor(position, neighbor);
        });
    }

    private isNeighborAccessible(position: Coordinate, neighbor: Coordinate): boolean {
        const neighborNode = this.getNode(neighbor);
        return this.getNode(position).remainingMoves >= neighborNode.cost && neighborNode.cost !== -1;
    }

    private isAnyNeighborAccessible(position: Coordinate): boolean {
        return position ? this.mapManager.getAllNeighbors(position).some((neighbor) => this.isNeighborAccessible(position, neighbor)) : false;
    }

    private isDeadEnd(position: Coordinate): boolean {
        const hasNoMoves = this.getNode(position).remainingMoves === 0;
        return hasNoMoves || !this.isAnyNeighborAccessible(position);
    }

    private filterDeadEnds(): void {
        this.queue = this.queue.filter((position) => !this.isDeadEnd(position));
    }

    private isQueued(position: Coordinate): boolean {
        return this.queue.some((tile) => this.mapManager.equals(position, tile));
    }

    private canBeQueued(position: Coordinate): boolean {
        return !(this.isQueued(position) || this.isVisited(position));
    }

    private isVisited(position: Coordinate): boolean {
        return this.visited.some((tile) => this.mapManager.equals(position, tile));
    }

    private isNeighbor(position: Coordinate, potentialNeighbor: Coordinate): boolean {
        return this.mapManager.getAllNeighbors(position).some((neighbor) => this.mapManager.equals(potentialNeighbor, neighbor));
    }

    private isStacked(position: Coordinate): boolean {
        return this.stack.some((tile) => this.mapManager.equals(position, tile));
    }

    private canBeStacked(position: Coordinate): boolean {
        return !(this.isStacked(position) || this.isVisited(position) || this.getNode(position).remainingMoves === -1);
    }

    private getAccessPoints(position: Coordinate): Coordinate[] {
        const neighbors = this.mapManager.getAllNeighbors(position);
        const maxRemainingMoves = neighbors.reduce((maxMoves, neighbor) => {
            return Math.max(maxMoves, this.getNode(neighbor).remainingMoves);
        }, -1);
        return neighbors.filter((neighbor) => this.getNode(neighbor).remainingMoves === maxRemainingMoves);
    }

    private isAccessPoint(position: Coordinate, end: Coordinate) {
        return this.getAccessPoints(end).some((accessPoint) => this.mapManager.equals(accessPoint, position));
    }

    private sliceAtLastNeighbor(startPoint: Coordinate, path: Coordinate[]): boolean {
        const lastNeighborIndex = path.findLastIndex((pos) => this.isNeighbor(startPoint, pos));
        return lastNeighborIndex > 0 ? (path.splice(0, lastNeighborIndex), true) : false;
    }

    private optimizePath(start: Coordinate, path: Coordinate[]): Coordinate[] {
        this.sliceAtLastNeighbor(start, path);
        const newPath = [path[0]];
        while (this.sliceAtLastNeighbor(path[0], path)) newPath.push(path[0]);
        return newPath;
    }
}
