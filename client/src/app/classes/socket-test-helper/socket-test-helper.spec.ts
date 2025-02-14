import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';

describe('SocketTestHelper', () => {
    let socketHelper: SocketTestHelper;

    beforeEach(() => {
        socketHelper = new SocketTestHelper();
    });

    it('should create an instance', () => {
        expect(new SocketTestHelper()).toBeTruthy();
    });
    it('should register callbacks for events', () => {
        const callback = jasmine.createSpy('callback');
        socketHelper.on('testEvent', callback);

        socketHelper.peerSideEmit('testEvent', { data: 'test' });

        expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle multiple callbacks for the same event', () => {
        const callback1 = jasmine.createSpy('callback1');
        const callback2 = jasmine.createSpy('callback2');

        socketHelper.on('testEvent', callback1);
        socketHelper.on('testEvent', callback2);

        socketHelper.peerSideEmit('testEvent', 'test data');

        expect(callback1).toHaveBeenCalledWith('test data');
        expect(callback2).toHaveBeenCalledWith('test data');
    });

    it('should not call callbacks for unregistered events', () => {
        const callback = jasmine.createSpy('callback');
        socketHelper.on('registeredEvent', callback);

        socketHelper.peerSideEmit('unregisteredEvent', 'test data');

        expect(callback).not.toHaveBeenCalled();
    });

    it('should handle peerSideEmit with no registered callbacks', () => {
        expect(() => {
            socketHelper.peerSideEmit('nonExistentEvent', 'test data');
        }).not.toThrow();
    });
    it('should handle peerSideEmit when callbacks array is null', () => {
        const callback = jasmine.createSpy('callback');
        socketHelper.on('testEvent', callback);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (socketHelper as any).callbacks.set('testEvent', null);

        expect(() => {
            socketHelper.peerSideEmit('testEvent', 'test data');
        }).not.toThrow();

        expect(callback).not.toHaveBeenCalled();
    });

    it('should have an emit method that does nothing', () => {
        expect(() => {
            socketHelper.emit('testEvent', 'test data');
        }).not.toThrow();
    });

    it('should have a disconnect method that does nothing', () => {
        expect(() => {
            socketHelper.disconnect();
        }).not.toThrow();
    });
});
