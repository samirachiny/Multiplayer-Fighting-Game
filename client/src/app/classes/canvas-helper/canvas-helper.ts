import { ElementRef } from '@angular/core';
import { Coordinate } from '@app/interfaces/coordinate';

export class CanvasHelper {
    static getCanvasPosition(event: MouseEvent, canvas: ElementRef<HTMLCanvasElement>, tileSize: number): Coordinate {
        const rect = canvas.nativeElement.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / tileSize);
        const y = Math.floor((event.clientY - rect.top) / tileSize);
        return { x, y };
    }

    static isMouseInsideCanvas(event: MouseEvent, canvas: ElementRef<HTMLCanvasElement>): boolean {
        const rect = canvas.nativeElement.getBoundingClientRect();
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        return mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
    }

    static getItemPositionInCanvas(canvas: ElementRef<HTMLCanvasElement>, coordinate: Coordinate, tileSize: number): [number, number] {
        const canvasStyle = window.getComputedStyle(canvas.nativeElement);
        const borderWidth = parseInt(canvasStyle.getPropertyValue('border-width'), 10);
        const leftPosition = coordinate.x * tileSize + borderWidth;
        const topPosition = coordinate.y * tileSize + borderWidth;
        return [leftPosition, topPosition];
    }
}
