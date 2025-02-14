import { GameMode } from '@common/enums/game-infos';

export interface ImportGameFormat {
    name: string;
    description: string;
    mode: GameMode;
    gameMap: number[][];
}
