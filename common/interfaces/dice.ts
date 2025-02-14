import { Dice } from '../enums/dice';

export interface DiceRollResult {
    pid: string;
    type: Dice;
    result: number;
}

export interface RollDice {
    pid: string;
    type: Dice;
}

export interface DiceRollBonus {
    attackDiceRollResult: number;
    defenseDiceRollResult: number;
}
