import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-data';

describe('ConfirmationDialogComponent', () => {
    let component: ConfirmationDialogComponent;
    let fixture: ComponentFixture<ConfirmationDialogComponent>;
    let mockData: ConfirmationDialogData;

    beforeEach(async () => {
        mockData = {
            title: 'Test Title',
            body: 'Test Body',
            onAgreed: jasmine.createSpy('funcToCall'),
        };

        await TestBed.configureTestingModule({
            imports: [ConfirmationDialogComponent],
            providers: [{ provide: MAT_DIALOG_DATA, useValue: mockData }],
        }).compileComponents();

        fixture = TestBed.createComponent(ConfirmationDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call funcToCall when agreed request', () => {
        component.onAgreed();
        expect(mockData.onAgreed).toHaveBeenCalled();
    });

    it('should call funcToCall when refuse request', () => {
        mockData.onRefused = jasmine.createSpy('funcToCall');
        component.onRefused();
        expect(mockData.onRefused).toHaveBeenCalled();
    });

    it('should not call funcToCall if not funcToCall is passed in the dialog on refused', () => {
        component.onRefused();
        expect(mockData.onRefused).toBeUndefined();
    });
});
