import { expect } from 'chai';
import * as sinon from 'sinon';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, Collection } from 'mongodb';
import { DataBaseService } from '@app/services/database/database.service';

describe('DataBaseService', () => {
    let mongoServer: MongoMemoryServer;
    let uri: string;
    let service: DataBaseService;

    before(async () => {
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
    });

    after(async () => {
        await mongoServer.stop();
    });

    beforeEach(() => {
        service = new DataBaseService();
    });

    afterEach(async () => {
        if (service['client']) {
            await service['client'].close();
        }
        sinon.restore();
    });

    describe('connect', () => {
        it('Should connect to the database successfully.', async () => {
            await service.connect(uri);
            expect(service['client']).to.be.instanceOf(MongoClient);
            expect(service['db']).to.be.instanceOf(Db);
        });

        it('Should handle connection errors.', async () => {
            const connectStub = sinon.stub(MongoClient.prototype, 'connect').rejects(new Error('Simulated connection error'));
            const consoleErrorStub = sinon.stub(console, 'error');

            try {
                await service.connect('mongodb://invalidhost:27017');
            } catch (e) {
                expect(consoleErrorStub.calledOnce).to.equal(true);
                expect(e.message).to.equal('Simulated connection error');
            } finally {
                consoleErrorStub.restore();
                connectStub.restore();
            }

            expect(service['client']).to.be.an.instanceof(MongoClient);
            expect(service['db']).to.equal(undefined);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        }).timeout(20000);
    });

    describe('getCollection', () => {
        beforeEach(async () => {
            await service.connect(uri);
        });

        it('Should return the collection if the name is valid.', () => {
            const collection = service.getCollection('validCollection');
            expect(collection).to.instanceOf(Collection);
        });

        it('Should return null if the name is empty', () => {
            const collection = service.getCollection('');
            expect(collection).to.equal(null);
        });

        it('Should handle errors and return null', () => {
            sinon.stub(service['db'], 'collection').throws(new Error('Erreur simulée'));
            const collection = service.getCollection('anyCollection');
            expect(collection).to.equal(null);
        });
    });
});
