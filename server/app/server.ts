import { Application } from '@app/app';
import * as http from 'http';
import { AddressInfo } from 'net';
import { Service } from 'typedi';
import { DataBaseService } from '@app/services/database/database.service';
import { DB_ENV } from '@app/utils/env';
import { SocketManagerService } from '@app/services/socket-manager/socket-manager.service';
import { PORT_NUMBER_BASE } from '@app/utils/const';
@Service()
export class Server {
    private static readonly appPort: string | number | boolean = Server.normalizePort(process.env.PORT || '3000');

    private server: http.Server;

    constructor(
        private readonly application: Application,
        private socketManagerService: SocketManagerService,
        private dbService: DataBaseService,
    ) {}

    private static normalizePort(val: number | string): number | string | boolean {
        const port: number = typeof val === 'string' ? parseInt(val, PORT_NUMBER_BASE) : val;
        return isNaN(port) ? val : port >= 0 ? port : false;
    }
    init(): void {
        this.application.app.set('port', Server.appPort);
        this.server = http.createServer(this.application.app);

        this.socketManagerService.init(this.server);

        this.server.listen(Server.appPort);
        this.server.on('error', (error: NodeJS.ErrnoException) => this.onError(error));
        this.server.on('listening', () => this.onListening());

        this.dbService.connect(DB_ENV.dbUrl).then(() => {
            // je l'ai mis ici car cela me permet d'etre informer
            // des erreurs de connexion a la BD , je ne trouvais pas d'autre solution
            // et jen ai parle avec le charger il a compris pourquoi jai mis ca la !!!!
            // eslint-disable-next-line no-console
            console.log('Successfully connected to database');
        });
    }

    private onError(error: NodeJS.ErrnoException): void {
        if (error.syscall !== 'listen') {
            throw error;
        }
        const bind: string = typeof Server.appPort === 'string' ? 'Pipe ' + Server.appPort : 'Port ' + Server.appPort;
        switch (error.code) {
            case 'EACCES':
                // eslint-disable-next-line no-console
                console.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                // eslint-disable-next-line no-console
                console.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    /**
     * Se produit lorsque le serveur se met à écouter sur le port.
     */
    private onListening(): void {
        const addr = this.server.address() as AddressInfo;
        const bind: string = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
        // eslint-disable-next-line no-console
        console.log(`Listening on ${bind}`);
    }
}
