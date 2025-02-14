import { Game } from './game';
import { PlayerInfos } from './player-infos';
export interface SetUpPartyParams {
    players: PlayerInfos[];
    player: PlayerInfos;
    game: Game
    accessCode: number;
    isLocked: boolean;
    maxPlayers: number;
}
