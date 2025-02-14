import { Dice } from '@common/enums/dice';
import { Coordinate } from '@common/interfaces/coordinate';
import { Fighter, PlayerInfos } from '@common/interfaces/player-infos';

export const MIDDLE_POSITIONS: Coordinate[] = [
    { x: 10, y: 6 },
    { x: 15, y: 4 },
    { x: 10, y: 10 },
    { x: 5, y: 5 },
    { x: 17, y: 7 },
    { x: 9, y: 18 },
    { x: 4, y: 14 },
];

export const INVALID_POSITIONS: Coordinate[] = [
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: -1 },
    { x: 0, y: 20 },
    { x: 20, y: 20 },
];

export const CORNER_POSITIONS: Coordinate[] = [
    { x: 19, y: 19 },
    { x: 0, y: 19 },
    { x: 0, y: 0 },
    { x: 19, y: 0 },
];

export const BOUNDARY_POSITIONS: Coordinate[] = [
    { x: 0, y: 15 },
    { x: 17, y: 0 },
    { x: 19, y: 7 },
    { x: 4, y: 19 },
];

export const VALID_POSITIONS: Coordinate[] = [...MIDDLE_POSITIONS, ...CORNER_POSITIONS, ...BOUNDARY_POSITIONS];

export const MOCK_PLAYER_INFOS: PlayerInfos = {
    pid: 'player1',
    name: 'MockPlayer',
    character: null,
    isOrganizer: false,
    isGiveUp: null,
    isCurrentPlayer: null,
    speed: 5,
    attack: 6,
    defense: 7,
    life: 4,
    wins: 0,
    items: [],
    availableMoves: null,
    remainingAction: null,
    diceAssignment: {
        attack: Dice.D4,
        defense: Dice.D6,
    },
    startPosition: null,
    currentPosition: { x: 0, y: 0 },
    previousPosition: null,
};

export const MOCK_FIGHTER: Fighter = {
    pid: 'player1',
    name: 'MockPlayer',
    character: null,
    speed: 5,
    attack: 6,
    defense: 7,
    life: 4,
    diceAssignment: {
        attack: Dice.D4,
        defense: Dice.D6,
    },
    remainEscape: 2,
};

export const FAST_PLAYER: Fighter = {
    pid: 'player0',
    name: 'Sonic',
    character: null,
    speed: 10,
    attack: 5,
    defense: 5,
    life: 5,
    diceAssignment: {
        attack: Dice.D6,
        defense: Dice.D4,
    },
    remainEscape: 4,
};

export const SLOW_PLAYER: Fighter = {
    pid: 'player1',
    name: 'Sonic',
    character: null,
    speed: 1,
    attack: 5,
    defense: 5,
    life: 5,
    diceAssignment: {
        attack: Dice.D6,
        defense: Dice.D4,
    },
    remainEscape: 3,
};

export const STRIKER_PLAYER: Fighter = {
    pid: 'player2',
    name: 'Striker',
    character: null,
    speed: 5,
    attack: 10,
    defense: 5,
    life: 5,
    diceAssignment: {
        attack: Dice.D6,
        defense: Dice.D4,
    },
    remainEscape: 6,
};

export const WEAK_STRIKER_PLAYER: Fighter = {
    pid: 'player3',
    name: 'WeakStriker',
    character: null,
    speed: 5,
    attack: 1,
    defense: 5,
    life: 5,
    diceAssignment: {
        attack: Dice.D4,
        defense: Dice.D6,
    },
    remainEscape: 3,
};

export const TANK_PLAYER: Fighter = {
    pid: 'player4',
    name: 'Tank',
    character: null,
    speed: 5,
    attack: 5,
    defense: 10,
    life: 5,
    diceAssignment: {
        attack: Dice.D4,
        defense: Dice.D6,
    },
    remainEscape: 1,
};

export const WEAK_TANK_PLAYER: Fighter = {
    pid: 'player5',
    name: 'WeakTank',
    character: null,
    speed: 5,
    attack: 5,
    defense: 1,
    life: 5,
    diceAssignment: {
        attack: Dice.D6,
        defense: Dice.D4,
    },
    remainEscape: 0,
};

export const FIRST_PLAYER: Fighter = {
    pid: 'player6',
    name: 'Ash',
    character: null,
    speed: 7,
    attack: 10,
    defense: 4,
    life: 5,
    diceAssignment: {
        attack: Dice.D6,
        defense: Dice.D4,
    },
    remainEscape: 3,
};

export const SECOND_PLAYER: Fighter = {
    pid: 'player7',
    name: 'Revenant',
    character: null,
    speed: 5,
    attack: 10,
    defense: 3,
    life: 5,
    diceAssignment: {
        attack: Dice.D6,
        defense: Dice.D4,
    },
    remainEscape: 1,
};

export const MOCK_PLAYERS: PlayerInfos[] = [
    {
        pid: '0',
        name: 'robotPlayer',
        character: null,
        isOrganizer: false,
        isGiveUp: null,
        isCurrentPlayer: null,
        speed: 4,
        attack: 6,
        defense: 7,
        life: 4,
        wins: 0,
        availableMoves: 4,
        remainingAction: null,
        diceAssignment: {
            attack: Dice.D4,
            defense: Dice.D6,
        },
        startPosition: null,
        currentPosition: { x: 5, y: 5 },
        previousPosition: null,
        items: [],
    },
    {
        pid: '1',
        name: 'player1',
        character: null,
        isOrganizer: false,
        isGiveUp: null,
        isCurrentPlayer: null,
        speed: 4,
        attack: 6,
        defense: 7,
        life: 4,
        wins: 0,
        availableMoves: 4,
        remainingAction: null,
        diceAssignment: {
            attack: Dice.D4,
            defense: Dice.D6,
        },
        startPosition: null,
        currentPosition: { x: 2, y: 2 },
        previousPosition: null,
        items: [],
    },
    {
        pid: '2',
        name: 'player2',
        character: null,
        isOrganizer: false,
        isGiveUp: null,
        isCurrentPlayer: null,
        speed: 4,
        attack: 6,
        defense: 7,
        life: 4,
        wins: 0,
        availableMoves: 4,
        remainingAction: null,
        diceAssignment: {
            attack: Dice.D4,
            defense: Dice.D6,
        },
        startPosition: null,
        currentPosition: { x: 3, y: 8 },
        previousPosition: null,
        items: [],
    },
    {
        pid: '3',
        name: 'player3',
        character: null,
        isOrganizer: false,
        isGiveUp: null,
        isCurrentPlayer: null,
        speed: 4,
        attack: 6,
        defense: 7,
        life: 4,
        wins: 0,
        availableMoves: 4,
        remainingAction: null,
        diceAssignment: {
            attack: Dice.D4,
            defense: Dice.D6,
        },
        startPosition: null,
        currentPosition: { x: 8, y: 1 },
        previousPosition: null,
        items: [],
    },
];
