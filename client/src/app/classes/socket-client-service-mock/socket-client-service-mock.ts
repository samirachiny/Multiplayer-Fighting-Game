import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { Socket } from 'socket.io-client';

export class SocketClientServiceMock extends SocketClientService {
    override connect() {
        this.socket = new SocketTestHelper() as unknown as Socket;
    }
}
