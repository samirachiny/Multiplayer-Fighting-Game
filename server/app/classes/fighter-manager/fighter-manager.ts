import { Fighter } from '@common/interfaces/player-infos';
import { Dice } from '@common/enums/dice';
import { EVADE_ARRAY, MAX_VALUE_D4, MAX_VALUE_D6 } from '@app/utils/const';

export class FighterManager {
    fighter: Fighter;

    get pid(): string {
        return this.fighter.pid;
    }

    get isVirtualPlayer(): boolean {
        return this.fighter.isVirtualPlayer;
    }

    get remainEscape(): number {
        return this.fighter.remainEscape;
    }
    get attackDice(): Dice {
        return this.fighter.diceAssignment.attack;
    }

    get defenseDice(): Dice {
        return this.fighter.diceAssignment.defense;
    }

    setFighter(fighter: Fighter): void {
        this.fighter = fighter;
    }

    attackRoll(): number {
        return this.rollDice(this.fighter.diceAssignment.attack);
    }

    defenseRoll(): number {
        return this.rollDice(this.fighter.diceAssignment.defense);
    }

    getMinDefenseRoll(): number {
        return 1;
    }

    getMaxAttackRoll(): number {
        return this.fighter.diceAssignment.attack === Dice.D4 ? MAX_VALUE_D4 : MAX_VALUE_D6;
    }

    hasEscapeSuccessful(): boolean {
        const randomIndex = Math.floor(Math.random() * EVADE_ARRAY.length);
        return EVADE_ARRAY[randomIndex] === 1;
    }

    handleSwapOpponentLife(opponent: Fighter): boolean {
        if (!(this.fighter.life === 2 && this.fighter.hasSwapOpponentLifeEffect)) return false;
        this.fighter.hasSwapOpponentLifeEffect = false;
        this.swapLife(opponent);
        return true;
    }

    handleSecondLife(): boolean {
        if (!(this.fighter.life === 1 && this.fighter.hasSecondChanceEffect)) return false;
        this.fighter.hasSecondChanceEffect = false;
        this.fighter.life += 2;
        return true;
    }

    takeDamage(): void {
        this.fighter.life--;
        this.fighter.hasTakenDamage = true;
    }

    isDead(): boolean {
        return this.fighter.life === 0;
    }

    private swapLife(opponent: Fighter) {
        const tempLife = this.fighter.life;
        this.fighter.life = opponent.life;
        opponent.life = tempLife;
    }

    private generateRandomNumber(max: number): number {
        return Math.floor(Math.random() * max) + 1;
    }

    private rollDice(dice: Dice): number {
        if (dice === Dice.D4) return this.generateRandomNumber(MAX_VALUE_D4);
        return this.generateRandomNumber(MAX_VALUE_D6);
    }
}
