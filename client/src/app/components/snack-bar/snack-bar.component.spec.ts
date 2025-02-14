import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SnackBarComponent } from './snack-bar.component';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

describe('SnackBarComponent', () => {
    let component: SnackBarComponent;
    let fixture: ComponentFixture<SnackBarComponent>;
    let mockSnackBarRef: jasmine.SpyObj<MatSnackBarRef<SnackBarComponent>>;

    beforeEach(async () => {
        mockSnackBarRef = jasmine.createSpyObj('MatSnackBarRef', ['dismissWithAction']);
        await TestBed.configureTestingModule({
            providers: [
                { provide: MatSnackBarRef, useValue: mockSnackBarRef },
                { provide: MAT_SNACK_BAR_DATA, useValue: { message: '' } },
            ],
            imports: [SnackBarComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(SnackBarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
