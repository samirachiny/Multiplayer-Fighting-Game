/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChronometerComponent } from './chronometer.component';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { AVERAGE_TIME_COLOR, END_TIME_COLOR, PLENTY_TIME_COLOR } from '@app/constants/consts';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';

describe('ChronometerComponent', () => {
    let component: ChronometerComponent;
    let fixture: ComponentFixture<ChronometerComponent>;
    let socketService: SocketClientServiceMock;
    let socketHelper: SocketTestHelper;

    beforeEach(async () => {
        socketService = new SocketClientServiceMock();
        socketHelper = socketService['socket'] as unknown as SocketTestHelper;
        await TestBed.configureTestingModule({
            imports: [ChronometerComponent],
            providers: [{ provide: SocketClientService, useValue: socketService }],
        }).compileComponents();
        spyOn(socketService, 'on').and.callThrough();
        spyOn(socketService, 'off');
        spyOn(socketService, 'send').and.callFake((eventName, callback: any) => {
            if (eventName === WsEventServer.GetFighters) {
                callback({
                    attacker: 'MockedAttacker',
                    defender: 'MockedDefender',
                });
            }
        });
        fixture = TestBed.createComponent(ChronometerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should update remainingTime when socket event is received', () => {
        socketHelper.peerSideEmit(WsEventClient.UpdateRemainTime, 120);
        expect(component.remainingTime).toBe(120);
    });
    it('should handle pause timer for fighting when socket event is received', () => {
        socketHelper.peerSideEmit(WsEventClient.TimerPauseForFight);
        expect(component.isFighting).toBeTrue();
    });
    it('should handle pause timer for choosing item when socket event is received', () => {
        socketHelper.peerSideEmit(WsEventClient.TimerPauseForChoosingItem);
        expect(component.isChoosingItem).toBeTrue();
    });
    it('should handle resume timer when socket event is received', () => {
        component.isFighting = false;
        socketHelper.peerSideEmit(WsEventClient.TimerResume);
        expect(component.isFighting).toBeFalse();
    });
    it('should unsubscribe to socket event on Destroy', () => {
        component.ngOnDestroy();
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.TimerPauseForChoosingItem);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.TimerPauseForFight);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.TimerResume);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.UpdateRemainTime);
    });
    it('should return correct color', () => {
        component.remainingTime = 25;
        expect(component.backgroundColor).toBe(PLENTY_TIME_COLOR);
        component.remainingTime = 13;
        expect(component.backgroundColor).toBe(AVERAGE_TIME_COLOR);
        component.remainingTime = 6;
        expect(component.backgroundColor).toBe(END_TIME_COLOR);
    });
});
