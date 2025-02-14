/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerCardComponent } from './player-card.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { ItemFactory } from '@app/classes/item-factory/item-factory';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';

describe('PlayerStatisticsComponent', () => {
    let component: PlayerCardComponent;
    let fixture: ComponentFixture<PlayerCardComponent>;
    let socketService: SocketClientServiceMock;
    let socketHelper: SocketTestHelper;

    beforeEach(async () => {
        socketService = new SocketClientServiceMock();
        socketHelper = socketService['socket'] as any as SocketTestHelper;

        spyOn(socketService, 'on').and.callThrough();
        spyOn(socketService, 'off');
        spyOn(socketService, 'send').and.callThrough();
        await TestBed.configureTestingModule({
            imports: [PlayerCardComponent],
            providers: [{ provide: SocketClientService, useValue: socketService }],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerCardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should update player when socket events are received', () => {
        const mockPlayer = { pid: '1', name: 'Player 1' };
        spyOn(component, 'getPlayer').and.callFake(() => {
            component.player = mockPlayer as any;
            component.isPlayerInitialized = true;
        });

        socketHelper.peerSideEmit(WsEventClient.PlayerMoving);
        expect(component.getPlayer).toHaveBeenCalled();
        expect(component.player).toEqual(mockPlayer as any);

        socketHelper.peerSideEmit(WsEventClient.PlayerEndMoving);
        expect(component.getPlayer).toHaveBeenCalled();

        socketHelper.peerSideEmit(WsEventClient.CountdownStart);
        expect(component.getPlayer).toHaveBeenCalled();

        socketHelper.peerSideEmit(WsEventClient.AvailableMoveUpdated);
        expect(component.getPlayer).toHaveBeenCalled();

        socketHelper.peerSideEmit(WsEventClient.DoorToggled);
        expect(component.getPlayer).toHaveBeenCalled();

        socketHelper.peerSideEmit(WsEventClient.FightTerminated);
        expect(component.getPlayer).toHaveBeenCalled();

        socketHelper.peerSideEmit(WsEventClient.UpdateItem);
        expect(component.getPlayer).toHaveBeenCalled();
    });

    it('should remove socket listeners on destroy', () => {
        component.ngOnDestroy();
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.PlayerMoving);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.PlayerEndMoving);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.CountdownStart);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.AvailableMoveUpdated);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.DoorToggled);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.FightTerminated);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.UpdateItem);
    });

    it('should get player and initialize correctly', () => {
        const mockPlayer = { pid: '1', name: 'Player 1', items: [1, 4, 7] };
        spyOn(ItemFactory, 'createItem');
        // eslint-disable-next-line @typescript-eslint/ban-types
        spyOn(socketHelper, 'emit').and.callFake((event: string, callback: Function) => {
            callback(mockPlayer);
        });
        component.getPlayer();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GetPlayer, jasmine.any(Function));
        expect(ItemFactory.createItem).toHaveBeenCalledTimes(3);
        expect(component.player).toEqual(mockPlayer as any);
        expect(component.isPlayerInitialized).toBeTrue();
    });
});
