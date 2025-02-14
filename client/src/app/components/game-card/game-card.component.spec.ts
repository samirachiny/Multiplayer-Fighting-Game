/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameCardComponent } from './game-card.component';
import { GameMode, GameMapSize } from '@common/enums/game-infos';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Game } from '@common/interfaces/game';
import { ExportGameService } from '@app/services/export-game/export-game.service';

export class MatDialogMock {
    open() {
        return {
            title: 'Confirmation de suppresion',
            body: 'Voulez-vous vraiment supprimer le jeu: Test Game',
            onAgreed: () => of({}),
        };
    }
}

describe('GameCardComponent', () => {
    let component: GameCardComponent;
    let fixture: ComponentFixture<GameCardComponent>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockExportGame: jasmine.SpyObj<ExportGameService>;

    const mockGame: Game = {
        gid: '1',
        name: 'Test Game',
        mode: GameMode.Flag,
        mapSize: GameMapSize.Medium,
        description: 'Test description',
        imageBase64: 'testewerervefvrev',
        isVisible: true,
        creationDate: new Date('2023-01-01T00:00:00Z'),
        lastEditDate: new Date('2023-02-01T00:00:00Z'),
        gameMap: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9],
        ],
    };

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockExportGame = jasmine.createSpyObj('ExportGameService', ['exportGame']);
        await TestBed.configureTestingModule({
            imports: [GameCardComponent],
            providers: [
                { provide: Router, useValue: mockRouter },
                { provide: ExportGameService, useValue: mockExportGame },
                {
                    provide: MatDialog,
                    useClass: MatDialogMock,
                },
                DatePipe,
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: {
                                get: () => '1',
                            },
                        },
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCardComponent);
        component = fixture.componentInstance;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component.game = mockGame as any;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should open delete confirmation dialog when openDeleteConfirmation is called', () => {
        spyOn(component, 'onDeleteGame');
        const dialogSpy = spyOn(component['dialog'], 'open');
        component.openDeleteConfirmation();
        const data = {
            title: 'Confirmation de suppresion',
            body: 'Voulez-vous vraiment supprimer le jeu: Test Game',
            onAgreed: jasmine.any(Function),
        };
        expect(dialogSpy).toHaveBeenCalledWith(ConfirmationDialogComponent, {
            data,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onAgreedFn = (dialogSpy as any).calls.mostRecent().args[1].data.onAgreed;
        onAgreedFn();

        expect(component.onDeleteGame).toHaveBeenCalled();
    });

    it('should emit delectedGame event when onDeleteGame is called', () => {
        const spy = spyOn(component.deleteGame, 'emit');
        component.onDeleteGame();
        expect(spy).toHaveBeenCalledWith('1');
    });

    it('should emit hidedGame event when onHideGame is called', () => {
        const spy = spyOn(component.hideGame, 'emit');
        component.onHideGame();
        expect(spy).toHaveBeenCalledWith('1');
    });

    it('should emit selectedGame when onSelected is called', () => {
        const spy = spyOn(component.selectGame, 'emit');
        component.onSelected();
        expect(spy).toHaveBeenCalledWith('1');
    });
    it('should export game when onExportGame is called', () => {
        component.onExportGame();
        expect(mockExportGame.exportGame).toHaveBeenCalledWith(mockGame);
    });
});
