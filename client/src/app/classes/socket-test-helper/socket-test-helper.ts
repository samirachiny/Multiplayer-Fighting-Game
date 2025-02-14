type CallbackSignature = (params: unknown) => unknown;

export class SocketTestHelper {
    private callbacks = new Map<string, CallbackSignature[]>();

    on(event: string, callback: CallbackSignature): void {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }

        this.callbacks.get(event)?.push(callback);
    }

    // Le type function doit etre utiliser dans ce cas car d'autres types serait trop specifiques
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    emit(event: string, ...params: any): void {
        return;
    }

    disconnect(): void {
        return;
    }

    peerSideEmit(event: string, params?: unknown) {
        if (!this.callbacks.has(event)) {
            return;
        }
        const callbacks = this.callbacks.get(event);
        if (!callbacks) {
            return;
        }
        for (const callback of callbacks) {
            callback(params);
        }
    }
}
