import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogTypeEvent } from '@common/enums/log-type';
import { GameLogComponent } from './game-log.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { GameLogs } from '@common/interfaces/game-logs';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { By } from '@angular/platform-browser';
import { LOG_IMAGES } from '@app/constants/image';

describe('GameLogComponent', () => {
    let component: GameLogComponent;
    let fixture: ComponentFixture<GameLogComponent>;
    let socketClientServiceSpy: jasmine.SpyObj<SocketClientService>;
    const mockLogs: GameLogs[] = [
        { time: new Date(), message: 'Player 1 joined the game', type: LogTypeEvent.BeginParty, playerIds: ['Player-Id-test', 'Player 2 Id'] },
        { time: new Date(), message: 'Player 2 joined the game', type: LogTypeEvent.BeginParty, playerIds: ['Player 1 Id', 'Player 2 Id'] },
    ];

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('SocketClientService', ['send', 'on', 'off']);
        await TestBed.configureTestingModule({
            // declarations: [GameLogComponent],
            imports: [DatePipe, FormsModule],
            providers: [{ provide: SocketClientService, useValue: spy }],
        }).compileComponents();

        fixture = TestBed.createComponent(GameLogComponent);
        component = fixture.componentInstance;
        socketClientServiceSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        component.playerId = 'Player-Id-test';

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should retrieve and filter game logs on initialization', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            socketClientServiceSpy.send.and.callFake((path: string, callback: any) => {
                if (path === WsEventServer.GetLogGames) {
                    callback(mockLogs);
                }
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            socketClientServiceSpy.on.and.callFake((path: string, callback: (log: any) => void) => {
                if (path === WsEventClient.NewPartyLog) {
                    callback({
                        time: new Date(),
                        message: 'New player joined',
                        type: LogTypeEvent.BeginParty,
                        playerId: ['Player 3'],
                    } as GameLogs);
                }
            });
            component.ngOnInit();
            fixture.detectChanges();

            expect(socketClientServiceSpy.send).toHaveBeenCalledWith(WsEventServer.GetLogGames, jasmine.any(Function));
            expect(socketClientServiceSpy.on).toHaveBeenCalledWith(WsEventClient.NewPartyLog, jasmine.any(Function));
            expect(component['logs']).toEqual([...mockLogs]);
            expect(component['logs'].length).toBeGreaterThan(0);
        });

        it('should not filter logs if filterMine is false', () => {
            component['logs'] = mockLogs;
            component.filterMine = false;
            component.applyFilter();
            expect(component.filteredLogs).toEqual(mockLogs);
        });
    });

    describe('ngOnDestroy', () => {
        it('should remove socket listeners on component destruction', () => {
            component.ngOnDestroy();
            expect(socketClientServiceSpy.off).toHaveBeenCalledWith(WsEventClient.NewPartyLog);
        });
    });

    describe('applyFilter', () => {
        it('should filter logs correctly when filterMine is true', () => {
            component['logs'] = mockLogs;
            component.filterMine = true;
            component.applyFilter();
            expect(component.filteredLogs).toEqual([mockLogs[0]]);
        });

        it('should not filter logs when filterMine is false', () => {
            component['logs'] = mockLogs;
            component.filterMine = false;
            component.applyFilter();
            expect(component.filteredLogs).toEqual(mockLogs);
        });
    });

    describe('UI Tests', () => {
        it('should display logs based on filtered logs', () => {
            component['logs'] = mockLogs;
            component.filterMine = false;
            component.applyFilter();
            fixture.detectChanges();
            expect(component.filteredLogs).toEqual(mockLogs);
            const logElements = fixture.nativeElement.querySelectorAll('.log-message');
            expect(logElements.length).toBe(mockLogs.length);
        });

        it('should toogle filterMine and apply filter on button click', () => {
            component['logs'] = mockLogs;
            fixture.detectChanges();
            const filterBtn = fixture.debugElement.query(By.css('#mine'));
            filterBtn.triggerEventHandler('click', null);
            component.filterMine = true;
            component.applyFilter();
            fixture.detectChanges();
            expect(component.filterMine).toBe(true);
            expect(component.filteredLogs).toEqual([mockLogs[0]]);
            filterBtn.triggerEventHandler('click', null);
            component.filterMine = false;
            component.applyFilter();
            fixture.detectChanges();
            expect(component.filterMine).toBe(false);
            expect(component.filteredLogs).toEqual(mockLogs);
        });
    });

    it('getImage should return correct image', () => {
        const mockLog = {
            time: new Date(),
            message: 'New player joined',
            type: LogTypeEvent.BeginParty,
            playerId: ['Player 3'],
        };
        expect(component.getImage(mockLog)).toEqual(LOG_IMAGES[LogTypeEvent.BeginParty]);
    });
});
