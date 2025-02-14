import { PlayerInfos } from '@common/interfaces/player-infos';
import { Coordinate } from '@common/interfaces/coordinate';
import { MovementManager } from '@app/classes/movement-manager/movement-manager';
import { MAX_ITEMS, MAX_MOVEMENT_POINTS, MAX_VIRTUAL_PLAYER_ACTION_DELAY } from '@app/utils/const';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayerEvent } from '@common/enums/virtual-player-event';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { PartyService } from '@app/services/party/party.service';
import { Container } from 'typedi';
import { delay, sameCoordinate } from '@app/utils/helper';
import { EventEmitter } from 'events';

export class VirtualPlayerManager {
    private partyService: PartyService;
    private movementManager: MovementManager;
    private virtualPlayer: PlayerInfos;
    private playerPositionMap: Map<Coordinate, PlayerInfos>;
    private eventVirtualPlayer: EventEmitter;
    private lastMovePosition: Coordinate | null;

    constructor(
        private partyId: string,
        private mapManager: MapManager,
    ) {
        this.partyService = Container.get(PartyService);
        this.movementManager = new MovementManager(this.mapManager);
        this.playerPositionMap = new Map<Coordinate, PlayerInfos>();
    }

    get profile(): BotProfile {
        return this.virtualPlayer.virtualPlayerProfile;
    }

    setVirtualPlayerEvent(eventVirtualPlayer: EventEmitter) {
        this.eventVirtualPlayer = eventVirtualPlayer;
    }

    listenVirtualPlayerEventAndProcess() {
        this.eventVirtualPlayer.on(VirtualPlayerEvent.BeginRound, async (playerId) => {
            this.setVirtualPlayer(this.partyService.getPlayer(this.partyId, playerId));
            this.setPositionMap();
            await this.processVirtualPlayerActions();
        });
        this.eventVirtualPlayer.on(VirtualPlayerEvent.EndMoving, async () => {
            await this.processVirtualPlayerActions();
        });

        this.eventVirtualPlayer.on(VirtualPlayerEvent.DoorOpened, async () => {
            await this.moveVirtualPlayer();
        });

        this.eventVirtualPlayer.on(VirtualPlayerEvent.EndFight, async () => {
            await this.moveVirtualPlayer();
        });
    }

    destroy() {
        this.eventVirtualPlayer.removeAllListeners();
    }

    private async delayBeforeDoAction() {
        await delay(Math.floor(Math.random() * MAX_VIRTUAL_PLAYER_ACTION_DELAY));
    }

    private setVirtualPlayer(virtualPlayer: PlayerInfos): void {
        this.virtualPlayer = virtualPlayer;
        this.lastMovePosition = null;
    }

    private hasNoActionsLeft(): boolean {
        return this.virtualPlayer.remainingAction === 0;
    }

    private async processVirtualPlayerActions() {
        const playerPositionToInteract = this.getPlayerPositionsToInteract();
        const doorPositionToInteract = this.getDoorPositionsToInteract();
        if (!this.virtualPlayer.isCurrentPlayer) return;
        if (this.hasNoActionsLeft()) {
            await this.moveVirtualPlayer();
            return;
        }
        if (playerPositionToInteract) {
            await this.handleInteraction(playerPositionToInteract, VirtualPlayerEvent.StartFight);
            return;
        }
        if (doorPositionToInteract) {
            await this.handleInteraction(doorPositionToInteract, VirtualPlayerEvent.OpenDoor);
            return;
        }
        await this.moveVirtualPlayer();
    }

    private async handleInteraction(position: Coordinate, event: VirtualPlayerEvent) {
        await this.delayBeforeDoAction();
        this.eventVirtualPlayer.emit(event, { playerId: this.virtualPlayer.pid, pos: position });
    }

    private async moveVirtualPlayer() {
        const nextMovePosition = this.resolveNextPosition();
        await this.delayBeforeDoAction();
        if (this.shouldEndRound(nextMovePosition)) {
            this.eventVirtualPlayer.emit(VirtualPlayerEvent.EndRound, this.virtualPlayer.pid);
            return;
        }
        this.lastMovePosition = nextMovePosition;
        this.eventVirtualPlayer.emit(VirtualPlayerEvent.StartMoving, { playerId: this.virtualPlayer.pid, pos: nextMovePosition });
    }

    private shouldEndRound(nextMovePosition: Coordinate) {
        if (!this.virtualPlayer.isCurrentPlayer) return false;
        if (!nextMovePosition) return true;
        return this.lastMovePosition && sameCoordinate(this.lastMovePosition, nextMovePosition);
    }

    private setPositionMap(): void {
        this.playerPositionMap.clear();
        const players = this.partyService.getPlayers(this.partyId).filter((player) => player.pid !== this.virtualPlayer.pid);
        players.forEach((player) => {
            this.playerPositionMap.set({ x: player.currentPosition.y, y: player.currentPosition.x }, player);
        });
    }

    private getPlayerPositionsToInteract(): Coordinate | null {
        const neighbors = this.mapManager.getAllNeighbors({ x: this.virtualPlayer.currentPosition.y, y: this.virtualPlayer.currentPosition.x });
        for (const neighbor of neighbors) {
            const playerEntry = [...this.playerPositionMap.entries()].find(
                ([playerPosition, playerInfo]) => !playerInfo.isGiveUp && sameCoordinate(neighbor, playerPosition),
            );
            if (playerEntry) {
                const [playerPos] = playerEntry;
                return playerPos;
            }
        }
        return null;
    }

    private getDoorPositionsToInteract(): Coordinate | null {
        return (
            this.mapManager
                .getAllNeighbors({ x: this.virtualPlayer.currentPosition.y, y: this.virtualPlayer.currentPosition.x })
                .find((neighbor) => this.mapManager.isClosedDoor(neighbor)) || null
        );
    }

    private resolveNextPosition(): Coordinate {
        if (this.isAggressive()) return this.resolveAggressivePriorityPosition();
        return this.resolveDefensivePriorityPosition();
    }

    private isAggressive(): boolean {
        return this.profile === BotProfile.Aggressive;
    }

    private resolveAggressivePriorityPosition(): Coordinate {
        return this.resolveFlagPriority() || this.getPositionToNextAttackItem() || this.getPositionToClosestPlayer();
    }

    private resolveDefensivePriorityPosition(): Coordinate {
        return (
            this.resolveFlagPriority() ||
            this.getPositionToNextDefenseItem() ||
            this.getPositionToNextAttackItem() ||
            this.getPositionToNextItem() ||
            this.getPositionToClosestPlayer()
        );
    }

    private resolveFlagPriority(): Coordinate {
        if (this.virtualPlayer.hasFlag) return this.getPositionToStartPoint();
        return this.getPositionToFlag();
    }

    private hasFullInventory(): boolean {
        return this.virtualPlayer.items.length === MAX_ITEMS;
    }

    private getPositionToClosestPlayer(): Coordinate {
        return this.getNextPositionToPlayer(this.getClosestPlayer());
    }

    private getPositionToNextItemType(itemPositions: Coordinate[]): Coordinate {
        if (this.hasFullInventory()) return null;
        return this.getLastAccessiblePosition(this.getPathToPosition(this.getClosestPosition(itemPositions)));
    }

    private getPositionToNextAttackItem(): Coordinate {
        return this.getPositionToNextItemType(this.getAttackItemsPositions());
    }

    private getPositionToNextDefenseItem(): Coordinate {
        return this.getPositionToNextItemType(this.getDefenseItemsPositions());
    }

    private getPositionToNextItem(): Coordinate {
        return this.getPositionToNextItemType(this.getItemsPositions());
    }

    private getPositionToFlag(): Coordinate | null {
        const flagPosition = this.mapManager.getFlagPosition();
        if (!flagPosition) return null;
        return this.getLastAccessiblePosition(this.getPathToPosition(flagPosition));
    }

    private getPositionToStartPoint(): Coordinate {
        const startPosition = { x: this.virtualPlayer.startPosition.y, y: this.virtualPlayer.startPosition.x };
        const isOtherPlayerAtStartPoint = [...this.playerPositionMap.entries()].some(
            ([playerPosition, playerInfo]) => !playerInfo.isGiveUp && sameCoordinate(startPosition, playerPosition),
        );
        if (isOtherPlayerAtStartPoint) return null;
        return this.getLastAccessiblePosition(this.getPathToPosition(startPosition));
    }

    private getItemsPositions(): Coordinate[] {
        return this.getAccessibleItemPositions(this.mapManager.getItemsPositions());
    }

    private getAttackItemsPositions(): Coordinate[] {
        return this.getAccessibleItemPositions(this.mapManager.getAttackItemsPositions());
    }

    private getDefenseItemsPositions(): Coordinate[] {
        return this.getAccessibleItemPositions(this.mapManager.getDefenseItemsPositions());
    }

    private getAccessibleItemPositions(itemPositions: Coordinate[]): Coordinate[] {
        return itemPositions.filter(
            (pos) => ![...this.playerPositionMap.entries()].some(([playerPos, playerInfo]) => !playerInfo.isGiveUp && sameCoordinate(pos, playerPos)),
        );
    }

    private getClosestPlayer(): PlayerInfos | undefined {
        const activePlayerPositions = [...this.playerPositionMap.entries()]
            .filter(([, playerInfo]) => !playerInfo.isGiveUp)
            .map(([playerPos]) => playerPos);
        return this.playerPositionMap.get(this.getClosestPosition(activePlayerPositions));
    }

    private getNextPositionToPlayer(player: PlayerInfos): Coordinate {
        return this.getLastAccessiblePosition(this.getPathToPlayer(player));
    }

    private adjustEngagementPoint(engagementPoint: Coordinate): Coordinate {
        return this.mapManager.isClosedDoor(engagementPoint)
            ? this.chooseRandomPosition(this.mapManager.getAllNeighbors(engagementPoint))
            : engagementPoint;
    }

    private getPlayerEngagementPoint(player: PlayerInfos): Coordinate {
        return this.getClosestPosition(this.mapManager.getAllNeighbors({ x: player.currentPosition.y, y: player.currentPosition.x }));
    }

    private getPathToPlayer(player: PlayerInfos): Coordinate[] {
        return this.getPathToPosition(this.adjustEngagementPoint(this.getPlayerEngagementPoint(player)));
    }

    private getLastAccessiblePosition(path: Coordinate[]): Coordinate {
        const lastAccessible = [...path].reverse().find((position) => this.isPositionAccessible(position));
        return lastAccessible ?? null;
    }

    private getClosestPosition(positions: Coordinate[]): Coordinate {
        return this.chooseRandomPosition(this.getClosestPositions(positions));
    }

    private getClosestPositions(positions: Coordinate[]): Coordinate[] {
        return positions.filter((position) => this.getDistanceToPosition(position) === this.getSmallestDistance(positions));
    }

    private getSmallestDistance(positions: Coordinate[]): number {
        return positions.reduce((minDistance, position) => {
            return Math.min(minDistance, this.getDistanceToPosition(position));
        }, Infinity);
    }

    private chooseRandomPosition(positions: Coordinate[]): Coordinate {
        return positions[Math.floor(Math.random() * positions.length)];
    }

    private isPositionAccessible(position: Coordinate): boolean {
        this.configureMovement();
        return this.movementManager.isAccessible({ x: this.virtualPlayer.currentPosition.y, y: this.virtualPlayer.currentPosition.x }, position);
    }

    private getPathToPosition(position: Coordinate): Coordinate[] {
        this.movementManager.setMovementPoints(MAX_MOVEMENT_POINTS);
        this.movementManager.ignoreClosedDoors();
        const path = this.movementManager.getPlayerPathTo(this.virtualPlayer, position);
        this.movementManager.restoreClosedDoors();
        return path;
    }

    private getDistanceToPosition(position: Coordinate): number {
        this.movementManager.setMovementPoints(MAX_MOVEMENT_POINTS);
        const distance = this.movementManager.getPathCost(this.getPathToPosition(position));
        this.movementManager.setMovementPoints(this.virtualPlayer.availableMoves);
        return distance;
    }

    private configureMovement(): void {
        this.movementManager.setMovementPoints(this.virtualPlayer.availableMoves);
        this.movementManager.acquireNodeMap();
    }
}
