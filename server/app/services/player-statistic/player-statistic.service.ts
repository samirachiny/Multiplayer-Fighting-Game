import 'reflect-metadata';
import { Service } from 'typedi';
import { PlayerStatisticData } from '@common/interfaces/player-statistic-data';
import { IncrementablePlayerStatisticFields } from '@common/enums/incrementable-player-statistic';
import { Coordinate } from '@common/interfaces/coordinate';
import { coordinateToString } from '@app/utils/helper';
import { ItemType } from '@common/enums/item';

@Service()
export class PlayerStatisticService {
    private partiesPlayerStatistics: Map<string, Map<string, PlayerStatisticData>> = new Map<string, Map<string, PlayerStatisticData>>();

    initPartyPlayerStatistics(partyId: string) {
        this.partiesPlayerStatistics.set(partyId, new Map<string, PlayerStatisticData>());
    }

    setPlayerStatistic(partyId: string, playerId: string, playerName: string) {
        const playerStatistics = this.partiesPlayerStatistics.get(partyId);
        if (!playerStatistics) return;
        playerStatistics.set(playerId, {
            visitedTile: new Set<string>(),
            objectsCollected: new Set<number>(),
            displayablePlayerStatistic: {
                playerName,
                numberOfFights: 0,
                numberOfEscapes: 0,
                numberOfWins: 0,
                numberOfDefeats: 0,
                totalHealthLost: 0,
                totalDamageDealt: 0,
                numberOfObjectsCollected: 0,
                percentageOfMapTilesVisited: 0,
            },
        });
    }

    deletePlayerStatistics(partyId: string) {
        this.partiesPlayerStatistics.delete(partyId);
    }

    deletePlayerStatistic(partyId: string, playerId: string) {
        const playerStatistics = this.partiesPlayerStatistics.get(partyId);
        if (!playerStatistics) return;
        playerStatistics.delete(playerId);
    }

    updateVisitedTile(partyId: string, playerId: string, pos: Coordinate) {
        const playerStatistic = this.getPlayerStatistic(partyId, playerId);
        if (!playerStatistic) return;
        playerStatistic.visitedTile.add(coordinateToString(pos));
    }

    updateObjectsCollected(partyId: string, playerId: string, item: ItemType) {
        const playerStatistic = this.getPlayerStatistic(partyId, playerId);
        if (!playerStatistic) return;
        playerStatistic.objectsCollected.add(item);
    }

    updateStatisticField(partyId: string, playerId: string, field: IncrementablePlayerStatisticFields) {
        const playerStatistic = this.getPlayerStatistic(partyId, playerId);
        if (!playerStatistic) return;
        playerStatistic.displayablePlayerStatistic[field]++;
    }

    getPlayerStatistics(partyId: string): PlayerStatisticData[] {
        const playerStastics = this.partiesPlayerStatistics.get(partyId);
        if (!playerStastics) return [];
        return Array.from(playerStastics.values());
    }

    private getPlayerStatistic(partyId: string, playerId: string): PlayerStatisticData | null {
        const playerStatistics = this.partiesPlayerStatistics.get(partyId);
        if (!playerStatistics) return null;
        return playerStatistics.get(playerId);
    }
}
