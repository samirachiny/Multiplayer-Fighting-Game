/* eslint-disable max-lines */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { expect } from 'chai';
import { FighterManager } from '@app/classes/fighter-manager/fighter-manager';
import { MOCK_FIGHTER } from '@app/utils/data';
import { Dice } from '@common/enums/dice';
import { MAX_VALUE_D4, MAX_VALUE_D6 } from '@app/utils/const';
describe('Fighter Manager class', () => {
    const mockFighterManager = new FighterManager();
    beforeEach(() => {
        mockFighterManager.setFighter(MOCK_FIGHTER);
    });

    describe('Getters', () => {
        it('should return the correct pid', () => {
            const pid = mockFighterManager.pid;
            expect(pid).to.equal(MOCK_FIGHTER.pid);
        });
        it('should return the correct isVirtualPlayer status', () => {
            const isVirtualPlayer = mockFighterManager.isVirtualPlayer;
            expect(isVirtualPlayer).to.equal(MOCK_FIGHTER.isVirtualPlayer);
        });
        it('should return the correct remainEscape value', () => {
            const remainEscape = mockFighterManager.remainEscape;
            expect(remainEscape).to.equal(MOCK_FIGHTER.remainEscape);
        });
        it('should return the correct attackDice value', () => {
            const attackDice = mockFighterManager.attackDice;
            expect(attackDice).to.equal(MOCK_FIGHTER.diceAssignment.attack);
        });
        it('should return the correct defenseDice value', () => {
            const defenseDice = mockFighterManager.defenseDice;
            expect(defenseDice).to.equal(MOCK_FIGHTER.diceAssignment.defense);
        });
    });

    describe('Fighter Manager initilization and stat setting', () => {
        it('should pass the correct stats to the Fighter', () => {
            expect((mockFighterManager as any).fighter.attack).to.equal(MOCK_FIGHTER.attack);
            expect((mockFighterManager as any).fighter.defense).to.equal(MOCK_FIGHTER.defense);
        });
    });

    describe('basic fighter actions', () => {
        it('should roll the attack dice with the correct bonuse range', () => {
            const attackValue = mockFighterManager.attackRoll();
            expect(attackValue).to.be.within(1, 4);
        });

        it('should roll the defense dice with the correct bonuse range', () => {
            const defenseValue = mockFighterManager.defenseRoll();
            expect(defenseValue).to.be.within(1, 6);
        });

        it('should return true for evadeRoll 40 % of the time', () => {
            const originalRandom = Math.random;
            Math.random = () => 0.9;
            expect(mockFighterManager.hasEscapeSuccessful()).to.be.true;
            Math.random = originalRandom;
        });

        it('should return false for evadeRoll 60% of the time', () => {
            const originalRandom = Math.random;
            Math.random = () => 0.1;
            expect(mockFighterManager.hasEscapeSuccessful()).to.be.false;
            Math.random = originalRandom;
        });

        it('should properly decrement life points', () => {
            const life = mockFighterManager.fighter.life;
            mockFighterManager.takeDamage();
            expect(mockFighterManager.fighter.life).to.equal(life - 1);
        });

        it('should tell when a Fighter is dead', () => {
            mockFighterManager.fighter.life = 0;
            expect(mockFighterManager.isDead()).to.equal(true);
        });
    });

    describe('getMinDefenseRoll', () => {
        it('should return min value', () => {
            const result = mockFighterManager.getMinDefenseRoll();
            expect(result).to.equal(1);
        });
    });

    describe('getMaxAttackRoll', () => {
        it('should return max value of dice attack', () => {
            mockFighterManager.fighter.diceAssignment.attack = Dice.D4;
            let result = mockFighterManager.getMaxAttackRoll();
            expect(result).to.equal(MAX_VALUE_D4);
            mockFighterManager.fighter.diceAssignment.attack = Dice.D6;
            result = mockFighterManager.getMaxAttackRoll();
            expect(result).to.equal(MAX_VALUE_D6);
        });
    });

    describe('handleSwapOpponentLife', () => {
        it('should swap life with opponent if conditions are met', () => {
            const opponent = { life: 5 } as any;
            mockFighterManager.fighter.life = 2;
            mockFighterManager.fighter.hasSwapOpponentLifeEffect = true;
            const result = mockFighterManager.handleSwapOpponentLife(opponent);
            expect(result).to.be.true;
            expect(mockFighterManager.fighter.life).to.equal(5);
            expect(opponent.life).to.equal(2);
            expect(mockFighterManager.fighter.hasSwapOpponentLifeEffect).to.be.false;
        });
        it('should not swap life with opponent if conditions are not met', () => {
            const opponent = { life: 5 } as any;
            mockFighterManager.fighter.life = 3;
            mockFighterManager.fighter.hasSwapOpponentLifeEffect = true;
            const result = mockFighterManager.handleSwapOpponentLife(opponent);
            expect(result).to.be.false;
            expect(mockFighterManager.fighter.life).to.equal(3);
            expect(opponent.life).to.equal(5);
        });
    });
    describe('handleSecondLife', () => {
        it('should grant second life if conditions are met', () => {
            mockFighterManager.fighter.life = 1;
            mockFighterManager.fighter.hasSecondChanceEffect = true;
            const result = mockFighterManager.handleSecondLife();
            expect(result).to.be.true;
            expect(mockFighterManager.fighter.life).to.equal(3);
            expect(mockFighterManager.fighter.hasSecondChanceEffect).to.be.false;
        });
        it('should not grant second life if conditions are not met', () => {
            mockFighterManager.fighter.life = 2;
            mockFighterManager.fighter.hasSecondChanceEffect = true;
            const result = mockFighterManager.handleSecondLife();
            expect(result).to.be.false;
            expect(mockFighterManager.fighter.life).to.equal(2);
            expect(mockFighterManager.fighter.hasSecondChanceEffect).to.be.true;
        });
    });
    describe('generateRandomNumber', () => {
        it('should generate a random number within the specified range', () => {
            const max = 6;
            const result = mockFighterManager['generateRandomNumber'](max);
            expect(result).to.be.within(1, max);
        });
    });
    describe('rollDice', () => {
        it('should roll a D4 dice and return a value within the correct range', () => {
            const result = mockFighterManager['rollDice'](Dice.D4);
            expect(result).to.be.within(1, MAX_VALUE_D4);
        });
        it('should roll a D6 dice and return a value within the correct range', () => {
            const result = mockFighterManager['rollDice'](Dice.D6);
            expect(result).to.be.within(1, MAX_VALUE_D6);
        });
    });
});
