import { DisplayablePlayerStatisticData } from './player-statistic-data';

export interface PartyStatistic {
    winner: string;
    totalDuration: string;
    totalRounds: number;
    flagHoldersCount?: number;
    visitedTilesPercentage: number;
    manipulatedDoorsPercentage: number;
    displayPlayerStatistics: DisplayablePlayerStatisticData[];
}

export interface PartyStatisticData {
    totalRounds: number;
    flagHolderNames?: Set<string>;
    tilesVisited: Set<string>;
    doorsManipulated: Set<string>;
    totalWalkableTile: number;
    totalDoor: number;
    winner: string;
}
