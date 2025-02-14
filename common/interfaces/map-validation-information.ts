export interface MapValidationInformation {
    isMapConnected: boolean;
    isMapSurfaceCorrect: boolean;
    areDoorsValid: boolean;
    areItemsPlaced: boolean;
    areStartingPointValid: boolean;
    isFlagInMap?: boolean;
}