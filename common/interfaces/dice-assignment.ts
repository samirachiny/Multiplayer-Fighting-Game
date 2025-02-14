import { Dice } from '../enums/dice';

export interface DiceAssignment {
    attack: Dice | null;
    defense: Dice | null;
}
