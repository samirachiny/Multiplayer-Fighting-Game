/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WaitingPageComponent } from './waiting-page.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { WsEventServer, WsEventClient } from '@common/enums/web-socket-event';
import { Dice } from '@common/enums/dice';
import { Component } from '@angular/core';
import { MESSAGE_DIALOG } from '@app/constants/consts';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { UrlPath } from '@app/enums/url-path';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';
import { BotProfileChoiceDialogComponent } from '@app/components/bot-profile-choice-dialog/bot-profile-choice-dialog.component';
import { BOT_PROFILES_IMAGES } from '@app/constants/image';
const mockPlayers = [
    {
        pid: '1',
        name: 'Player 1',
        isOrganizer: true,
        character: {
            id: 1,
            name: '',
            imagePath: '',
            story: '',
        },
        speed: 0,
        attack: 0,
        defense: 0,
        life: 0,
        diceAssignment: {
            attack: Dice.D4,
            defense: Dice.D6,
        },
        wins: 0,
        isGiveUp: false,
        isCurrentPlayer: false,
        availableMoves: 0,
        remainingAction: 0,
        startPosition: null,
        currentPosition: null,
        previousPosition: null,
    },
    {
        pid: '2',
        name: 'Player 2',
        isOrganizer: false,
        character: {
            id: 2,
            name: '',
            imagePath: '',
            story: '',
        },
        speed: 0,
        attack: 0,
        defense: 0,
        life: 0,
        wins: 0,
        diceAssignment: {
            attack: Dice.D6,
            defense: Dice.D4,
        },
        isGiveUp: false,
        isCurrentPlayer: false,
        availableMoves: 0,
        remainingAction: 0,
        startPosition: null,
        currentPosition: null,
        previousPosition: null,
    },
] as any as PlayerInfos[];
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
    selector: 'app-chat',
    template: '',
})
class MockChatComponent {}

describe('WaitingPageComponent', () => {
    let component: WaitingPageComponent;
    let fixture: ComponentFixture<WaitingPageComponent>;
    let socketService: SocketClientServiceMock;
    let socketHelper: SocketTestHelper;
    let router: jasmine.SpyObj<Router>;
    let navigationCheck: jasmine.SpyObj<NavigationCheckService>;
    let mockMatSnackBar: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        socketService = new SocketClientServiceMock();
        socketHelper = socketService['socket'] as any as SocketTestHelper;
        router = jasmine.createSpyObj('Router', ['navigate']);
        navigationCheck = jasmine.createSpyObj('NavigationCheckService', ['isNotFromCreateCharacter', 'setToWaiting']);
        mockMatSnackBar = jasmine.createSpyObj('MatSnackBar', ['openFromComponent']);
        mockMatSnackBar.openFromComponent.and.returnValue({} as any);

        await TestBed.configureTestingModule({
            imports: [WaitingPageComponent],
            declarations: [MockHeaderComponent, MockChatComponent],
            providers: [
                { provide: SocketClientService, useValue: socketService },
                { provide: NavigationCheckService, useValue: navigationCheck },
                { provide: Router, useValue: router },
                { provide: ActivatedRoute, useValue: activatedRouteMock },
                { provide: MatSnackBar, useValue: mockMatSnackBar },
            ],
        }).compileComponents();
        (navigationCheck as any).isNotFromCreateCharacter = false;
        spyOn(socketService, 'on').and.callThrough();
        spyOn(socketService, 'off');
        spyOn(socketService, 'send').and.callThrough();
        fixture = TestBed.createComponent(WaitingPageComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should navigate to home if session is not valid on init', () => {
        (navigationCheck as any).isNotFromCreateCharacter = true;
        component.ngOnInit();
        expect(router.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });

    it('should set up socket listeners', () => {
        spyOn(component as any, 'configureSocketService');
        spyOn(component as any, 'setUpWaitingPageInfos');
        component.ngOnInit();
        expect(component['configureSocketService']).toHaveBeenCalled();
        expect(component['setUpWaitingPageInfos']).toHaveBeenCalled();
    });

    it('should remove socket listeners and router subscription on destroy', () => {
        spyOn(window, 'removeEventListener');
        component.ngOnDestroy();
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.AllPlayers);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.LeftParty);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.EjectPlayer);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.PartyEnd);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.PartyFull);
    });

    it('should return bot profile images', () => {
        const result = component.botImages;
        expect(result).toEqual(BOT_PROFILES_IMAGES);
    });

    it('should toggle lock party', () => {
        component.players = mockPlayers;
        component.maxPlayers = 3;
        spyOn(socketHelper, 'emit').and.callFake((event: string, callback: (isLocked: boolean) => void) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            callback(true);
        });
        component.onToggleLockParty();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.ToggleLockParty, jasmine.any(Function));
        expect(component.isLocked).toBeTrue();
    });
    it('should not toggle lock if party is full', () => {
        component.isLocked = true;
        component.players = mockPlayers;
        component.maxPlayers = 2;
        component.onToggleLockParty();
        expect(socketService.send).not.toHaveBeenCalled();
        expect(component.isLocked).toBeTrue();
    });

    it('should send an event to server when setUpWaitingPageInfos is called ', () => {
        spyOn(socketHelper, 'emit').and.callFake(
            (
                event: string,
                callback: (data: { players: PlayerInfos[]; player: PlayerInfos; accessCode: number; isLocked: boolean; maxPlayers: number }) => void,
            ) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                callback({ players: mockPlayers, player: mockPlayers[0], maxPlayers: 2, accessCode: 1, isLocked: false });
            },
        );
        component['setUpWaitingPageInfos']();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.SetUpParty, jasmine.any(Function));
        expect(component.players).toEqual(mockPlayers);
        expect(component.player).toEqual(mockPlayers[0]);
        expect(component.maxPlayers).toBe(2);
        expect(component.accessCode).toBe(1);
        expect(component.isLocked).toBeFalse();
    });
    it('should start game and navigate to game page', () => {
        component.isLocked = true;
        component.onStartGame();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.StartGame);
    });
    it('should start game and not navigate to game page if party not locked', () => {
        component.isLocked = false;
        component.onStartGame();
        expect(socketService.send).not.toHaveBeenCalled();
    });

    it('should open confirmation dialog and eject player on agreement', () => {
        spyOn(component as any, 'openConfirmationDialog').and.callFake((data: any) => {
            data.onAgreed();
            return { afterClosed: () => of(true) } as any;
        });
        component.onEjectPlayer('1');
        expect(component['openConfirmationDialog']).toHaveBeenCalled();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.EjectPlayer, '1');
    });

    it('should open confirmation dialog and leave party on agreement', () => {
        spyOn(component as any, 'openConfirmationDialog').and.callFake((data: any) => {
            data.onAgreed();
            return { afterClosed: () => of(true) } as any;
        });
        component.onLeaveParty();
        expect(component['openConfirmationDialog']).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });

    it('should configure socket service', () => {
        spyOn(component as any, 'openInformationDialog').and.callThrough();
        component['configureSocketService']();
        expect(socketService.on).toHaveBeenCalledWith(WsEventClient.LeftParty, jasmine.any(Function));
        expect(socketService.on).toHaveBeenCalledWith(WsEventClient.EjectPlayer, jasmine.any(Function));
        expect(socketService.on).toHaveBeenCalledWith(WsEventClient.PartyEnd, jasmine.any(Function));
        expect(socketService.on).toHaveBeenCalledWith(WsEventClient.AllPlayers, jasmine.any(Function));
        expect(socketService.on).toHaveBeenCalledWith(WsEventClient.PartyFull, jasmine.any(Function));
    });

    it('should react to left party event from server', () => {
        spyOn(component as any, 'openInformationDialog').and.callThrough();
        component['configureSocketService']();
        socketHelper.peerSideEmit(WsEventClient.LeftParty, 'Player 2');
        expect(component['openInformationDialog']).toHaveBeenCalledWith('Player 2' + MESSAGE_DIALOG.playerLeftParty.body);
    });

    it('should react to ejection of another player event from server', () => {
        spyOn(component as any, 'openInformationDialog').and.callThrough();
        component['configureSocketService']();
        component.player = mockPlayers[1];
        socketHelper.peerSideEmit(WsEventClient.EjectPlayer, 'Player 1');
        expect(component['openInformationDialog']).toHaveBeenCalledWith('Player 1' + MESSAGE_DIALOG.playerEjected.body);
    });
    it('should react to ejection of the player event from server', () => {
        spyOn(component as any, 'openInformationDialog').and.returnValue({ afterClosed: () => of(true) });
        component['configureSocketService']();
        component.player = mockPlayers[0];
        socketHelper.peerSideEmit(WsEventClient.EjectPlayer, component.player.name);
        expect(component['openInformationDialog']).toHaveBeenCalledWith(MESSAGE_DIALOG.youEjectedFromParty.body);
        expect(router.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });

    it('should react to end of party event from server', () => {
        spyOn(component as any, 'openInformationDialog').and.returnValue({ afterClosed: () => of(true) });
        component['configureSocketService']();
        socketHelper.peerSideEmit(WsEventClient.PartyEnd);
        expect(component['openInformationDialog']).toHaveBeenCalledWith(MESSAGE_DIALOG.partyCancelled.body);
        expect(router.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });
    it('should react to start game event from server', () => {
        component['configureSocketService']();
        socketHelper.peerSideEmit(WsEventClient.StartGame);
        expect(navigationCheck.setToWaiting).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith([UrlPath.Game]);
    });

    it('should react to all players update event from server', () => {
        const mockPlayersUpdated = [...mockPlayers, ...mockPlayers];
        component['configureSocketService']();
        socketHelper.peerSideEmit(WsEventClient.AllPlayers, mockPlayersUpdated);
        expect(component.players).toEqual(mockPlayersUpdated);
    });
    it('should react to party full update event from server', () => {
        component.isLocked = false;
        component['configureSocketService']();
        socketHelper.peerSideEmit(WsEventClient.PartyFull, true);
        expect(component.isLocked).toBeTrue();

        socketHelper.peerSideEmit(WsEventClient.PartyFull, false);
        expect(component.isLocked).toBeFalse();
    });
    it('should return true if player is organizer', () => {
        component.player = mockPlayers[0];
        expect(component.isOrganizer).toBeTrue();
    });

    it('should return false if player is not organizer', () => {
        component.player = mockPlayers[1];
        expect(component.isOrganizer).toBeFalse();
    });

    it('should return the number of players', () => {
        component.players = mockPlayers;
        expect(component.playersNumber).toBe(2);
    });
    it('should return 0 if players array is undefined', () => {
        component.players = undefined as any as PlayerInfos[];
        expect(component.playersNumber).toBeUndefined();
    });

    it('should open confirmation dialog when openConfirmationDialog is called', () => {
        const data = { title: 'title', body: 'body', onRefused: () => {}, onAgreed: () => {} };
        const spy = spyOn(component['matDialog'], 'open').and.callThrough();
        component['openConfirmationDialog'](data);
        expect(spy).toHaveBeenCalledWith(ConfirmationDialogComponent, { data });
    });
    it('should open virtual choose player when dialog when openChoiceBotProfile is called', () => {
        const spy = spyOn(component['matDialog'], 'open').and.callThrough();
        component['openChoiceBotProfile']();
        expect(spy).toHaveBeenCalledWith(BotProfileChoiceDialogComponent);
    });
});
