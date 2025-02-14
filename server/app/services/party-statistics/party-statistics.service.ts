import { Service } from 'typedi';
import { PartyService } from '@app/services/party/party.service';
import { Coordinate } from '@common/interfaces/coordinate';
import { PartyStatistic, PartyStatisticData } from '@common/interfaces/party-statistics';
import { PlayerStatisticService } from '@app/services/player-statistic/player-statistic.service';
import { coordinateToString } from '@app/utils/helper';
import { DisplayablePlayerStatisticData } from '@common/interfaces/player-statistic-data';
import { MAX_PERCENT } from '@app/utils/const';

@Service()
export class PartyStatisticsService {
    private partyStatistics: Map<string, PartyStatisticData> = new Map();

    constructor(
        private partyService: PartyService,
        private playerStatService: PlayerStatisticService,
    ) {}

    initializePartyStatistic(partyId: string): void {
        if (this.partyStatistics.has(partyId)) return;
        this.partyStatistics.set(partyId, {
            totalRounds: 0,
            tilesVisited: new Set<string>(),
            doorsManipulated: new Set<string>(),
            totalWalkableTile: 0,
            totalDoor: 0,
            winner: '',
        });
        this.playerStatService.initPartyPlayerStatistics(partyId);
    }

    deletePartyStatistic(partyId: string) {
        this.partyStatistics.delete(partyId);
        this.playerStatService.deletePlayerStatistics(partyId);
    }

    deletePlayerStatistic(partyId: string, playerId: string) {
        this.playerStatService.deletePlayerStatistic(partyId, playerId);
    }

    setPlayerStatistic(partyId: string, playerId: string, playerName: string) {
        this.playerStatService.setPlayerStatistic(partyId, playerId, playerName);
    }

    updateTotalWalkableTile(partyId: string, totalWalkableTile: number) {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return;
        stats.totalWalkableTile = totalWalkableTile;
    }

    updateTotalDoor(partyId: string, totalDoor: number) {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return;
        stats.totalDoor = totalDoor;
    }

    updateVisitedTile(partyId: string, pos: Coordinate): void {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return;
        stats.tilesVisited.add(coordinateToString(pos));
    }

    updateManipulatedDoor(partyId: string, pos: Coordinate): void {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return;
        stats.doorsManipulated.add(coordinateToString(pos));
    }

    updateFlagHolderNames(partyId: string, playerName: string) {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return;
        if (!stats.flagHolderNames) stats.flagHolderNames = new Set<string>();
        stats.flagHolderNames.add(playerName);
    }

    updateWinner(partyId: string, winner: string) {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return;
        stats.winner = winner;
    }

    incrementTotalRounds(partyId: string): void {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return;
        stats.totalRounds++;
    }

    calculateVisitedTilesPercentage(partyId: string): number {
        return this.calculatePercentage(partyId, 'tilesVisited', 'totalWalkableTile');
    }

    calculateManipulatedDoorsPercentage(partyId: string): number {
        return this.calculatePercentage(partyId, 'doorsManipulated', 'totalDoor');
    }

    getPartyStatistic(partyId: string): PartyStatistic | null {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return null;
        const partyStatistic: PartyStatistic = {
            winner: stats.winner,
            totalDuration: this.partyService.getPartyDuration(partyId),
            totalRounds: stats.totalRounds,
            visitedTilesPercentage: this.calculateVisitedTilesPercentage(partyId),
            manipulatedDoorsPercentage: this.calculateManipulatedDoorsPercentage(partyId),
            displayPlayerStatistics: this.getDisplayPlayerStatistics(partyId),
        };
        if (stats.flagHolderNames) partyStatistic.flagHoldersCount = stats.flagHolderNames.size;
        return partyStatistic;
    }

    private getDisplayPlayerStatistics(partyId: string): DisplayablePlayerStatisticData[] | null {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return null;
        const playerStatServices = this.playerStatService.getPlayerStatistics(partyId);
        const displayPlayerStatistics: DisplayablePlayerStatisticData[] = [];
        playerStatServices.forEach((playerStatistic) => {
            const displayableStats = playerStatistic.displayablePlayerStatistic;
            displayableStats.percentageOfMapTilesVisited = (playerStatistic.visitedTile.size / stats.totalWalkableTile) * MAX_PERCENT;
            displayableStats.numberOfObjectsCollected = playerStatistic.objectsCollected.size;
            displayPlayerStatistics.push(displayableStats);
        });
        return displayPlayerStatistics;
    }

    private calculatePercentage(
        partyId: string,
        property: 'tilesVisited' | 'doorsManipulated',
        totalProperty: 'totalWalkableTile' | 'totalDoor',
    ): number {
        const stats = this.partyStatistics.get(partyId);
        if (!stats) return 0;
        const total = stats[totalProperty];
        if (total === 0) return 0;
        return (stats[property].size / total) * MAX_PERCENT;
    }
}
