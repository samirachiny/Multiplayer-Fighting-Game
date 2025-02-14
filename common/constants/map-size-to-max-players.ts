import { GameMapSize, StartingPointPerMapSize } from '../enums/game-infos';
export const MAP_SIZE_TO_MAX_PLAYERS: { [key: number]: number } = {
    [GameMapSize.Small]: StartingPointPerMapSize.Small,
    [GameMapSize.Medium]: StartingPointPerMapSize.Medium,
    [GameMapSize.Large]: StartingPointPerMapSize.Large,
};
