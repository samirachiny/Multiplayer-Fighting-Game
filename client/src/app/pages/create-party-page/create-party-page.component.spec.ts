/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CreatePartyPageComponent } from './create-party-page.component';
import { GameService } from '@app/services/game/game.service';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { GameMode, GameMapSize } from '@common/enums/game-infos';
import { MessageDialogComponent } from '@app/components/message-dialog/message-dialog.component';
import { Component, Input } from '@angular/core';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { UrlPath } from '@app/enums/url-path';
import { MESSAGE_DIALOG } from '@app/constants/consts';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { Game } from '@common/interfaces/game';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';

const mockGames: Game[] = [
    {
        gid: '1',
        name: 'Game 1',
        mode: GameMode.Classic,
        mapSize: GameMapSize.Small,
        description: 'Test Game 1 description',
        creationDate: new Date(),
        lastEditDate: new Date(),
        imageBase64: 'mockImage1',
        isVisible: true,
        gameMap: [],
    },
    {
        gid: '2',
        name: 'Game 2',
        mode: GameMode.Flag,
        mapSize: GameMapSize.Large,
        description: 'Test Game 2 description',
        creationDate: new Date(),
        lastEditDate: new Date(),
        imageBase64: 'mockImage2',
        isVisible: false,
        gameMap: [],
    },
];
const activatedRouteMock = {
    snapshot: {
        paramMap: {
            // eslint-disable-next-line no-unused-vars
            get: (key: string) => null,
        },
    },
    params: of({}),
};

@Component({
    selector: 'app-header',
    template: '',
})
class MockHeaderComponent {}

@Component({
    selector: 'app-game-card',
    template: '',
})
class MockGameCardComponent {
    @Input() game: Game;
}
describe('CreatePartyPageComponent', () => {
    let component: CreatePartyPageComponent;
    let fixture: ComponentFixture<CreatePartyPageComponent>;
    let gameService: jasmine.SpyObj<GameService>;
    let socketService: SocketClientServiceMock;
    let socketHelper: SocketTestHelper;
    let navigationCheck: jasmine.SpyObj<NavigationCheckService>;

    beforeEach(async () => {
        const gameServiceSpy = jasmine.createSpyObj('GameService', ['getGames']);
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        socketService = new SocketClientServiceMock();
        socketHelper = socketService['socket'] as any as SocketTestHelper;
        navigationCheck = jasmine.createSpyObj('NavigationCheckService', ['isNotFromHome', 'setToCreateParty']);

        await TestBed.configureTestingModule({
            imports: [CreatePartyPageComponent],
            declarations: [MockHeaderComponent, MockGameCardComponent],
            providers: [
                { provide: GameService, useValue: gameServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: ActivatedRoute, useValue: activatedRouteMock },
                { provide: SocketClientService, useValue: socketService },
                { provide: NavigationCheckService, useValue: navigationCheck },
            ],
        }).compileComponents();
        spyOn(socketService, 'on').and.callThrough();
        fixture = TestBed.createComponent(CreatePartyPageComponent);
        component = fixture.componentInstance;
        gameService = TestBed.inject(GameService) as jasmine.SpyObj<GameService>;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should leave party if not from home', () => {
        const spy = spyOn(socketService as any, 'send');
        (navigationCheck as any).isNotFromHome.and.returnValue(true);
        fixture = TestBed.createComponent(CreatePartyPageComponent);
        component = fixture.componentInstance;
        expect(spy).toHaveBeenCalledWith(WsEventServer.LeaveParty);
    });
    it('should set up socket listener in constructor', () => {
        expect(socketService.on).toHaveBeenCalledWith(WsEventClient.GameListUpdated, jasmine.any(Function));
    });

    it('should getVisbleGames on ngOnInit', () => {
        const spy = spyOn<any>(component, 'getVisibleGames');
        component.ngOnInit();
        expect(spy).toHaveBeenCalled();
    });

    it('should update games and call detectChanges when receiving socket event', () => {
        const updatedGames: Game[] = [...mockGames];
        updatedGames[1].isVisible = true;
        socketHelper.peerSideEmit(WsEventClient.GameListUpdated, updatedGames);
        expect(component.visibleGames).toEqual(updatedGames);
    });

    it('should fetch and set visible games on success', fakeAsync(() => {
        gameService.getGames.and.returnValue(of(mockGames));
        component.getVisibleGames();
        expect(gameService.getGames).toHaveBeenCalled();
        expect(component.visibleGames).toEqual(mockGames.filter((game) => game.isVisible));
        tick(100);
        expect(component.isLoading).toBeFalse();
    }));

    it('should handle error when getVisibleGames fails', fakeAsync(() => {
        const errorResponse = { error: ['Error message'] };
        gameService.getGames.and.returnValue(throwError(() => errorResponse));
        spyOn<any>(component, 'handleServerError');
        component.getVisibleGames();
        expect(component.isLoading).toBeFalse();
        expect(component['handleServerError']).toHaveBeenCalledWith(errorResponse.error);
        tick(100);
        expect(component.isLoading).toBeFalse();
    }));
    it('should send validation request to server on game selected', () => {
        const game = mockGames[0];
        const callbackSpy = spyOn(component as any, 'callbackCreateParty');
        // eslint-disable-next-line @typescript-eslint/ban-types
        const spy = spyOn(socketService, 'send').and.callFake((event: string, id: any, cb: Function) => {
            expect(event).toEqual(WsEventServer.CreateParty);
            expect(id).toEqual(game.gid);
            cb(true, [id]);
        });
        component.handleSelectionGame(game.gid);
        expect(spy).toHaveBeenCalled();
        expect(callbackSpy).toHaveBeenCalledWith(true, [game.gid]);
    });

    it('should set gameId in sessionStorage and navigate to create-character page on successful party creation', () => {
        const game = mockGames[0];
        const sessionStorageSpy = spyOn(sessionStorage, 'setItem');
        spyOn(socketService, 'send').and.callThrough();
        component['callbackCreateParty'](true, [game.gid]);
        expect(sessionStorageSpy).toHaveBeenCalledWith('gameId', game.gid);
        expect(component['router'].navigate).toHaveBeenCalledWith([UrlPath.CreateCharacter]);
    });

    it('should handle error on  party creation failure', () => {
        const errorResponse = ['Error message'];
        spyOn<any>(component, 'handleServerError');
        component['callbackCreateParty'](false, errorResponse);
        expect(component['handleServerError']).toHaveBeenCalledWith(errorResponse);
    });

    it('should open dialog with correct data in handleServerError', () => {
        const errorMessages = ['Error message'];
        spyOn(component['dialogRef'], 'open').and.callThrough();
        component['handleServerError'](errorMessages);
        expect(component['dialogRef'].open).toHaveBeenCalledWith(MessageDialogComponent, {
            data: {
                ...MESSAGE_DIALOG.gameSelectedNotAvailable,
                optionals: errorMessages,
            },
        });
    });

    it('should have isLoading as true initially', () => {
        expect(component.isLoading).toBeTrue();
    });

    it('should set visibleGames to empty array if no games are visible', fakeAsync(() => {
        const games: Game[] = [
            {
                ...mockGames[0],
                isVisible: false,
            },
        ];
        gameService.getGames.and.returnValue(of(games));
        component.getVisibleGames();
        expect(component.visibleGames).toEqual([]);
        tick(100);
        expect(component.isLoading).toBeFalse();
    }));
});
