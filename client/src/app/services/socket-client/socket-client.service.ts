import { Injectable } from '@angular/core';
import { SOCKET_TRANSPORT_NAME } from '@app/constants/consts';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    protected socket: Socket;

    constructor() {
        this.connect();
    }

    isSocketAlive() {
        return this.socket && this.socket.connected;
    }

    connect() {
        this.socket = io(environment.baseUrl, {
            transports: [SOCKET_TRANSPORT_NAME],
            upgrade: false,
        });
    }

    disconnect() {
        this.socket.disconnect();
    }

    on<T>(event: WsEventClient, action: (data: T) => void): void {
        this.socket.on(event, action);
    }

    off<T>(event: WsEventClient, action?: (data: T) => void): void {
        this.socket.off(event, action);
    }

    // Le type function doit etre utiliser dans ce cas car d'autres types serait trop specifiques
    // eslint-disable-next-line @typescript-eslint/ban-types
    send<T>(event: WsEventServer, data?: T, callback?: Function): void {
        this.socket.emit(event, ...[data, callback].filter((x) => x));
    }
}
