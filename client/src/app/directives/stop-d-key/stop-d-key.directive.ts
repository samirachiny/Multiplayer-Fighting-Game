import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
    selector: '[appStopDKey]',
    standalone: true,
})
export class StopDKeyDirective {
    constructor(private el: ElementRef) {}

    @HostListener('keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        if (this.el.nativeElement === document.activeElement && (event.key === 'd' || event.key === 'D')) {
            event.stopPropagation();
        }
    }
}
