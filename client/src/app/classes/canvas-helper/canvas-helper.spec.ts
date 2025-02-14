import { ElementRef } from '@angular/core';
import { CanvasHelper } from './canvas-helper';
import { Coordinate } from '@app/interfaces/coordinate';

describe('CanvasHelper', () => {
    let mockCanvas: ElementRef<HTMLCanvasElement>;
    let mockEvent: MouseEvent;

    beforeEach(() => {
        mockCanvas = {
            nativeElement: {
                getBoundingClientRect: jasmine.createSpy().and.returnValue({
                    left: 10,
                    top: 20,
                    right: 210,
                    bottom: 220,
                }),
            },
        } as unknown as ElementRef<HTMLCanvasElement>;

        mockEvent = {
            clientX: 50,
            clientY: 60,
        } as MouseEvent;
    });

    describe('getCanvasPosition', () => {
        it('should calculate correct canvas position', () => {
            const tileSize = 20;
            const result = CanvasHelper.getCanvasPosition(mockEvent, mockCanvas, tileSize);
            expect(result).toEqual({ x: 2, y: 2 });
        });

        it('should handle edge cases', () => {
            const tileSize = 20;
            mockEvent = {
                clientX: 10,
                clientY: 20,
            } as MouseEvent;
            const result = CanvasHelper.getCanvasPosition(mockEvent, mockCanvas, tileSize);
            expect(result).toEqual({ x: 0, y: 0 });
        });
    });

    describe('isMouseInsideCanvas', () => {
        it('should return true when mouse is inside canvas', () => {
            const result = CanvasHelper.isMouseInsideCanvas(mockEvent, mockCanvas);
            expect(result).toBe(true);
        });

        it('should return false when mouse is outside canvas', () => {
            mockEvent = {
                clientX: 5,
                clientY: 60,
            } as MouseEvent;
            let result = CanvasHelper.isMouseInsideCanvas(mockEvent, mockCanvas);
            expect(result).toBe(false);
            mockEvent = {
                clientX: 215,
                clientY: 60,
            } as MouseEvent;
            result = CanvasHelper.isMouseInsideCanvas(mockEvent, mockCanvas);
            expect(result).toBe(false);
            mockEvent = {
                clientX: 50,
                clientY: 15,
            } as MouseEvent;
            result = CanvasHelper.isMouseInsideCanvas(mockEvent, mockCanvas);
            expect(result).toBe(false);
            mockEvent = {
                clientX: 50,
                clientY: 225,
            } as MouseEvent;
            result = CanvasHelper.isMouseInsideCanvas(mockEvent, mockCanvas);
            expect(result).toBe(false);
        });
    });

    describe('getItemPositionInCanvas', () => {
        it('should calculate correct item position', () => {
            const coordinate: Coordinate = { x: 2, y: 3 };
            const tileSize = 20;

            // Mock getComputedStyle
            spyOn(window, 'getComputedStyle').and.returnValue({
                getPropertyValue: jasmine.createSpy().and.returnValue('5px'),
            } as unknown as CSSStyleDeclaration);

            const result = CanvasHelper.getItemPositionInCanvas(mockCanvas, coordinate, tileSize);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(result).toEqual([45, 65]);
        });

        it('should handle zero border width', () => {
            const coordinate: Coordinate = { x: 1, y: 1 };
            const tileSize = 30;

            spyOn(window, 'getComputedStyle').and.returnValue({
                getPropertyValue: jasmine.createSpy().and.returnValue('0px'),
            } as unknown as CSSStyleDeclaration);

            const result = CanvasHelper.getItemPositionInCanvas(mockCanvas, coordinate, tileSize);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(result).toEqual([30, 30]);
        });
    });
});
