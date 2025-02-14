import { EventEmitter } from 'events';

export class EventBus extends EventEmitter {
    private static instance: EventBus;
    private constructor() {
        super();
    }
    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
}
