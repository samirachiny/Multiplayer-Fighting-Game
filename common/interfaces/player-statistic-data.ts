export interface PlayerStatisticData {
    visitedTile: Set<string>;
    objectsCollected: Set<number>;
    displayablePlayerStatistic: DisplayablePlayerStatisticData;
}

export interface DisplayablePlayerStatisticData {
    playerName: string;
    numberOfFights: number;
    numberOfEscapes: number;
    numberOfWins: number;
    numberOfDefeats: number;
    totalHealthLost: number;
    totalDamageDealt: number;
    numberOfObjectsCollected: number;
    percentageOfMapTilesVisited: number;
}
