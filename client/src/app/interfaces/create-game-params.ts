import { GameMapSize, GameMode } from '@common/enums/game-infos';
export interface CreateGameParams {
    mode: GameMode;
    size: GameMapSize;
}
