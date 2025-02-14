/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, fakeAsync, MetadataOverride, TestBed, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GameService } from '@app/services/game/game.service';
import { AdminPageComponent } from './admin-page.component';
import { GameMapSize, GameMode } from '@common/enums/game-infos';
import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CreateGameComponent } from '@app/components/create-game/create-game.component';
import { GameCardComponent } from '@app/components/game-card/game-card.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient } from '@common/enums/web-socket-event';
import { ActivatedRoute } from '@angular/router';
import { Game } from '@common/interfaces/game';

@Component({
    selector: 'app-game-card',
    standalone: true,
    template: '<div>Mock Game List Item</div>',
})
class MockGameCardComponent {
    @Input() game: Game;
}

@Component({
    selector: 'app-create-game',
    standalone: true,
    template: '<div>Mock Create Game</div>',
})
class MockCreateGameComponent {}

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let gameService: GameService;
    let dialogRef: jasmine.SpyObj<MatDialog>;
    let socketService: jasmine.SpyObj<SocketClientService>;
    const mockGames: Game[] = [
        {
            gid: '1',
            name: 'Test Game 1',
            mode: GameMode.Classic,
            mapSize: GameMapSize.Medium,
            description: 'Test description 1',
            imageBase64: 'test1erjncrniwepng',
            isVisible: true,
            lastEditDate: new Date('2023-01-01'),
            creationDate: new Date('2023-01-01'),
            gameMap: [],
        },
        {
            gid: '2',
            name: 'Test Game 2',
            mode: GameMode.Flag,
            mapSize: GameMapSize.Large,
            description: 'Test description 2',
            imageBase64: 'test2dccweipng',
            isVisible: false,
            lastEditDate: new Date('2023-02-01'),
            creationDate: new Date('2023-01-01'),
            gameMap: [],
        },
    ];
    beforeEach(async () => {
        const overrideInfo: MetadataOverride<Component> = {
            add: { imports: [MockCreateGameComponent, MockGameCardComponent] },
            remove: { imports: [CreateGameComponent, GameCardComponent] },
        };
        socketService = jasmine.createSpyObj('SocketClientService', ['on', 'send']);
        TestBed.overrideComponent(AdminPageComponent, overrideInfo);
        await TestBed.configureTestingModule({
            imports: [AdminPageComponent],
            providers: [
                {
                    provide: GameService,
                    useValue: {
                        getGames: () => of(mockGames),
                        toggleGameVisibility: (gid: string) => of(gid),
                        deleteGame: (gid: string) => of(gid),
                        getSSE: () => of(mockGames),
                    },
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: {
                                get: () => null,
                            },
                        },
                    },
                },

                { provide: SocketClientService, useValue: socketService },
            ],
        }).compileComponents();

        dialogRef = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
        fixture = TestBed.createComponent(AdminPageComponent);
        component = fixture.componentInstance;
        gameService = TestBed.inject(GameService);
        component.games = mockGames;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set up socket listener in constructor', () => {
        expect(socketService.on).toHaveBeenCalledWith(WsEventClient.GameListUpdated, jasmine.any(Function));
    });

    it('should update games and call detectChanges when receiving socket event', () => {
        const updatedGames: Game[] = [...mockGames];
        updatedGames[0].isVisible = false;
        // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-empty-function
        let socketCallback: Function = () => {};

        socketService.on.and.callFake((event, callback) => {
            socketCallback = callback;
        });

        new AdminPageComponent(dialogRef, gameService, component['cdr'], socketService);

        spyOn(component['cdr'], 'detectChanges');

        socketCallback(updatedGames);

        expect(component.games).toEqual(updatedGames);
        expect(component['cdr'].detectChanges).toHaveBeenCalled();
    });

    it('should fetch games on initialization', () => {
        const getGames = spyOn(component as any, 'getGames');
        component.ngOnInit();
        expect(getGames).toHaveBeenCalled();
    });

    it('should delete a game', () => {
        const mockGameId = '1';
        const mockGamesResult: Game[] = [mockGames[1]];
        spyOn(gameService, 'deleteGame').and.returnValue(of(void 0));
        component.handleDeleteGame(mockGameId);

        expect(component.games).toEqual(mockGamesResult);
    });

    it('should delete a game call handleServerError on Error', () => {
        const mockGameId = '1';
        spyOn(gameService, 'deleteGame').and.returnValue(throwError(() => new Error('Error')));
        const handleServerError = spyOn<any>(component, 'handleServerError').and.returnValue(throwError(() => new Error('Error')));
        component.handleDeleteGame(mockGameId);

        expect(handleServerError).toHaveBeenCalled();
    });

    it('should toggle a game call handleServerError on Error', () => {
        const mockGameId = '1';
        spyOn(gameService, 'toggleGameVisibility').and.returnValue(throwError(() => new Error('Error')));
        const handleServerError = spyOn<any>(component, 'handleServerError').and.returnValue(throwError(() => new Error('Error')));
        component.handleHideGame(mockGameId);
        expect(handleServerError).toHaveBeenCalled();
    });
    it('should handle error when retrieving games fails', fakeAsync(() => {
        const errorResponse = { error: 'Server error' };
        spyOn(gameService, 'getGames').and.returnValue(throwError(() => errorResponse));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleServerError = spyOn<any>(component, 'handleServerError');

        component['getGames']();
        tick();

        expect(component.isLoading).toBeFalse();
        expect(handleServerError).toHaveBeenCalled();
    }));

    it('should hide a game', () => {
        const mockGameId = '1';
        const mockGamesExpected: Game[] = mockGames;
        mockGamesExpected[0].isVisible = false;

        spyOn(gameService, 'toggleGameVisibility').and.returnValue(of(void 0));

        component.handleHideGame(mockGameId);

        expect(component.games).toEqual(mockGames);
    });

    it('should load games on init', () => {
        spyOn(gameService, 'getGames').and.returnValue(of(mockGames));
        component['getGames']();
        expect(component.games).toEqual(mockGames);
        expect(component.isLoading).toBeFalse();
    });

    it('should toggleGameVisibility toggle game visibility correctly', () => {
        const updatedGames: Game[] = [...mockGames];
        updatedGames[0].isVisible = !updatedGames[0].isVisible;
        component['toggleGameVisibility']('1');
        expect(component.games).toEqual(updatedGames);
    });

    it('should handle server error', (done) => {
        setTimeout(() => {
            const spyModal = spyOn(dialogRef, 'open');
            (component as any).handleServerError(['Erreur 1', 'Erreur 2']);
            expect(spyModal).toHaveBeenCalled();
        });
        done();
    });
});
