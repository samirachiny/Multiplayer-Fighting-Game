/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EndGamePageComponent } from './end-game-page.component';
import { Router, ActivatedRoute } from '@angular/router';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { WsEventServer } from '@common/enums/web-socket-event';
import { UrlPath } from '@app/enums/url-path';
import { PartyStatistic } from '@common/interfaces/party-statistics';

describe('EndGamePageComponent', () => {
    let component: EndGamePageComponent;
    let fixture: ComponentFixture<EndGamePageComponent>;

    const routerMock = {
        navigate: jasmine.createSpy('navigate'),
    };

    const socketClientServiceMock = {
        send: jasmine.createSpy('send').and.callFake((event, callback) => {
            if (callback) {
                callback(null);
            }
        }),
        on: jasmine.createSpy('on').and.callFake((event, callback) => {}),
    };

    const navigationCheckServiceMock = {
        isNotFromGame: false,
    };

    const activatedRouteMock = {};

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EndGamePageComponent],
            providers: [
                { provide: Router, useValue: routerMock },
                { provide: SocketClientService, useValue: socketClientServiceMock },
                { provide: NavigationCheckService, useValue: navigationCheckServiceMock },
                { provide: ActivatedRoute, useValue: activatedRouteMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EndGamePageComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        routerMock.navigate.calls.reset();
        socketClientServiceMock.send.calls.reset();
        socketClientServiceMock.on.calls.reset();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call send with DeleteParty and navigate to the home page', () => {
        component.navigateToHome();

        expect(socketClientServiceMock.send).toHaveBeenCalledWith(WsEventServer.DeleteParty);
        expect(routerMock.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });

    it('should call getPartyStatistics during initialization', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn(component as any, 'getPartyStatistics');
        component.ngOnInit();
        expect(component['getPartyStatistics']).toHaveBeenCalled();
    });

    it('should load party statistics and update isDataLoaded', () => {
        const mockPartyStatistic: PartyStatistic = {
            winner: 'Player1',
            totalDuration: '15:30',
            totalRounds: 20,
            flagHoldersCount: 3,
            visitedTilesPercentage: 85,
            manipulatedDoorsPercentage: 60,
            displayPlayerStatistics: [
                {
                    playerName: 'Player1',
                    numberOfFights: 3,
                    numberOfEscapes: 1,
                    numberOfWins: 2,
                    numberOfDefeats: 1,
                    totalHealthLost: 50,
                    totalDamageDealt: 120,
                    numberOfObjectsCollected: 5,
                    percentageOfMapTilesVisited: 75,
                },
            ],
        };

        socketClientServiceMock.send.and.callFake((event, callback) => {
            if (callback) {
                callback(mockPartyStatistic);
            }
        });

        component['getPartyStatistics']();

        expect(socketClientServiceMock.send).toHaveBeenCalledWith(WsEventServer.GetPartyStatistics, jasmine.any(Function));
        expect(component.partyStatistic).toEqual(mockPartyStatistic);
        expect(component.isDataLoaded).toBe(false);
    });

    it('should redirect to the home page if isNotFromGame is true', () => {
        navigationCheckServiceMock.isNotFromGame = true;

        fixture = TestBed.createComponent(EndGamePageComponent);
        component = fixture.componentInstance;

        expect(routerMock.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });
});
