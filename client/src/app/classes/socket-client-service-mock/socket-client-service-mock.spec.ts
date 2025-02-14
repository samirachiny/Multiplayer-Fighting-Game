import { SocketClientServiceMock } from './socket-client-service-mock';

describe('SocketClientServiceMock', () => {
    it('should create an instance', () => {
        expect(new SocketClientServiceMock()).toBeTruthy();
    });
    it('should connect', () => {
        const service: SocketClientServiceMock = new SocketClientServiceMock();
        service.connect();
        expect(service['socket']).toBeDefined();
    });
});
