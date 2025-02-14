/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* /* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import * as sinon from 'sinon';
import { GameController } from './game.controller';
import { GameService } from '@app/services/game/game.service';
import { Express } from 'express';
import { ValidationGameError } from '@common/enums/validation-game-error';
import { HttpStatusCode } from '@common/enums/http-status-code';
import { GameMapSize, GameMode } from '@common/enums/game-infos';
import { expect } from 'chai';
import * as supertest from 'supertest';
import { Container } from 'typedi';
import { Application } from '@app/app';
import { Game } from '@common/interfaces/game';
import { ValidationResponse } from '@common/interfaces/response-infos';
import { DeleteResult } from 'mongodb';
import { Server } from 'http';
import { HttpException } from '@app/classes/http.exception/http.exception';

describe('GameController', () => {
    let gameServiceMock: sinon.SinonStubbedInstance<GameService>;
    let expressApp: Express;
    let gameController: GameController;
    let server: Server;

    beforeEach((done) => {
        gameServiceMock = sinon.createStubInstance(GameService);
        const app = Container.get(Application);
        gameController = new GameController(gameServiceMock as GameService);
        Object.defineProperty(app['gameController'], 'gameService', { value: gameServiceMock });
        expressApp = app.app as Express;
        expressApp.use('/api/game', gameController.router);
        server = app.app.listen(3000, () => {
            done();
        });
    });

    afterEach((done) => {
        sinon.restore();
        server.close(() => {
            done();
        });
    });

    describe('GameController - GET /', () => {
        it('Should return all games with data', async () => {
            const gamesWithData: Game[] = [
                {
                    gid: '1',
                    name: 'Game 1',
                    mode: GameMode.Flag,
                    mapSize: GameMapSize.Medium,
                    description: 'Description 1',
                    creationDate: new Date(),
                    lastEditDate: new Date(),
                    imageBase64: '',
                    gameMap: [],
                    isVisible: true,
                },
                {
                    gid: '2',
                    name: 'Game 2',
                    mode: GameMode.Classic,
                    mapSize: GameMapSize.Small,
                    description: 'Description 2',
                    creationDate: new Date(),
                    lastEditDate: new Date(),
                    imageBase64: '',
                    gameMap: [],
                    isVisible: true,
                },
            ];
            const gamesWithDataFormatted = gamesWithData.map((game) => ({
                ...game,
                creationDate: game.creationDate.toISOString(),
                lastEditDate: game.lastEditDate.toISOString(),
            }));

            gameServiceMock.getGames.resolves(gamesWithData);
            const res = await supertest(expressApp).get('/api/game');
            expect(res.status).to.equal(HttpStatusCode.Success);
            const resFormatted = res.body.map((game: Game) => ({
                ...game,
                creationDate: new Date(game.creationDate).toISOString(),
                lastEditDate: new Date(game.lastEditDate).toISOString(),
            }));

            expect(resFormatted).to.deep.equal(gamesWithDataFormatted);
        });

        it('Should return a 500 error if the retrieval fails', async () => {
            gameServiceMock.getGames.rejects(new Error('Erreur serveur'));
            const res = await supertest(expressApp).get('/api/game');

            expect(res.status).to.equal(HttpStatusCode.InternalServerError);
            expect(res.body).to.have.property('title', 'Erreur à la récupération');
            expect(res.body.body).to.include('Impossible de récupérer les jeux');
        });
    });

    describe('GameController - POST /', () => {
        it('Should create a new game.', async () => {
            const newGame: Game = {
                gid: '2',
                name: 'Game 2',
                mode: GameMode.Classic,
                mapSize: GameMapSize.Small,
                description: 'Description 2',
                creationDate: new Date(),
                lastEditDate: new Date(),
                imageBase64: '',
                gameMap: [],
                isVisible: true,
            };

            const formattedResult: unknown = {
                resource: {
                    ...newGame,
                    creationDate: newGame.creationDate.toISOString(),
                    lastEditDate: newGame.lastEditDate.toISOString(),
                },
            };
            const result: ValidationResponse<Game> = { resource: newGame };
            gameServiceMock.addGame.resolves(result);

            const res = await supertest(expressApp).post('/api/game').send(newGame);
            expect(res.status).to.equal(HttpStatusCode.Created);

            const resFormatted = {
                ...res.body,
                resource: {
                    ...res.body.resource,
                    creationDate: new Date(res.body.resource.creationDate).toISOString(),
                    lastEditDate: new Date(res.body.resource.lastEditDate).toISOString(),
                },
            };
            expect(resFormatted).to.deep.equal(formattedResult);
        });

        it('Should return a 400 error if the request body is empty.', async () => {
            const res = await supertest(expressApp).post('/api/game').send({});
            expect(res.status).to.equal(HttpStatusCode.BadRequest);
        });

        it('Should return a 400 error if the game is invalid.', async () => {
            const invalidGame: Game = {
                gid: '2',
                name: '    ',
                mode: GameMode.Classic,
                mapSize: GameMapSize.Small,
                description: '     ',
                creationDate: new Date(),
                lastEditDate: new Date(),
                imageBase64: '',
                gameMap: [
                    [10, 0, 10, 10, 10, 30, 18, 15, 10],
                    [10, 0, 0, 10, 10, 12, 10, 10, 10],
                    [10, 0, 2, 2, 10, 30, 0, 10, 10],
                    [10, 0, 10, 0, 10, 10, 10, 10, 10],
                    [10, 0, 10, 0, 10, 30, 30, 10, 10],
                    [18, 0, 0, 0, 10, 30, 30, 10, 10],
                    [10, 0, 0, 0, 10, 30, 30, 10, 10],
                    [10, 0, 10, 10, 0, 30, 30, 30, 10],
                    [10, 0, 10, 10, 50, 30, 30, 30, 10],
                    [10, 10, 10, 10, 10, 30, 10, 10, 10],
                ],
                isVisible: true,
            };

            const result: ValidationResponse<Game> = {
                resource: null,
                feedbacks: {
                    errors: [ValidationGameError.MissingName, ValidationGameError.MissingDescription, ValidationGameError.DoorNotValid],
                    mapFeedback: {
                        mapStatus: false,
                        blockedSection: [],
                        invalidDoors: [{ x: 1, y: 1 }],
                        excessTiles: 0,
                        areItemsPlaced: true,
                    },
                },
            };
            gameServiceMock.addGame.resolves(result);
            const res = await supertest(expressApp).post('/api/game').send(invalidGame);
            expect(res.status).to.equal(HttpStatusCode.BadRequest);
            expect(res.body.feedbacks.errors.length).to.equal(3);
            expect(res.body.resource).to.equal(null);
            expect(res.body.feedbacks.mapFeedback.mapStatus).to.equal(false);
        });

        it('Should return a 500 error if the creation fails with an error', async () => {
            gameServiceMock.addGame.rejects(new Error('Erreur serveur'));
            const res = await supertest(expressApp).post('/api/game').send({ name: 'Super Game' });

            expect(res.status).to.equal(HttpStatusCode.InternalServerError);
            expect(res.body).to.have.property('title', 'Erreur à la création');
            expect(res.body.body).to.include('Impossible de créer le jeu');
        });

        it('Should return a 500 error if the creation fails with an undefined result', async () => {
            gameServiceMock.addGame.returns(null);

            const res = await supertest(expressApp).post('/api/game').send({ name: 'Super Game' });

            expect(res.status).to.equal(HttpStatusCode.InternalServerError);
            expect(res.body).to.deep.equal({});
        });
    });

    describe('GameController - GET /:id', () => {
        it('Should return the game if a game is found with the given ID.', async () => {
            const game: Game = {
                gid: '1',
                name: 'Game 1',
                mode: GameMode.Classic,
                mapSize: GameMapSize.Medium,
                description: 'Description 1',
                creationDate: new Date(),
                lastEditDate: new Date(),
                imageBase64: '',
                gameMap: [],
                isVisible: true,
            };

            const formattedGame = {
                ...game,
                creationDate: new Date(game.creationDate).toISOString(),
                lastEditDate: new Date(game.lastEditDate).toISOString(),
            };

            gameServiceMock.getGameById.resolves(game);

            const res = await supertest(expressApp).get('/api/game/1');
            const resFormatted = {
                ...res.body,
                creationDate: new Date(res.body.creationDate).toISOString(),
                lastEditDate: new Date(res.body.lastEditDate).toISOString(),
            };
            expect(res.status).to.equal(HttpStatusCode.Success);
            expect(resFormatted).to.deep.equal(formattedGame);
        });

        it('Should return 404 if the game with the given ID is not found', async () => {
            gameServiceMock.getGameById.resolves(null);
            const res = await supertest(expressApp).get('/api/game/1');
            expect(res.status).to.equal(HttpStatusCode.NotFound);
        });

        it('Should return a 500 error in case of an internal error during retrieval', async () => {
            gameServiceMock.getGameById.rejects(new Error('Erreur de base de données'));
            const res = await supertest(expressApp).get('/api/game/1');

            expect(res.status).to.equal(HttpStatusCode.InternalServerError);
            expect(res.body).to.deep.equal({
                title: 'Erreur à la récupération',
                body: 'Impossible de récupérer le jeu: Error: Erreur de base de données',
            });
        });
    });

    describe('GameController - PATCH /:id', () => {
        it('Should successfully change the game visibility (200)', async () => {
            const id = '1';
            gameServiceMock.toggleGameVisibility.resolves({
                acknowledged: true,
                matchedCount: 1,
                modifiedCount: 1,
                upsertedCount: 0,
                upsertedId: null,
            });

            const res = await supertest(expressApp).patch(`/api/game/${id}`);

            expect(res.status).to.equal(HttpStatusCode.NotContent);
            expect(res.body).to.deep.equal({});
        });

        it('Should return 404 if the game ID is not found', async () => {
            const id = '2';
            gameServiceMock.toggleGameVisibility.resolves({
                acknowledged: true,
                matchedCount: 0,
                modifiedCount: 0,
                upsertedCount: 0,
                upsertedId: null,
            });
            const res = await supertest(expressApp).patch(`/api/game/${id}`);

            expect(res.status).to.equal(HttpStatusCode.NotFound);
            expect(res.body).to.deep.equal({});
        });

        it('Should return 500 in case of an internal issue', async () => {
            const id = '3';
            const errorMessage = 'Database connection failed';
            gameServiceMock.toggleGameVisibility.rejects(new Error(errorMessage));

            const res = await supertest(expressApp).patch(`/api/game/${id}`);

            expect(res.status).to.equal(HttpStatusCode.InternalServerError);
            expect(res.body).to.have.property('title', 'Erreur à la modification');
            expect(res.body).to.have.property('body', `Impossible de modifier la visibilité: Error: ${errorMessage}`);
        });
    });

    describe('GameController - PUT /:id', () => {
        it('Should update a game and return the result (200).', async () => {
            const updatedGame: Game = {
                gid: '1',
                name: 'Updated Game',
                mode: 'Classic',
                mapSize: 15,
                description: 'Updated Description',
                creationDate: new Date(),
                lastEditDate: new Date(),
                imageBase64: '',
                gameMap: [],
                isVisible: true,
            };
            const result: ValidationResponse<Game> = { resource: updatedGame };
            gameServiceMock.updateGame.resolves(result);

            const res = await supertest(expressApp).put('/api/game/1').send(updatedGame);
            const expectedResponse = {
                ...updatedGame,
                creationDate: updatedGame.creationDate.toISOString(),
                lastEditDate: updatedGame.lastEditDate.toISOString(),
            };

            expect(res.status).to.equal(HttpStatusCode.Success);
            expect(res.body.resource).to.deep.equal(expectedResponse);
        });

        it('Should return a 400 error if the game is invalid', async () => {
            const result: ValidationResponse<Game> = {
                resource: null,
                feedbacks: {
                    errors: [ValidationGameError.MapNotAllConnected, ValidationGameError.MissingName],
                    mapFeedback: { mapStatus: false, blockedSection: [], invalidDoors: [], excessTiles: 0, areItemsPlaced: false },
                },
            };
            gameServiceMock.updateGame.resolves(result);

            const res = await supertest(expressApp).put('/api/game/1').send(result);
            expect(res.status).to.equal(HttpStatusCode.BadRequest);
            expect(res.body).to.deep.equal(result);
        });

        it('Should return a 500 error in case of a server error (500).', async () => {
            gameServiceMock.updateGame.rejects(new Error('Erreur serveur'));

            const res = await supertest(expressApp).put('/api/game/1').send({});

            expect(res.status).to.equal(HttpStatusCode.InternalServerError);
            expect(res.body).to.have.property('title', 'Erreur à la modification');
            expect(res.body).to.have.property('body').that.includes('Impossible de modifier le jeu');
        });
    });

    describe('GameController - DELETE /:id', () => {
        it('Should delete a game and return 204 No Content if the deletion is successfu', async () => {
            gameServiceMock.deleteGame.resolves({ deletedCount: 1, acknowledged: true } as DeleteResult);
            const res = await supertest(expressApp).delete('/api/game/1').send();
            expect(res.status).to.equal(HttpStatusCode.NotContent);
            expect(gameServiceMock.deleteGame.calledOnceWithExactly('1')).to.equal(true);
        });

        it('Should return 404 Not Found if the game does not exist (deletedCount = 0)', async () => {
            try {
                gameServiceMock.deleteGame.resolves({ deletedCount: 0, acknowledged: true } as DeleteResult);
                const res = await supertest(expressApp).delete('/api/game/1').send();
                expect(res.status).to.equal(HttpStatusCode.NotFound);
                expect(gameServiceMock.deleteGame.calledOnceWithExactly('1')).to.equal(true);
            } catch (error) {
                expect(error).to.be.an.instanceOf(HttpException);
                expect(error.message).to.equal('Not Found');
            }
        });

        it('Should return 500 Internal Server Error if an error occurs', async () => {
            gameServiceMock.deleteGame.rejects(new Error('Erreur à la suppression'));
            const res = await supertest(expressApp).delete('/api/game/1').send();
            expect(res.status).to.equal(HttpStatusCode.InternalServerError);
            expect(res.body.title).to.equal('Erreur à la suppression');
            expect(res.body.body).to.include('Impossible de supprimer le jeu');
            expect(gameServiceMock.deleteGame.calledOnceWithExactly('1')).to.equal(true);
        });
    });
});
