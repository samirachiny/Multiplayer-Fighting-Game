import { Coordinate } from '@common/interfaces/coordinate';
import { DiceAssignment } from './dice-assignment';
import { Character } from '@common/interfaces/character';
import { ItemType } from '@common/enums/item';
import { BotProfile } from '@common/enums/virtual-player-profile';

export interface PlayerInfos {
    pid: string;
    name: string;
    character: Character;
    isOrganizer: boolean;
    isGiveUp: boolean;
    isCurrentPlayer: boolean;
    speed: number;
    attack: number;
    defense: number;
    life: number;
    wins: number;
    items: ItemType[];
    availableMoves: number;
    remainingAction: number;
    diceAssignment: DiceAssignment;
    startPosition: Coordinate | null;
    currentPosition: Coordinate | null;
    previousPosition: Coordinate | null;
    hasSwapOpponentLifeEffect?: boolean;
    hasSecondChanceEffect?: boolean;
    hasFlag?: boolean;
    isVirtualPlayer?: boolean;
    virtualPlayerProfile?: BotProfile;
}

export interface Fighter {
    pid: string;
    name: string;
    character: Character;
    speed: number;
    attack: number;
    defense: number;
    life: number;
    remainEscape: number;
    diceAssignment: DiceAssignment;
    hasSwapOpponentLifeEffect?: boolean;
    hasSecondChanceEffect?: boolean;
    isVirtualPlayer?: boolean;
    virtualPlayerProfile?: BotProfile;
    hasTakenDamage?: boolean;
}
