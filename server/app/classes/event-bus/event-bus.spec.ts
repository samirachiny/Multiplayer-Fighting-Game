import { expect } from 'chai';
import { EventBus } from '@app/classes/event-bus/event-bus';

describe('EventBus Singleton', () => {
    it('should return same instance', () => {
        const instance1 = EventBus.getInstance();
        const instance2 = EventBus.getInstance();
        expect(instance1).to.equal(instance2);
    });
});

describe('EventBus Functionality', () => {
    it('should delete listener with `off`', () => {
        const eventBus = EventBus.getInstance();
        const testEvent = 'removeListenerEvent';
        const listener = () => {
            // empty
        };

        eventBus.on(testEvent, listener);
        expect(eventBus.listeners(testEvent).length).to.equal(1);

        eventBus.off(testEvent, listener);
        expect(eventBus.listeners(testEvent).length).to.equal(0);
    });

    it('should return 0 listener for non existing event', () => {
        const eventBus = EventBus.getInstance();
        expect(eventBus.listeners('unknownEvent').length).to.equal(0);
    });
});
