/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Timer } from '@app/classes/timer/timer'; // Adjust the import path as needed

describe('Timer Class', () => {
    let timer: any;
    const duration = 3; // Set a short duration for testing
    const MILLISECONDS = 1000; // Assuming MILLISECONDS is 1000

    beforeEach(() => {
        timer = new Timer(duration);
    });

    afterEach(() => {
        if (timer.intervalId) {
            timer.stop();
        }
        timer = null;
        sinon.restore();
    });

    describe('constructor', () => {
        it('should initialize properties correctly', () => {
            expect(timer.duration).to.equal(duration);
            expect(timer.remainingTime).to.equal(duration);
            expect(timer.updateTime$).to.not.to.equal(null);
            expect(timer.updateTime$).to.not.to.equal(undefined);
            expect(timer.end$).to.not.to.equal(null);
            expect(timer.end$).to.not.to.equal(undefined);
            expect(timer.intervalId).to.equal(null);
        });
    });

    describe('start()', () => {
        it('should start the timer if not already started', () => {
            timer.start();
            expect(timer.intervalId).to.not.to.equal(null);
        });

        it('should not start the timer if it is already running', () => {
            timer.start();
            const intervalId = timer.intervalId;
            timer.start();
            expect(timer.intervalId).to.equal(intervalId);
        });
    });

    describe('stop()', () => {
        it('should stop the timer if it is running', () => {
            timer.start();
            timer.stop();
            expect(timer.intervalId).to.equal(null);
        });

        it('should not throw an error if the timer is not running', () => {
            expect(() => timer.stop()).to.not.throw();
            expect(timer.intervalId).to.equal(null);
        });
    });

    describe('setDuration()', () => {
        it('should set the duration to a positive number', () => {
            const dur = 10;
            timer.setDuration(dur);
            expect(timer['duration']).to.equal(dur);
        });
    });

    describe('reset()', () => {
        it('should reset remainingTime and restart the timer when running', () => {
            timer.start();
            timer.remainingTime = 1;
            const previousIntervalId = timer.intervalId;
            timer.reset();
            expect(timer.remainingTime).to.equal(duration);
            expect(timer.intervalId).to.not.equal(previousIntervalId);
        });

        it('should reset remainingTime and start the timer when not running', () => {
            timer.remainingTime = 1;
            timer.reset();
            expect(timer.remainingTime).to.equal(duration);
            expect(timer.intervalId).to.not.to.equal(null);
        });
    });

    describe('tick()', () => {
        let clock: any;
        let updateTimeSpy: any;
        let endSpy: any;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            updateTimeSpy = sinon.spy();
            endSpy = sinon.spy();
            timer.updateTime$.subscribe(updateTimeSpy);
            timer.end$.subscribe(endSpy);
        });

        afterEach(() => {
            clock.restore();
        });

        it('should decrement remainingTime and emit updateTime$', () => {
            timer.start();
            clock.tick(MILLISECONDS);
            expect(timer.remainingTime).to.equal(duration - 1);
            expect(updateTimeSpy.calledWith(duration - 1)).to.equal(true);
        });

        it('should stop the timer and emit end$ when remainingTime reaches zero', () => {
            timer.start();
            clock.tick(duration * MILLISECONDS);
            expect(timer.remainingTime).to.equal(0);
            expect(endSpy.calledWith(true)).to.equal(true);
            expect(timer.intervalId).to.equal(null);
        });

        it('should not decrement remainingTime below zero', () => {
            timer.start();
            clock.tick((duration + 2) * MILLISECONDS);
            expect(timer.remainingTime).to.equal(0);
            expect(updateTimeSpy.callCount).to.equal(duration);
            expect(endSpy.calledOnce).to.equal(true);
        });
    });

    describe('Edge Cases', () => {
        let clock: any;
        let updateTimeSpy: any;
        let endSpy: any;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            updateTimeSpy = sinon.spy();
            endSpy = sinon.spy();
            timer.updateTime$.subscribe(updateTimeSpy);
            timer.end$.subscribe(endSpy);
        });

        afterEach(() => {
            clock.restore();
        });

        it('should handle multiple starts gracefully', () => {
            timer.start();
            const intervalId = timer.intervalId;
            timer.start();
            expect(timer.intervalId).to.equal(intervalId);
        });

        it('should handle multiple stops gracefully', () => {
            timer.start();
            timer.stop();
            timer.stop();
            expect(timer.intervalId).to.equal(null);
        });

        it('should handle reset when timer is running', () => {
            timer.start();
            const previousIntervalId = timer.intervalId;
            timer.reset();
            expect(timer.remainingTime).to.equal(duration);
            expect(timer.intervalId).to.not.equal(previousIntervalId);
        });

        it('should handle reset when timer is not running', () => {
            timer.reset();
            expect(timer.remainingTime).to.equal(duration);
            expect(timer.intervalId).to.not.to.equal(null);
        });

        it('should not emit end$ multiple times', () => {
            timer.start();
            clock.tick((duration + 2) * MILLISECONDS);
            expect(endSpy.calledOnce).to.equal(true);
        });

        it('should handle negative duration', () => {
            const negativeDuration = -5;
            const negativeTimer = new Timer(negativeDuration);
            negativeTimer.updateTime$.subscribe(updateTimeSpy);
            negativeTimer.end$.subscribe(endSpy);

            negativeTimer.start();
            clock.tick(MILLISECONDS);

            expect(negativeTimer['remainingTime']).to.equal(negativeDuration - 1);
            expect(updateTimeSpy.calledWith(negativeDuration - 1)).to.equal(true);
            expect(endSpy.called).to.equal(false);
        });

        it('should handle zero duration', () => {
            const zeroTimer = new Timer(0);
            zeroTimer.updateTime$.subscribe(updateTimeSpy);
            zeroTimer.end$.subscribe(endSpy);

            zeroTimer.start();
            clock.tick(MILLISECONDS);

            expect(zeroTimer['remainingTime']).to.equal(-1);
            expect(updateTimeSpy.calledWith(-1)).to.equal(true);
            expect(endSpy.called).to.equal(false);
        });

        it('should not emit updateTime$ after remainingTime reaches zero', () => {
            timer.start();
            clock.tick(duration * MILLISECONDS);
            updateTimeSpy.resetHistory();
            clock.tick(MILLISECONDS);
            expect(updateTimeSpy.notCalled).to.equal(true);
        });

        it('should not throw error when stop is called multiple times', () => {
            timer.start();
            timer.stop();
            expect(() => timer.stop()).to.not.throw();
        });

        it('should handle immediate stop after start', () => {
            timer.start();
            timer.stop();
            expect(timer.intervalId).to.equal(null);
        });

        it('should handle multiple subscribers to updateTime$ and end$', () => {
            const anotherUpdateTimeSpy = sinon.spy();
            const anotherEndSpy = sinon.spy();
            timer.updateTime$.subscribe(anotherUpdateTimeSpy);
            timer.end$.subscribe(anotherEndSpy);

            timer.start();
            clock.tick(MILLISECONDS);

            expect(updateTimeSpy.calledWith(duration - 1)).to.equal(true);
            expect(anotherUpdateTimeSpy.calledWith(duration - 1)).to.equal(true);

            clock.tick((duration - 1) * MILLISECONDS);

            expect(endSpy.calledWith(true)).to.equal(true);
            expect(anotherEndSpy.calledWith(true)).to.equal(true);
        });
    });
});
