import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import {
    CREATE_GAME_PARAMS,
    GAME_MODE_OPTIONS,
    ITEMS_PER_MAP_SIZE_OPTIONS,
    MAP_SIZE_OPTIONS,
    PLAYERS_PER_MAP_SIZE_OPTIONS,
} from '@app/constants/consts';
import { AppMaterialModule } from '@app/modules/material.module';
import { of } from 'rxjs';
import { CreateGameComponent } from './create-game.component';

export class MatDialogMock {
    open() {
        return {
            afterClosed: () => of({}),
        };
    }
}
describe('CreateGameComponent', () => {
    let component: CreateGameComponent;
    let fixture: ComponentFixture<CreateGameComponent>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [CreateGameComponent, FormsModule, AppMaterialModule, NoopAnimationsModule],
            providers: [
                { provide: MatDialog, useClass: MatDialogMock },
                { provide: Router, useValue: mockRouter },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateGameComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return itemsOptions', () => {
        expect(component.itemsOptions).toEqual(ITEMS_PER_MAP_SIZE_OPTIONS);
    });

    it('should return playersOptions', () => {
        expect(component.playersOptions).toEqual(PLAYERS_PER_MAP_SIZE_OPTIONS);
    });

    it('should return mapSizeOptions', () => {
        expect(component.mapSizeOptions).toEqual(MAP_SIZE_OPTIONS);
    });

    it('should return gameModeOption', () => {
        expect(component.gameModeOptions).toEqual(GAME_MODE_OPTIONS);
    });
    it('should open dialog when openDialog is called', () => {
        const mockDialogSpy = spyOn(component['matDialog'], 'open');
        component.openDialog();
        expect(mockDialogSpy).toHaveBeenCalledOnceWith(component['createGameDetailDialogRef']);
    });

    it('should navigate to edit-game route with correct params when onConfirm is called', () => {
        const mockSetItem = spyOn(sessionStorage, 'setItem');
        component.onConfirm();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['edit-game', 'create']);
        expect(mockSetItem).toHaveBeenCalledWith(
            CREATE_GAME_PARAMS,
            JSON.stringify({
                mode: component.selectedMode,
                size: component.selectedSize,
            }),
        );
    });
});
