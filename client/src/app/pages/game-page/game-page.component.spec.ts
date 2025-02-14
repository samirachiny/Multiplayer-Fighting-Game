/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GamePageComponent } from './game-page.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { UrlPath } from '@app/enums/url-path';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { Game } from '@common/interfaces/game';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-data';
import { END_GAME_DELAY, MAX_COLOR_VALUE } from '@app/constants/consts';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';
import { ItemType } from '@common/enums/item';
import { ItemsChoiceDialogComponent } from '@app/components/items-choice-dialog/items-choice-dialog.component';

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;
    let socketHelper: SocketTestHelper;
    let socketService: SocketClientServiceMock;
    let gameMapService: jasmine.SpyObj<GameMapService>;
    let router: jasmine.SpyObj<Router>;
    let matDialog: jasmine.SpyObj<MatDialog>;
    let navigationCheck: jasmine.SpyObj<NavigationCheckService>;
    const mockPlayer = { pid: '1', name: 'Player 1' } as any as PlayerInfos;
    let mockMatSnackBar: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        socketService = new SocketClientServiceMock();
        socketHelper = socketService['socket'] as any as SocketTestHelper;
        gameMapService = jasmine.createSpyObj('GameMapService', [
            'initialize',
            'removePlayer',
            'toggleDoor',
            'movePlayer',
            'showIceBreak',
            'replacePlayer',
            'removeHightLightFormTile',
            'setPlayers',
            'resetPath',
            'hightLightTiles',
        ]);
        router = jasmine.createSpyObj('Router', ['navigate']);
        matDialog = jasmine.createSpyObj('MatDialog', ['open']);
        navigationCheck = jasmine.createSpyObj('NavigationCheckService', ['isNotFromWaiting', 'setToGame']);
        mockMatSnackBar = jasmine.createSpyObj('MatSnackBar', ['openFromComponent']);
        spyOn(socketService, 'on').and.callThrough();
        spyOn(socketService, 'send').and.callThrough();
        spyOn(socketService, 'off');
        await TestBed.configureTestingModule({
            imports: [GamePageComponent],
            providers: [
                { provide: SocketClientService, useValue: socketService },
                { provide: GameMapService, useValue: gameMapService },
                { provide: Router, useValue: router },
                { provide: MatDialog, useValue: matDialog },
                { provide: NavigationCheckService, useValue: navigationCheck },
                { provide: MatSnackBar, useValue: mockMatSnackBar },
            ],
        }).compileComponents();
        (navigationCheck as any).isNotFromWaiting = false;
        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should navigate to home page if not from waiting page on create', () => {
        (navigationCheck as any).isNotFromWaiting = true;
        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
        expect(router.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });

    it('should initialize party and map game on GET_PARTY', () => {
        const partyInfos = { game: { mapSize: 0, gameMap: [], players: [] }, players: [] };
        spyOn(socketHelper, 'emit').and.callFake((event, callback) => {
            if (event === WsEventServer.GetPartyInfos) {
                callback(partyInfos);
            }
        });

        component['initializeParty']();
        expect(component.isPartyInitialized).toBeTrue();
        expect(component.isBeginning).toBeTrue();
        expect(component.game).toEqual(partyInfos.game as any as Game);
        expect(component.players).toEqual(partyInfos.players);
    });

    it('should initialize party and map game on GET_PARTY', () => {
        const partyInfos = { game: { mapSize: 0, gameMap: [], players: [] }, players: [{ isCurrentPlayer: true, name: 'Player 1' } as PlayerInfos] };
        spyOn(socketHelper, 'emit').and.callFake((event, callback) => {
            if (event === WsEventServer.GetPartyInfos) {
                callback(partyInfos);
            }
        });

        component['initializeParty']();
        expect(component.isPartyInitialized).toBeTrue();
        expect(component.isBeginning).toBeTrue();
        expect(component.game).toEqual(partyInfos.game as any as Game);
        expect(component.players).toEqual(partyInfos.players);
    });

    it('should handle COUNTDOWN_START event', () => {
        socketHelper.peerSideEmit(WsEventClient.CountdownStart);
        expect(component.isCountDownStarting).toBeTrue();
    });

    it('should handle COUNTDOWN_END event', () => {
        spyOn(socketHelper, 'emit').and.callFake((event, callback) => {
            callback(mockPlayer);
        });
        component.isBeginning = true;
        component.isCountDownStarting = true;

        socketHelper.peerSideEmit(WsEventClient.CountdownEnd);

        expect(component.isBeginning).toBeFalse();
        expect(component.isCountDownStarting).toBeFalse();
        expect(component.player).toEqual(mockPlayer);
    });

    it('should handle ACTION_FINISHED event', () => {
        spyOn(socketHelper, 'emit').and.callFake((event, callback) => {
            callback(mockPlayer);
        });
        socketHelper.peerSideEmit(WsEventClient.ActionFinished);
        expect(component.player).toEqual(mockPlayer);
    });
    it('should not handle ACTION_FINISHED event if no player', () => {
        spyOn(socketHelper, 'emit').and.callFake((event, callback) => {
            callback(undefined);
        });
        socketHelper.peerSideEmit(WsEventClient.ActionFinished);
        expect(component.player).not.toEqual(mockPlayer);
    });

    it('should handle DOOR_TOGGLED event', () => {
        spyOn(socketHelper, 'emit').and.callFake((event, callback) => {
            callback(mockPlayer);
        });
        socketHelper.peerSideEmit(WsEventClient.DoorToggled);
        expect(component.player).toEqual(mockPlayer);
    });

    it('should handle COUNTDOWN_UPDATE event', () => {
        const timeBeforeStart = 10;
        socketHelper.peerSideEmit(WsEventClient.CountdownUpdate, timeBeforeStart);
        expect(component.timeBeforeStart).toEqual(timeBeforeStart);
    });

    it('should handle PLAYER_LIST_UPDATED event', () => {
        const players: PlayerInfos[] = [{ pid: '1', name: 'Player 1' } as any];
        socketHelper.peerSideEmit(WsEventClient.PlayerListUpdated, players);
        expect(component.players).toEqual(players);
    });

    it('should handle ALL_PLAYER_GIVE_UP event', () => {
        socketHelper.peerSideEmit(WsEventClient.AllPlayersGaveUp);
        expect(mockMatSnackBar.openFromComponent).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });

    it('should handle FIGHT_INIT event', () => {
        const data = { attacker: { pid: '1' }, defender: { pid: '2' } } as any;
        component.player = { pid: '1' } as PlayerInfos;

        socketHelper.peerSideEmit(WsEventClient.FightInit, data);
        expect(component.isFighting).toBeTrue();
    });
    it('should handle FIGHT_INIT event if not in fight', () => {
        const data = { attacker: { pid: '3' }, defender: { pid: '2' } } as any;
        component.player = { pid: '1' } as PlayerInfos;

        socketHelper.peerSideEmit(WsEventClient.FightInit, data);
        expect(component.isFighting).toBeFalse();
    });

    it('should handle FIGHT_TERMINATED event', () => {
        socketHelper.peerSideEmit(WsEventClient.FightTerminated);
        expect(component.isFighting).toBeFalse();
    });
    it('should handle GAME_END event', (done) => {
        spyOn(component as any, 'openInformationDialog');
        socketHelper.peerSideEmit(WsEventClient.GameEnd, 'gagnant');
        setTimeout(() => {
            expect(router.navigate).toHaveBeenCalledWith([UrlPath.EndGame]);
            expect(component.isFighting).toBeFalse();
            done();
        }, END_GAME_DELAY);
    });
    it('should handle PARTY_MODE_TOGGLED event', (done) => {
        const handlePartyModeToggledSpy = spyOn(component as any, 'handlePartyModeToggled');
        socketHelper.peerSideEmit(WsEventClient.PartyModeToggled, true);
        setTimeout(() => {
            expect(handlePartyModeToggledSpy).toHaveBeenCalledWith(true);
            done();
        }, END_GAME_DELAY);
    });
    it('should handle CHOOSE_ITEM_TO_REMOVE event', (done) => {
        const player = { items: [ItemType.BoostDefense, ItemType.BoostAttack, ItemType.Flag] } as any as PlayerInfos;
        spyOn(socketHelper, 'emit').and.callFake((event, cb) => {
            cb(player);
        });
        socketHelper.peerSideEmit(WsEventClient.ChooseItemToRemove);
        setTimeout(() => {
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GetPlayer, jasmine.any(Function));
            expect(component['matDialog'].open).toHaveBeenCalledWith(ItemsChoiceDialogComponent, { disableClose: true, data: player.items });
            expect(component.player).toEqual(player);
            done();
        }, END_GAME_DELAY);
    });
    it('should not handle CHOOSE_ITEM_TO_REMOVE event if player is undefined', (done) => {
        spyOn(socketHelper, 'emit').and.callFake((event, cb) => {
            cb(undefined);
        });
        socketHelper.peerSideEmit(WsEventClient.ChooseItemToRemove);
        setTimeout(() => {
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GetPlayer, jasmine.any(Function));
            done();
        }, END_GAME_DELAY);
    });
    it('should open confirmation dialog on give up', () => {
        component.onGiveUp();
        const onAgreedFn = (component['matDialog'].open as any).calls.mostRecent().args[1].data.onAgreed;
        onAgreedFn();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GiveUp);
        expect(router.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });

    it('should end round if current player', () => {
        component.player = { isCurrentPlayer: true } as PlayerInfos;
        component.onEndRound();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.EndRound);
    });

    it('should toggle map interaction', () => {
        component.onEnabledInteractionWithMap();
        expect(gameMapService.isMapInteractionEnabled).toBeTrue();
    });

    it('should toggle tab', () => {
        component.toggleTab(true);
        expect(component.isShowMessages).toBeTrue();
    });

    it('should open message dialog', () => {
        component['openInformationDialog']('test');
        expect(mockMatSnackBar.openFromComponent).toHaveBeenCalled();
    });

    it('should open confirmation dialog', () => {
        const dialogData = { title: 'Confirmation', body: 'Are you sure?' } as ConfirmationDialogData;
        component['openConfirmationDialog'](dialogData);
        expect(matDialog.open).toHaveBeenCalledWith(ConfirmationDialogComponent, { data: dialogData });
    });

    describe('onEnabledInteractionWithMap', () => {
        const mockCoords = [{ x: 0, y: 0 }];
        beforeEach(() => {
            // eslint-disable-next-line @typescript-eslint/ban-types, no-unused-vars
            spyOn(socketHelper as any, 'emit').and.callFake((event: string, callback: Function) => {
                if (event === WsEventServer.GetAvailablePositions) callback(mockCoords);
                if (event === WsEventServer.GetInteractivePositions) callback(mockCoords);
            });
        });
        it('should hightlight available positions if isMapInteractionEnabled is false', () => {
            gameMapService['isMapInteractionEnabled'] = true;
            component['onEnabledInteractionWithMap']();
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GetAvailablePositions, jasmine.any(Function));
            expect(gameMapService.hightLightTiles).toHaveBeenCalledWith(mockCoords, { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
        });

        it('should hightlight interactable positions if isMapInteractionEnabled is true', () => {
            gameMapService['isMapInteractionEnabled'] = false;
            component['onEnabledInteractionWithMap']();
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GetInteractivePositions, jasmine.any(Function));
            expect(gameMapService.hightLightTiles).toHaveBeenCalledWith(mockCoords, { red: 0, green: 0, blue: MAX_COLOR_VALUE });
        });
    });

    describe('togglePartyMode', () => {
        it('should not send message if player is not defined', () => {
            component.player = null as any;
            component.togglePartyMode();
            expect(socketService.send).not.toHaveBeenCalledWith(WsEventServer.TogglePartyDebugMode);
        });

        it('should not send message if player is not organizer', () => {
            component.player = { isOrganizer: false } as PlayerInfos;
            component.togglePartyMode();
            expect(socketService.send).not.toHaveBeenCalledWith(WsEventServer.TogglePartyDebugMode);
        });

        it('should send message if player is organizer', () => {
            component.player = { isOrganizer: true } as PlayerInfos;
            component.togglePartyMode();
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.TogglePartyDebugMode);
        });
    });

    describe('handlePartyModeToggled', () => {
        it('should display "Mode debogage activé" when isDebugMode is true', () => {
            const openInformationDialogSpy = spyOn(component as any, 'openInformationDialog');
            component['handlePartyModeToggled'](true);
            expect(openInformationDialogSpy).toHaveBeenCalledWith('Mode debogage activé');
        });

        it('should display "Mode debogage desactivé" when isDebugMode is false', () => {
            const openInformationDialogSpy = spyOn(component as any, 'openInformationDialog');
            component['handlePartyModeToggled'](false);
            expect(openInformationDialogSpy).toHaveBeenCalledWith('Mode debogage desactivé');
        });
    });
});
