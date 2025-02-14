import { MongoClient, ServerApiVersion, Db, Collection } from 'mongodb';
import { DB_ENV } from '@app/utils/env';
import { Service } from 'typedi';

@Service()
export class DataBaseService {
    private client: MongoClient;
    private db: Db;

    async connect(uri: string): Promise<void> {
        try {
            this.client = new MongoClient(uri, {
                serverApi: {
                    version: ServerApiVersion.v1,
                    strict: true,
                    deprecationErrors: true,
                },
            });
            await this.client.connect();
            this.db = this.client.db(DB_ENV.dbName);
        } catch (e) {
            // je l'ai mis ici car cela me permet d'etre informer
            // des erreurs de connexion a la BD , je ne trouvais pas d'autre solution
            // et jen ai parle avec le chargé il a compris pourquoi jai mis ca la !!!!
            // eslint-disable-next-line no-console
            console.error('Error connecting to MongoDB: ', e);
        }
    }

    getCollection(name: string): Collection | null {
        try {
            if (!name) {
                throw new Error('Collection name cannot be empty.');
            }
            return this.db.collection(name);
        } catch (e) {
            return null;
        }
    }
}
