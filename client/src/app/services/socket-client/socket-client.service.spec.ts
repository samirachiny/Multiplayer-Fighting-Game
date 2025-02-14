/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Socket } from 'socket.io-client';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';

describe('SocketClientService', () => {
    let service: SocketClientService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(SocketClientService);
        service['socket'] = new SocketTestHelper() as unknown as Socket;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('connect', () => {
        it('should set the socket property', () => {
            service.connect();
            expect(service['socket']).toBeDefined();
        });
    });

    it('should disconnect', () => {
        const spy = spyOn(service['socket'], 'disconnect');
        service.disconnect();
        expect(spy).toHaveBeenCalled();
    });

    it('should isSocketAlive return true if the socket is still connected', () => {
        service['socket'].connected = true;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeTruthy();
    });

    it('should isSocketAlive return false if the socket is no longer connected', () => {
        service['socket'].connected = false;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeFalsy();
    });

    it('should isSocketAlive return false if the socket is not defined', () => {
        (service['socket'] as unknown) = undefined;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeFalsy();
    });

    it('should call socket.on with an event', () => {
        const event = WsEventClient.RollDice;
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const action = () => {};
        const spy = spyOn(service['socket'], 'on');
        service.on(event, action);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event, action);
    });

    it('should call emit with data when using send', () => {
        const event = WsEventServer.DeleteParty;
        const data = 42;
        const spy = spyOn(service['socket'], 'emit');
        service.send(event, data);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event, data);
    });

    it('should call emit without data when using send if data is undefined', () => {
        const event = WsEventServer.DeleteParty;
        const data = undefined;
        const spy = spyOn(service['socket'], 'emit');
        service.send(event, data);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event);
    });
});
