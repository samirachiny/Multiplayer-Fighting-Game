import { Coordinate } from '@common/interfaces/coordinate';

export interface MapValidationIndicator {
    mapStatus: boolean;
    blockedSection: Coordinate[];
    invalidDoors: Coordinate[];
    excessTiles: number;
    areItemsPlaced: boolean;
    areStartingPointPlaced?: boolean;
    isFlagInMap?: boolean;
}
