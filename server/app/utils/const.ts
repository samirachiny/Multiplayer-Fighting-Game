import { Coordinate } from '@common/interfaces/coordinate';
import { TileType } from '@common/enums/tile';
import { DiceInfos, FightEventInfos, LogMessageTemplates } from '@common/types/log-message-template';
import { LogTypeEvent } from '@common/enums/log-type';
import { GameMapSize } from '@common/enums/game-infos';
import { ItemType } from '@common/enums/item';

export const TIME_CONSTANTS = {
    secondToMilliseconds: 1000,
    minuteToSeconds: 60,
};

export const PID_BASE = 36;
export const PID_START_INDEX = 2;
export const PID_LENGTH = 9;

export const BASE_STAT = 4;
export const BOOSTED_STAT = 6;
export const STAT_BOOST = 2;

export const BASE36 = 36;
export const MAX_GAME_ID_LENGTH = 10;
export const MILLISECONDS = 1000;
export const MIN_ITEM_COUNT = 2;
export const BOT_NAMES = ['Beaurel', 'Bouka', 'Raissa', 'Aymane', 'Rym', 'Samira', 'Chiny', 'Duc', 'JK', 'Jin', 'Suga', 'RM', 'V', 'JHope', 'Jimin'];

const RIGHT: Coordinate = { x: 1, y: 0 };
const DOWN: Coordinate = { x: 0, y: 1 };
const LEFT: Coordinate = { x: -1, y: 0 };
const UP: Coordinate = { x: 0, y: -1 };

const DIRECTIONS = [UP, LEFT, DOWN, RIGHT];
export const MIN_FREE_TILE_PERCENT_REQUIRED = 0.5;
export const BASE_TILE_DECIMAL = 10;

export { UP, LEFT, RIGHT, DOWN, DIRECTIONS };

export const MIN_ACCESS_CODE = 1000;
export const MAX_ACCESS_CODE_RANGE = 9000;

export const TILE_COSTS: Map<number, number> = new Map<number, number>([
    [TileType.Wall, -1],
    [TileType.DoorClosed, -1],
    [TileType.Ice, 0],
    [TileType.Base, 1],
    [TileType.DoorOpen, 1],
    [TileType.Water, 2],
]);
export const ALL_ITEMS: ItemType[] = [
    ItemType.BoostAttack,
    ItemType.BoostDefense,
    ItemType.SecondChance,
    ItemType.SwapOpponentLife,
    ItemType.DecreaseLoserWins,
    ItemType.DoubleIceBreak,
];

export const ICE_DEBUFF = -2;
export const SLIP_ARRAY = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
export const SLIP_DOUBLE_ARRAY = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1];
export const EVADE_ARRAY = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1];
export const MAX_VALUE_D4 = 4;
export const MAX_VALUE_D6 = 6;
export const TIME_PER_ROUND = 5;
export const TIME_PER_ROUND_WITH_NO_ESCAPE = 3;
export const MAX_PERCENT = 100;
export const MAX_ITEMS = 2;
export const STAT_BONUS = 2;
export const LOGS_MESSAGES: LogMessageTemplates = {
    beginParty: () => 'Début de la partie',
    startCombat: (players?: string[]) => {
        const [player1, player2] = players ?? ['Joueur1', 'Joueur2'];
        return `Début de combat entre ${player1} et ${player2}`;
    },
    startTurn: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `Début de tour pour ${player1}`;
    },
    collectItem: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `${player1} a ramassé un objet`;
    },
    collectFlag: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `${player1} a ramasse le drapeau`;
    },
    closeDoor: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `${player1} a ferme une porte`;
    },
    openDoor: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `${player1} a ouvert une porte`;
    },
    quitGame: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `${player1} a quitté la partie`;
    },
    endGame: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `Fin de la partie: Victoire de ${player1}`;
    },
    debugOn: () => 'Mode de débogage activé',
    debugOff: () => 'Mode de débogage desactivé',
    endFight: (players?: string[]) => {
        const [player1, player2] = players ?? ['Joueur1', 'Joueur2'];
        return `Fin du combat: ${player1} a vaincu ${player2}`;
    },
    endTurn: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `Fin de tour pour ${player1}`;
    },
    giveUp: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `${player1} a abandonner la partie`;
    },
    attackTo: (players?: string[], moreInfos?: FightEventInfos) => {
        const [player1, player2] = players ?? ['Joueur1', 'Joueur2'];
        return `Attaque: ${player1} attaque ${player2}. ${(moreInfos as number) > 0 ? `${player2} a subit ${moreInfos}xp de dommage` : 'Échec'}`;
    },
    defenseFrom: (players?: string[], moreInfos?: FightEventInfos) => {
        const [player1, player2] = players ?? ['Joueur1', 'Joueur2'];
        return `Defense: ${player1} s'est defendu de ${player2}. ${(moreInfos as boolean) ? 'Réussite' : 'Échec'}`;
    },
    escapeFrom: (players?: string[], moreInfos?: FightEventInfos) => {
        const [player1, player2] = players ?? ['Joueur1', 'Joueur2'];
        return `Évasion: ${player1} tente une évasion contre ${player2}. ${(moreInfos as boolean) ? 'Réussite' : 'Échec'}`;
    },
    endFightWithoutWinner: (players?: string[]) => {
        const [player1, player2] = players ?? ['Joueur1', 'Joueur2'];
        return `Fin du combat entre ${player1} et ${player2}. Aucun vainqueur`;
    },
    computeDiceAttackBonus: (players?: string[], moreInfos?: FightEventInfos) => {
        if (!players) return '';
        const computeBonus = (moreInfos as DiceInfos).faceNumber + (moreInfos as DiceInfos).targetToApply;
        const faceNumber = (moreInfos as DiceInfos).faceNumber;
        const targetToApplyScore = (moreInfos as DiceInfos).targetToApply;
        return `${players[0]} a bonus d'attaque = (Dé)${faceNumber}+(Attaque)${targetToApplyScore} = ${computeBonus}.`;
    },
    computeDiceDefenseBonus: (players?: string[], moreInfos?: FightEventInfos) => {
        if (!players) return '';
        const computeBonus = (moreInfos as DiceInfos).faceNumber + (moreInfos as DiceInfos).targetToApply;
        const faceNumber = (moreInfos as DiceInfos).faceNumber;
        const targetToApplyScore = (moreInfos as DiceInfos).targetToApply;
        return `${players[0]} a bonus de defense = (Dé)${faceNumber}+(Defense)${targetToApplyScore} = ${computeBonus}.`;
    },
    lossTheFlag: (players?: string[]) => {
        const [player1] = players ?? ['Joueur1'];
        return `${player1} a perdu le drapeau`;
    },
};

export const CHARACTERS_OPTIONS_SIZE = 12;
export const PORT_NUMBER_BASE = 10;
export const TIME_WAITING_AFTER_SLIP = 1000;
export const MOVE_TIME_INTERVAL = 150;
export const DICE_ROLL_RESULT_TIME = 2000;
export const TIME_HANDLE_ATTACK = 2000;
export const TIME_HANDLE_EVASION = 2000;
export const TIME_BEFORE_END_BATTLE = 1000;
export const VICTORIES_REQUIRED_TO_WIN = 3;
export const VALIDATE_ACCESS_CODE_FEEDBACK = {
    partyFull: 'La partie est pleine',
    partyLocked: 'La partie est verouillée',
    partyRoomFull: 'La partie contient trop de joueurs en attente',
    invalidCode: 'Code invalide',
};
export const CREATE_PARTY_FLAG_ERROR = 'Impossible de rejoindre une partie en mode Flag. Mode de jeu sera prochainement disponible.';
export const GAME_NOT_AVAILABLE = "Le jeu n'est pas disponible car il n'existe plus ou n'est pas visible";
export const ROUND_TIME = 30;
export const COUNTDOWN_TIME = 3;
export const MAX_MOVEMENT_POINTS = 500;
export const MAX_VIRTUAL_PLAYER_ACTION_DELAY = 6000;

export const FIGHT_LOGS_TYPES = new Set<LogTypeEvent>([
    LogTypeEvent.ComputeDiceAttackBonus,
    LogTypeEvent.ComputeDiceDefenseBonus,
    LogTypeEvent.DefenseFrom,
    LogTypeEvent.AttackTo,
    LogTypeEvent.EscapeFrom,
]);

export const ITEM_COUNT_ERROR: { [key in GameMapSize]: string } = {
    [GameMapSize.Small]: 'il faut à la exactement 2 items.',
    [GameMapSize.Medium]: 'il faut minimun 2 et maximum 4 items.',
    [GameMapSize.Large]: 'il faut minimun 2 et maximum 6 items.',
};

export const SOCKET_CONNECTION_OPTIONS = { cors: { origin: '*', methods: ['GET', 'POST'] } };
