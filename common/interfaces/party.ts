import { Game } from './game';
import { PlayerInfos } from './player-infos';
import { ChatMessage } from './chat-message';
import { GameLogs } from './game-logs';

export interface Party {
    id: string;
    charactersOccupiedIds: Map<string, number>;
    chatMessages: ChatMessage[];
    game: Game;
    isLocked: boolean;
    accessCode: number;
    logs: GameLogs[];
    isDebugMode: boolean;
    hasDoubleIceBreakEffect?: boolean;
    hasDecreaseLoserWinsEffect?: boolean;
    isChoosingItem?: boolean;
}

export interface PartyInfos {
    game: Game;
    players: PlayerInfos[];
}
