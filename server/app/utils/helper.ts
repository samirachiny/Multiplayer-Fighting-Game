import { Coordinate } from '@common/interfaces/coordinate';
import { TIME_CONSTANTS, BASE_TILE_DECIMAL } from './const';

export function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function isAtDistanceEdge(dx: number, dy: number, distance: number): boolean {
    return Math.abs(dx) === distance || Math.abs(dy) === distance;
}

export function coordinateToString(pos: Coordinate): string {
    return `${pos.x},${pos.y}`;
}

export function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / TIME_CONSTANTS.minuteToSeconds);
    const remainingSeconds = seconds % TIME_CONSTANTS.minuteToSeconds;
    const minutesString = padWithZero(minutes);
    const secondsString = padWithZero(remainingSeconds);
    return `${minutesString}:${secondsString}`;
}

export function calculateDurationInSeconds(startTime: number, endTime: number): number {
    const durationInMilliseconds = endTime - startTime;
    return Math.floor(durationInMilliseconds / TIME_CONSTANTS.secondToMilliseconds);
}

export function convertToTimestamp(date: string | Date): number {
    return new Date(date).getTime();
}

export async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sameCoordinate(firstPosition: Coordinate, secondPosition: Coordinate): boolean {
    return firstPosition.x === secondPosition.x && firstPosition.y === secondPosition.y;
}

function padWithZero(value: number): string {
    return value < BASE_TILE_DECIMAL ? `0${value}` : `${value}`;
}
