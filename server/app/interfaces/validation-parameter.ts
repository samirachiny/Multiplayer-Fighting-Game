import { Game } from '@common/interfaces/game';

export interface ValidationParameter {
    record: Game;
    create: boolean;
    oldName?: string;
}
