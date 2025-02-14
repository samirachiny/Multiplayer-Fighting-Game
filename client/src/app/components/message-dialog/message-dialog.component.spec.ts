import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageDialogComponent } from './message-dialog.component';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

describe('MessageDialogComponent', () => {
    let component: MessageDialogComponent;
    let fixture: ComponentFixture<MessageDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MessageDialogComponent],
            providers: [{ provide: MAT_DIALOG_DATA, useValue: {} }],
        }).compileComponents();

        fixture = TestBed.createComponent(MessageDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
