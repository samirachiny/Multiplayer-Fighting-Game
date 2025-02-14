/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListPlayerComponent } from './list-player.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient } from '@common/enums/web-socket-event';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';
import { BOT_PROFILES_IMAGES } from '@app/constants/image';

describe('ListPlayerComponent', () => {
    let component: ListPlayerComponent;
    let fixture: ComponentFixture<ListPlayerComponent>;
    let socketService: SocketClientServiceMock;
    let socketHelper: SocketTestHelper;

    beforeEach(async () => {
        socketService = new SocketClientServiceMock();
        socketHelper = socketService['socket'] as any as SocketTestHelper;
        await TestBed.configureTestingModule({
            imports: [ListPlayerComponent],
            providers: [{ provide: SocketClientService, useValue: socketService }],
        }).compileComponents();
        spyOn(socketService, 'off');
        spyOn(socketService, 'on').and.callThrough();
        spyOn(socketService, 'send').and.callThrough();

        fixture = TestBed.createComponent(ListPlayerComponent);
        component = fixture.componentInstance;
        component.players = [];
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return bot profile images', () => {
        const result = component.botImages;
        expect(result).toEqual(BOT_PROFILES_IMAGES);
    });

    it('should update players list when socket event is received', () => {
        const mockPlayers: PlayerInfos[] = [{ pid: '1', name: 'Player 1' } as any, { pid: '2', name: 'Player 2' } as any];
        component['configureSocketEvents']();
        socketHelper.peerSideEmit(WsEventClient.PlayerListUpdated, mockPlayers);
        expect(component.players).toEqual(mockPlayers);
    });
    it('should get all players list on create', () => {
        const mockPlayers: PlayerInfos[] = [{ pid: '1', name: 'Player 1' } as any, { pid: '2', name: 'Player 2' } as any];
        // eslint-disable-next-line @typescript-eslint/ban-types
        spyOn(socketHelper, 'emit').and.callFake((event: string, callback: Function) => callback(mockPlayers));
        component['initializePlayerList']();
        expect(component.players).toEqual(mockPlayers);
        expect(component.isLoading).toBeFalse();
    });

    it('should remove socket listener on destroy', () => {
        component.ngOnDestroy();
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.PlayerListUpdated);
    });
});
