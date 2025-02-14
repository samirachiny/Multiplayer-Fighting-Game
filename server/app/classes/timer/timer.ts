import { MILLISECONDS } from '@app/utils/const';
import { Subject, Observable } from 'rxjs';

export class Timer {
    readonly updateTime$: Observable<number>;
    readonly end$: Observable<boolean>;
    private duration: number;
    private remainingTime: number;
    private updateTime: Subject<number>;
    private end: Subject<boolean>;
    private intervalId: ReturnType<typeof setInterval> | null = null;

    constructor(duration: number) {
        this.duration = duration;
        this.remainingTime = duration;
        this.updateTime = new Subject<number>();
        this.updateTime$ = this.updateTime.asObservable();
        this.end = new Subject<boolean>();
        this.end$ = this.end.asObservable();
    }

    setDuration(duration: number) {
        this.duration = duration;
    }

    start(): void {
        if (this.intervalId) return;
        this.intervalId = setInterval(() => this.tick(), MILLISECONDS);
    }

    stop(): void {
        if (!this.intervalId) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    resetRemainingTime() {
        this.remainingTime = this.duration;
    }

    reset(): void {
        this.stop();
        this.remainingTime = this.duration;
        this.start();
    }

    private tick(): void {
        this.remainingTime--;
        this.updateTime.next(this.remainingTime);
        if (this.remainingTime === 0) {
            this.stop();
            this.end.next(true);
        }
    }
}
