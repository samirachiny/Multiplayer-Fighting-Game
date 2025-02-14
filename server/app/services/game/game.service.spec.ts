/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { GameService } from '@app/services/game/game.service';
import { DataBaseService } from '@app/services/database/database.service';
import { GameValidationService } from '@app/services/game-validation/game-validation.service';
import { Game } from '@common/interfaces/game';
import { InsertOneResult, UpdateResult, DeleteResult, Collection, FindCursor, ObjectId } from 'mongodb';
import { ValidationResponse } from '@common/interfaces/response-infos';
import { ValidationGameError } from '@common/enums/validation-game-error';
import { GameMapSize, GameMode } from '@common/enums/game-infos';
import { ValidationFeedback } from '@common/interfaces/validation-feedback';
import { MapValidator } from '@app/services/map-validator/map-validator.service';

describe('GameService', () => {
    let gameService: GameService;
    let dbServiceStub: sinon.SinonStubbedInstance<DataBaseService>;
    let validationServiceStub: sinon.SinonStubbedInstance<GameValidationService>;
    let collectionStub: sinon.SinonStubbedInstance<Collection>;

    const validGame: Game = {
        gid: 'valid-gid',
        name: 'Valid Game',
        mode: 'Classic',
        mapSize: 0,
        description: 'A valid game description',
        creationDate: new Date(),
        lastEditDate: new Date(),
        imageBase64: '',
        gameMap: [],
        isVisible: true,
    };

    const invalidGame: Game = {
        gid: '2',
        name: '    ',
        mode: GameMode.Classic,
        mapSize: GameMapSize.Small,
        description: '     ',
        creationDate: new Date(),
        lastEditDate: new Date(),
        imageBase64: '',
        gameMap: [],
        isVisible: true,
    };

    const validationFeedbackNoErrors: ValidationFeedback = {
        errors: [],
        mapFeedback: {
            mapStatus: true,
            blockedSection: [],
            invalidDoors: [],
            excessTiles: 0,
            areItemsPlaced: true,
        },
    };

    const validationFeedbackWithErrorsWithInput: ValidationFeedback = {
        errors: [ValidationGameError.MissingName, ValidationGameError.MissingDescription],
        mapFeedback: {
            mapStatus: true,
            blockedSection: [],
            invalidDoors: [],
            excessTiles: 0,
            areItemsPlaced: false,
        },
    };

    const validationFeedbackWithErrorsWithMap: ValidationFeedback = {
        errors: [ValidationGameError.NotEnoughWalkableTile, ValidationGameError.DoorNotValid, ValidationGameError.MapNotAllConnected],
        mapFeedback: {
            mapStatus: false,
            blockedSection: [
                { x: 0, y: 0 },
                { x: 0, y: 1 },
            ],
            invalidDoors: [{ x: 0, y: 0 }],
            excessTiles: 50,
            areItemsPlaced: false,
        },
    };

    beforeEach(() => {
        dbServiceStub = sinon.createStubInstance(DataBaseService);
        validationServiceStub = sinon.createStubInstance(GameValidationService);
        collectionStub = sinon.createStubInstance(Collection);
        dbServiceStub.getCollection.returns(collectionStub as unknown as Collection);

        gameService = new GameService(new DataBaseService(), new GameValidationService(new MapValidator()));
        gameService['bdService'] = dbServiceStub as unknown as DataBaseService;
        gameService['validationService'] = validationServiceStub as unknown as GameValidationService;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getGames', () => {
        it('should retrieve and sort games correctly', async () => {
            const games: Game[] = [
                {
                    gid: '2',
                    name: 'Game 2',
                    mode: 'Classic',
                    mapSize: 10,
                    description: 'Description 2',
                    creationDate: new Date('2024-09-26T18:38:41.734Z'),
                    lastEditDate: new Date('2024-09-26T05:46:30.808Z'),
                    imageBase64: '',
                    gameMap: [],
                    isVisible: true,
                },
                {
                    gid: '1',
                    name: 'Game 1',
                    mode: 'Flag',
                    mapSize: 15,
                    description: 'Description 1',
                    creationDate: new Date('2024-09-25T18:38:41.734Z'),
                    lastEditDate: new Date('2024-09-25T05:46:30.808Z'),
                    imageBase64: '',
                    gameMap: [],
                    isVisible: true,
                },
            ];

            collectionStub.find.returns({
                toArray: sinon.stub().resolves(games),
            } as unknown as FindCursor);

            const result = await gameService.getGames();
            expect(result[0].gid).to.equal('1');
            expect(result[1].gid).to.equal('2');
        });

        it('should throw an error if retrieving games fails', async () => {
            collectionStub.find.throws(new Error('MongoDB Error'));
            try {
                await gameService.getGames();
                throw new Error('The test should have failed');
            } catch (error) {
                expect(error.message).to.equal('Echec recuperation des jeux');
            }
        });
    });

    describe('getGameById', () => {
        it('should return a specific game by its GID', async () => {
            collectionStub.findOne.resolves(validGame);
            const result = await gameService.getGameById('valid-gid');
            expect(result).to.deep.equal(validGame);
            expect(collectionStub.findOne.calledOnceWithExactly({ gid: 'valid-gid' }, { projection: { _id: 0, imageBase64: 0 } })).to.equal(true);
        });

        it('should return null if no game matches the GID', async () => {
            collectionStub.findOne.resolves(null);
            const result = await gameService.getGameById('nonexistent-gid');
            expect(result).to.equal(null);
            expect(collectionStub.findOne.calledOnceWithExactly({ gid: 'nonexistent-gid' }, { projection: { _id: 0, imageBase64: 0 } })).to.equal(
                true,
            );
        });
    });

    describe('deleteGame', () => {
        it('should delete an existing game by its GID', async () => {
            const deleteResult: DeleteResult = { deletedCount: 1, acknowledged: true };
            collectionStub.deleteOne.resolves(deleteResult);

            const result = await gameService.deleteGame('valid-gid');
            expect(result).to.deep.equal(deleteResult);
        });

        it('should delete nothing if game not exist', async () => {
            const deleteResult: DeleteResult = { deletedCount: 0, acknowledged: false };
            collectionStub.deleteOne.resolves(deleteResult);

            const result = await gameService.deleteGame('valid-gid');
            expect(result).to.deep.equal(deleteResult);
            expect(result.deletedCount).to.equal(0);
        });

        it('should throw an error if deletion fails', async () => {
            collectionStub.deleteOne.rejects(new Error('Erreur MongoDB'));

            try {
                await gameService.deleteGame('invalid-gid');
                expect.fail("L'erreur n'a pas été lancée");
            } catch (error) {
                expect(error.message).to.include('Erreur MongoDB');
            }
        });
    });

    describe('updateGame', () => {
        it('should successfully update an existing game', async () => {
            const updateResult: UpdateResult = { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
            sinon.stub(gameService as any, 'checkValidation').resolves({ errors: [] } as ValidationFeedback);
            collectionStub.updateOne.resolves(updateResult);
            collectionStub.findOne.resolves(validGame);
            const result: ValidationResponse<Game> = await gameService.updateGame(validGame, 'valid-gid');

            expect(result.resource).to.deep.equal(validGame);
            expect(result.feedbacks).to.equal(undefined);
            expect(collectionStub.updateOne.calledOnce).to.equal(true);
        });

        it('should return validation errors if the updated game is invalid', async () => {
            const validationFeedbackWithErrors: ValidationFeedback = {
                errors: [ValidationGameError.MissingName],
                mapFeedback: { mapStatus: true, blockedSection: [], invalidDoors: [], excessTiles: 0, areItemsPlaced: false },
            };

            sinon.stub(gameService as any, 'checkValidation').resolves(validationFeedbackWithErrors);
            collectionStub.findOne.resolves(validGame);
            const result: ValidationResponse<Game> = await gameService.updateGame(invalidGame, 'invalid-gid');

            expect(result.resource).to.equal(null);
            expect(result.feedbacks.errors).to.deep.equal([ValidationGameError.MissingName]);
            expect(collectionStub.updateOne.notCalled).to.equal(true);
        });

        it('should add a new game if the game does not exist when updating', async () => {
            collectionStub.findOne.resolves(null);
            const addGameStub: sinon.SinonStub = sinon.stub(gameService, 'addGame');
            addGameStub.resolves({ resource: validGame } as ValidationResponse<Game>);
            const result = await gameService.updateGame(validGame, 'invalid-gid');

            expect(addGameStub.calledOnce).to.equal(true);
            expect(result.resource).to.deep.equal(validGame);
        });

        it('should throw an error if the update fails', async () => {
            collectionStub.findOne.resolves(validGame);
            const updateResult: UpdateResult = { acknowledged: false, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null };

            sinon.stub(gameService as any, 'checkValidation').resolves({ errors: [] } as ValidationFeedback);
            collectionStub.updateOne.resolves(updateResult);

            try {
                await gameService.updateGame(validGame, 'valid-gid');
                expect.fail('La fonction aurait dû lancer une erreur');
            } catch (error) {
                expect(error.message).to.include('Échec de la mise à jour du jeu dans la base de données');
            }
        });

        it('should throw an error in case of an unexpected failure', async () => {
            collectionStub.findOne.resolves(validGame);
            collectionStub.updateOne.rejects(new Error('errer mongoDB'));
            try {
                await gameService.updateGame(validGame, 'valid-gid');
                expect.fail("L'erreur n'a pas été lancée");
            } catch (error) {
                expect(error.message).to.include('Echec modification du jeu');
            }
        });
    });

    describe('addGame', () => {
        it('should successfully add a new game', async () => {
            const insertResult: InsertOneResult = { acknowledged: true, insertedId: validGame.gid as unknown as ObjectId };
            validationServiceStub.validate.resolves(validationFeedbackNoErrors);
            collectionStub.insertOne.resolves(insertResult);
            const response: ValidationResponse<Game> = await gameService.addGame(validGame);
            expect(collectionStub.insertOne.calledOnce).to.equal(true);
            expect(collectionStub.insertOne.calledOnceWithExactly(validGame)).to.equal(true);
            expect(response.resource).to.deep.equal(validGame);
            expect(response.feedbacks).to.equal(undefined);
        });

        it('should return validation errors if the game is invalid despite the valid map', async () => {
            validationServiceStub.validate.resolves(validationFeedbackWithErrorsWithInput);
            const response: ValidationResponse<Game> = await gameService.addGame(invalidGame);
            expect(response.feedbacks.errors).to.deep.equal(validationFeedbackWithErrorsWithInput.errors);
            expect(response.feedbacks.mapFeedback.mapStatus).to.equal(true);
            expect(response.resource).to.equal(null);
        });

        it('should return validation errors if the game map is not valid', async () => {
            validationServiceStub.validate.resolves(validationFeedbackWithErrorsWithMap);
            const response: ValidationResponse<Game> = await gameService.addGame(invalidGame);
            expect(response.feedbacks.errors).to.deep.equal(validationFeedbackWithErrorsWithMap.errors);
            expect(response.resource).to.equal(null);
            expect(response.feedbacks.mapFeedback.mapStatus).to.equal(false);
        });

        it('should throw an error if the insertion is not acknowledged (acknowledged = false)', async () => {
            validationServiceStub.validate.resolves(validationFeedbackNoErrors);
            const insertResult: InsertOneResult = { acknowledged: false, insertedId: null as unknown as ObjectId };
            collectionStub.insertOne.resolves(insertResult);
            try {
                await gameService.addGame(validGame);
                expect.fail('La fonction aurait dû lancer une erreur');
            } catch (error) {
                expect(error.message).to.include("Échec de l'ajout du jeu dans la base de données");
            }
            expect(collectionStub.insertOne.calledOnce).to.equal(true);
        });

        it('should throw an error in case of an unexpected issue', async () => {
            validationServiceStub.validate.resolves(validationFeedbackNoErrors);
            const errorMessage = 'Erreur inattendue';
            collectionStub.insertOne.rejects(new Error(errorMessage));
            try {
                await gameService.addGame(validGame);
                expect.fail("L'erreur n'a pas été lancée");
            } catch (error) {
                expect(error.message).to.include("Échec de l'ajout du jeu");
            }
        });

        it('should throw an error if the insert fails in mongo db', async () => {
            collectionStub.insertOne.rejects(new Error('Erreur MongoDB'));

            try {
                await gameService.addGame(validGame);
                expect.fail("L'erreur n'a pas été lancée");
            } catch (error) {
                expect(error.message).to.include("Échec de l'ajout du jeu ");
            }
        });
    });

    describe('toggleGameVisibility', () => {
        it('should toggle the game visibility', async () => {
            const gameWithVisible = { ...validGame, isVisible: true };
            collectionStub.findOne.resolves(gameWithVisible);
            const updateResult: UpdateResult = { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
            collectionStub.updateOne.resolves(updateResult);

            const result = await gameService.toggleGameVisibility('valid-gid');
            expect(result.acknowledged).to.equal(true);
            expect(collectionStub.updateOne.calledOnceWithExactly({ gid: 'valid-gid' }, { $set: { isVisible: false } })).to.equal(true);
        });

        it('should throw an error if the game is not found for visibility toggle', async () => {
            collectionStub.findOne.resolves(null);

            try {
                await gameService.toggleGameVisibility('invalid-gid');
                expect.fail('Echec mise a jour visibilite du jeu');
            } catch (error) {
                expect(error.message).to.include('Echec mise a jour visibilite du jeu');
            }
        });

        it('should throw an error if any problem occurs', async () => {
            collectionStub.findOne.rejects(new Error('Echec mise a jour visibilite du jeu'));
            try {
                await gameService.toggleGameVisibility('invalid-gid');
                expect.fail('Echec mise a jour visibilite du jeu');
            } catch (error) {
                expect(error.message).to.include('Echec mise a jour visibilite du jeu');
            }
        });
    });

    describe('trimInputGameData', () => {
        it('should trim spaces in strings', () => {
            const gameWithSpaces = {
                ...validGame,
                name: '   Game with spaces   ',
                description: '   Description with spaces   ',
            };
            const trimmedGame = gameService['trimInputGameData'](gameWithSpaces);
            expect(trimmedGame.name).to.equal('Game with spaces');
            expect(trimmedGame.description).to.equal('Description with spaces');
        });
    });

    describe('prepareInsert', () => {
        it('should generate a GID and initialize dates for a new game', () => {
            const gameToInsert: Game = {
                ...validGame,
                gid: '',
                creationDate: null as unknown as Date,
                lastEditDate: null as unknown as Date,
            };
            const preparedGame = gameService['prepareInsert'](gameToInsert);

            expect(preparedGame.gid).to.be.a('string');
            expect(preparedGame.gid.length).to.not.equal(0);
            expect(preparedGame.creationDate).to.instanceof(Date);
            expect(preparedGame.lastEditDate).to.instanceof(Date);
        });
    });

    describe('sortGamesList', () => {
        it('should sort games by creation date', () => {
            const game1 = { ...validGame, creationDate: new Date('2022-01-01') };
            const game2 = { ...validGame, creationDate: new Date('2022-02-01') };
            const game3 = { ...validGame, creationDate: new Date('2022-03-01') };

            const unsortedGames = [game3, game1, game2];
            const sortedGames = gameService['sortGamesList'](unsortedGames);

            expect(sortedGames[0].creationDate).to.deep.equal(game1.creationDate);
            expect(sortedGames[1].creationDate).to.deep.equal(game2.creationDate);
            expect(sortedGames[2].creationDate).to.deep.equal(game3.creationDate);
        });
    });

    describe('getUpdateParameter', () => {
        it('should return validation parameters with a valid old name', async () => {
            const oldGame: Game = {
                gid: '1',
                name: 'Old Game',
                mode: 'Classic',
                mapSize: 15,
                description: 'Old description',
                creationDate: new Date(),
                lastEditDate: new Date(),
                imageBase64: '',
                gameMap: [],
                isVisible: true,
            };

            collectionStub.findOne.resolves(oldGame);
            const game: Game = { ...oldGame, name: 'Updated Game' };
            const result = await gameService['getUpdateParameter'](game, '1');

            expect(result.record.name).to.equal('Updated Game');
            expect(result.oldName).to.equal('Old Game');
            expect(result.create).to.equal(false);
        });

        it('should return validation parameters even if the previous game is not found', async () => {
            collectionStub.findOne.resolves(null);

            const game: Game = {
                gid: '2',
                name: 'New Game',
                mode: 'Flag',
                mapSize: 10,
                description: 'Description',
                creationDate: new Date(),
                lastEditDate: new Date(),
                imageBase64: '',
                gameMap: [],
                isVisible: true,
            };

            const result = await gameService['getUpdateParameter'](game, '2');

            expect(result.record.name).to.equal('New Game');
            expect(result.oldName).to.equal(undefined);
            expect(result.create).to.equal(false);
        });
    });

    describe('checkValidation', () => {
        const game: Game = {
            gid: '1',
            name: 'New Game',
            mode: 'Classic',
            mapSize: 10,
            description: 'Description',
            creationDate: new Date(),
            lastEditDate: new Date(),
            imageBase64: '',
            gameMap: [],
            isVisible: true,
        };

        it('should validate a new game', async () => {
            const validationFeedback: ValidationFeedback = {
                errors: [],
                mapFeedback: {
                    mapStatus: true,
                    blockedSection: [],
                    invalidDoors: [],
                    excessTiles: 0,
                    areItemsPlaced: false,
                },
            };
            validationServiceStub.validate.resolves(validationFeedback);

            const result = await gameService['checkValidation'](game, true);

            expect(validationServiceStub.validate.calledOnceWithExactly({ record: game, create: true }, collectionStub)).to.equal(true);
            expect(result.errors).to.deep.equal([]);
        });

        it('should validate an existing game', async () => {
            const oldGame: Game = { ...game, name: 'Old Game' };
            collectionStub.findOne.resolves(oldGame);

            const validationFeedback: ValidationFeedback = {
                errors: [],
                mapFeedback: {
                    mapStatus: true,
                    blockedSection: [],
                    invalidDoors: [],
                    excessTiles: 0,
                    areItemsPlaced: false,
                },
            };
            validationServiceStub.validate.resolves(validationFeedback);

            const result = await gameService['checkValidation'](game, false, '1');

            const expectedParam = { record: game, create: false, oldName: 'Old Game' };
            expect(validationServiceStub.validate.calledOnceWithExactly(expectedParam, collectionStub)).to.equal(true);
            expect(result.errors).to.deep.equal([]);
        });
    });

    describe('updateGameInDatabase', () => {
        it('should return the updated game if the update is successful', async () => {
            const updateResult: UpdateResult = { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
            collectionStub.updateOne.resolves(updateResult);

            const result = await gameService['updateGameInDatabase'](validGame, validGame.gid);
            expect(result.resource).to.deep.equal(validGame);
            expect(collectionStub.updateOne.calledOnceWithExactly({ gid: validGame.gid }, sinon.match.object)).to.equal(true);
        });

        it('should throw an error if the update is not acknowledged (acknowledged = false)', async () => {
            const updateResult: UpdateResult = { acknowledged: false, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null };
            collectionStub.updateOne.resolves(updateResult);

            try {
                await gameService['updateGameInDatabase'](validGame, validGame.gid);
                expect.fail('La fonction aurait dû lancer une erreur');
            } catch (error) {
                expect(error.message).to.equal('Échec de la mise à jour du jeu dans la base de données');
            }
            expect(collectionStub.updateOne.calledOnceWithExactly({ gid: validGame.gid }, sinon.match.object)).to.equal(true);
        });
    });
});
