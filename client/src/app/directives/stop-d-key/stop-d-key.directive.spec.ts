import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { StopDKeyDirective } from './stop-d-key.directive';
@Component({
    template: '<input id="chatInput" appStopDKey />',
    imports: [StopDKeyDirective],
    standalone: true,
})
class TestComponent {}

describe('StopDKeyDirective', () => {
    let fixture: ComponentFixture<TestComponent>;
    let inputEl: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TestComponent, StopDKeyDirective],
        });

        fixture = TestBed.createComponent(TestComponent);
        inputEl = fixture.debugElement.query(By.css('#chatInput')).nativeElement;
    });

    it('should create an instance', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const directive = new StopDKeyDirective(inputEl as any);
        expect(directive).toBeTruthy();
    });

    it('should stop propagation of "d" key when input is focused', () => {
        inputEl.focus();
        const event = new KeyboardEvent('keydown', { key: 'd' });
        spyOn(event, 'stopPropagation');

        inputEl.dispatchEvent(event);

        expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should stop propagation of "D" key when input is focused', () => {
        inputEl.focus();
        const event = new KeyboardEvent('keydown', { key: 'D' });
        spyOn(event, 'stopPropagation');

        inputEl.dispatchEvent(event);

        expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should not stop propagation of other keys', () => {
        inputEl.focus();
        const event = new KeyboardEvent('keydown', { key: 'a' });
        spyOn(event, 'stopPropagation');

        inputEl.dispatchEvent(event);

        expect(event.stopPropagation).not.toHaveBeenCalled();
    });
});
