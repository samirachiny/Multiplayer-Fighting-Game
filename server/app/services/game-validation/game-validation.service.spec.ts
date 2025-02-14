/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Collection } from 'mongodb';
import { GameValidationService } from '@app/services/game-validation/game-validation.service';
import { ValidationGameError } from '@common/enums/validation-game-error';
import { Game } from '@common/interfaces/game';
import { ValidationParameter } from '@app/interfaces/validation-parameter';
import { MapValidator } from '@app/services/map-validator/map-validator.service';
import { GameMapSize, GameMode } from '@common/enums/game-infos';
import { MapValidationIndicator } from '@common/interfaces/map-validation-indicator';
import { ITEM_COUNT_ERROR } from '@app/utils/const';

describe('GameValidationService', () => {
    let gameValidationService: GameValidationService;
    let collectionStub: sinon.SinonStubbedInstance<Collection>;

    const validGame: Game = {
        gid: 'valid-gid',
        name: 'Valid Game',
        description: 'A valid game description',
        mode: undefined,
        mapSize: 10,
        creationDate: undefined,
        lastEditDate: undefined,
        imageBase64: '',
        isVisible: false,
        gameMap: [],
    };
    const validationParamCreate: ValidationParameter = {
        record: validGame,
        create: true,
        oldName: undefined,
    };

    const invalidGameWithMap: Game = {
        gid: 'valid-gid',
        name: 'Valid Game',
        description: 'A valid game description',
        mode: undefined,
        mapSize: 10,
        creationDate: undefined,
        lastEditDate: undefined,
        imageBase64: '',
        isVisible: false,
        gameMap: [
            [10, 0, 10, 10, 10, 30, 18, 15, 10, 10],
            [10, 0, 0, 10, 10, 12, 10, 10, 10, 10],
            [10, 0, 2, 2, 10, 30, 0, 10, 10, 10],
            [10, 0, 10, 0, 10, 10, 10, 10, 10, 10],
            [10, 0, 10, 0, 10, 30, 30, 10, 10, 10],
            [18, 0, 0, 0, 10, 30, 30, 10, 10, 10],
            [10, 0, 0, 0, 10, 30, 30, 10, 10, 10],
            [10, 0, 10, 10, 0, 30, 30, 30, 10, 10],
            [0, 0, 10, 10, 50, 30, 30, 30, 10, 10],
            [10, 10, 10, 10, 10, 30, 10, 10, 10, 10],
        ],
    };

    beforeEach(() => {
        gameValidationService = new GameValidationService(new MapValidator());
        collectionStub = sinon.createStubInstance(Collection);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('validateRecord', () => {
        it('should return an error if a required field is missing', async () => {
            const incompleteGame: Game = {
                gid: 'valid-gid',
                name: '  ',
                description: '   ',
                mode: undefined,
                mapSize: 0,
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
                gameMap: [],
            };

            const validationParamCreateInvalid: ValidationParameter = {
                record: incompleteGame,
                create: true,
                oldName: undefined,
            };

            collectionStub.findOne.resolves(null);
            const feedback = await gameValidationService.validate(validationParamCreateInvalid, collectionStub as unknown as Collection);
            expect(feedback.errors).to.include(ValidationGameError.MissingName);
            expect(feedback.errors).to.include(ValidationGameError.MissingDescription);
        });

        it('should return an error if the game name is already taken', async () => {
            collectionStub.findOne.resolves(validGame);
            const feedback = await gameValidationService.validate(validationParamCreate, collectionStub as unknown as Collection);
            expect(feedback.errors).to.include(ValidationGameError.ExistingName);
        });

        it('should return an error if the game info is valid and the map is invalid', async () => {
            const validationParamCreateMap: ValidationParameter = {
                record: invalidGameWithMap,
                create: true,
                oldName: undefined,
            };
            collectionStub.findOne.resolves(null);
            const feedback = await gameValidationService.validate(validationParamCreateMap, collectionStub as unknown as Collection);
            expect(feedback.errors.length > 0).to.equal(true);
            expect(feedback.mapFeedback.mapStatus).to.equal(false);
        });

        it('should not return an error if the game is valid', async () => {
            const validGameWithMap: Game = {
                gid: 'valid-gid',
                name: 'Valid Game',
                description: 'A valid game description',
                mode: undefined,
                mapSize: 10,
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
                gameMap: [
                    [10, 10, 10, 10, 10, 30, 11, 15, 10, 10],
                    [10, 0, 0, 10, 10, 10, 12, 10, 10, 10],
                    [10, 0, 20, 20, 10, 30, 0, 10, 10, 10],
                    [10, 0, 10, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 10, 0, 10, 30, 30, 10, 10, 10],
                    [11, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 10, 10, 10, 0, 30, 30, 30, 10, 10],
                    [10, 10, 10, 10, 50, 30, 30, 30, 10, 10],
                    [10, 10, 10, 10, 0, 30, 10, 10, 10, 10],
                ],
            };

            const validationParamCreateMap: ValidationParameter = {
                record: validGameWithMap,
                create: true,
                oldName: undefined,
            };
            collectionStub.findOne.resolves(null);
            const feedback = await gameValidationService.validate(validationParamCreateMap, collectionStub as unknown as Collection);
            expect(feedback.errors.length).to.equal(0);
        });
    });

    describe('validateMap', () => {
        let mapValidatorStub: sinon.SinonStubbedInstance<MapValidator>;

        beforeEach(() => {
            mapValidatorStub = sinon.createStubInstance(MapValidator);
            gameValidationService['mapValidator'] = mapValidatorStub;
        });

        it('should return valid feedback if the map is correct (mapStatus = true)', () => {
            mapValidatorStub.generateResponse.returns({
                mapStatus: true,
                blockedSection: [],
                invalidDoors: [],
                excessTiles: 0,
                areItemsPlaced: true,
            });

            const validGameWithMap: Game = {
                gid: 'valid-gid',
                name: 'Valid Game',
                description: 'A valid game description',
                mode: undefined,
                mapSize: 10,
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
                gameMap: [
                    [10, 10, 10, 10, 10, 30, 18, 15, 10, 10],
                    [10, 0, 0, 10, 10, 12, 10, 10, 10, 10],
                    [10, 0, 10, 10, 10, 30, 0, 10, 10, 10],
                    [10, 0, 10, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 10, 0, 10, 30, 30, 10, 10, 10],
                    [18, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 10, 10, 10, 0, 30, 30, 30, 10, 10],
                    [10, 10, 10, 10, 50, 30, 30, 30, 10, 10],
                    [10, 10, 10, 10, 0, 30, 10, 10, 10, 10],
                ],
            };

            const errors: ValidationGameError[] = [];
            const mapFeedback = gameValidationService['validateMap'](validGameWithMap, errors);
            expect(errors.length).to.equal(0);
            expect(mapFeedback.mapStatus).to.equal(true);
        });

        it('should add an error MAP_NOT_ALL_CONNECTED if sections are blocked', () => {
            mapValidatorStub.generateResponse.returns({
                mapStatus: false,
                blockedSection: [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                ],
                invalidDoors: [],
                excessTiles: 0,
                areItemsPlaced: true,
            });

            const invalidGameWithMapNotConnected: Game = {
                gid: 'invalid-gid',
                name: 'inValid Game',
                description: 'A invalid game description',
                mode: undefined,
                mapSize: 10,
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
                gameMap: [
                    [10, 0, 10, 10, 10, 30, 18, 15, 10, 10],
                    [10, 0, 0, 10, 10, 12, 10, 10, 10, 10],
                    [10, 0, 10, 10, 10, 30, 0, 10, 10, 10],
                    [10, 0, 10, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 10, 0, 10, 30, 30, 10, 10, 10],
                    [18, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 0, 10, 10, 0, 30, 30, 30, 10, 10],
                    [0, 0, 10, 10, 50, 30, 30, 30, 10, 10],
                    [10, 10, 10, 10, 0, 30, 10, 10, 10, 10],
                ],
            };

            const errors: ValidationGameError[] = [];
            const mapFeedback = gameValidationService['validateMap'](invalidGameWithMapNotConnected, errors);
            expect(errors).to.include(ValidationGameError.MapNotAllConnected);
            expect(mapFeedback.mapStatus).to.equal(false);
        });

        it('should add an error DOOR_NOT_VALID if invalid doors are found', () => {
            mapValidatorStub.generateResponse.returns({
                mapStatus: false,
                blockedSection: [],
                invalidDoors: [
                    { x: 1, y: 1 },
                    { x: 2, y: 3 },
                ],
                excessTiles: 0,
                areItemsPlaced: true,
            });

            const invalidGameWithMapDoorNotValid: Game = {
                gid: 'invalid-gid',
                name: 'inValid Game',
                description: 'A invalid game description',
                mode: undefined,
                mapSize: 10,
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
                gameMap: [
                    [10, 0, 10, 10, 10, 30, 18, 15, 10, 10],
                    [10, 0, 0, 10, 10, 12, 10, 10, 10, 10],
                    [10, 0, 2, 2, 10, 30, 0, 10, 10, 10],
                    [10, 0, 10, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 10, 0, 10, 30, 30, 10, 10, 10],
                    [18, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 0, 10, 10, 0, 30, 30, 30, 10, 10],
                    [10, 0, 10, 10, 50, 30, 30, 30, 10, 10],
                    [10, 10, 10, 10, 10, 30, 10, 10, 10, 10],
                ],
            };

            const errors: ValidationGameError[] = [];
            const mapFeedback = gameValidationService['validateMap'](invalidGameWithMapDoorNotValid, errors);
            expect(errors).to.include(ValidationGameError.DoorNotValid);
            expect(mapFeedback.mapStatus).to.equal(false);
        });

        it('should add an error NOT_ENOUGH_WALKABALE_TILES if excess tiles are present', () => {
            mapValidatorStub.generateResponse.returns({
                mapStatus: false,
                blockedSection: [],
                invalidDoors: [],
                excessTiles: 5,
                areItemsPlaced: true,
            });

            const invalidGameWithMapNotEnoughTiles: Game = {
                gid: 'invalid-gid',
                name: 'inValid Game',
                description: 'A invalid game description',
                mode: undefined,
                mapSize: 10,
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
                gameMap: [
                    [18, 10, 10, 10, 10, 10, 10, 15, 0, 10],
                    [10, 0, 10, 10, 0, 12, 0, 0, 0, 10],
                    [10, 0, 2, 2, 0, 0, 0, 0, 0, 0],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [18, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [10, 10, 10, 0, 0, 0, 0, 0, 0, 0],
                    [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                    [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                ],
            };

            const errors: ValidationGameError[] = [];
            const mapFeedback = gameValidationService['validateMap'](invalidGameWithMapNotEnoughTiles, errors);
            expect(errors).to.include(ValidationGameError.NotEnoughWalkableTile);
            expect(mapFeedback.mapStatus).to.equal(false);
        });

        it('should add an error NOT_ALL_START_POINT_ON_MAP if items are not correctly placed', () => {
            mapValidatorStub.generateResponse.returns({
                mapStatus: false,
                blockedSection: [],
                invalidDoors: [],
                excessTiles: 0,
                areItemsPlaced: true,
                areStartingPointPlaced: false,
            });

            const validGameWithMapNotAllStartPoint: Game = {
                gid: 'invalid-gid',
                name: 'inValid Game',
                description: 'A invalid game description',
                mode: undefined,
                mapSize: 10,
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
                gameMap: [
                    [10, 10, 10, 10, 10, 30, 10, 15, 10, 10],
                    [10, 0, 0, 10, 10, 12, 10, 10, 10, 10],
                    [10, 0, 10, 10, 10, 30, 0, 10, 10, 10],
                    [10, 0, 10, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 10, 0, 10, 30, 30, 10, 10, 10],
                    [10, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 0, 0, 0, 10, 30, 30, 10, 10, 10],
                    [10, 10, 10, 10, 0, 30, 30, 30, 10, 10],
                    [10, 10, 10, 10, 50, 30, 30, 30, 10, 10],
                    [10, 10, 10, 10, 0, 30, 10, 10, 10, 10],
                ],
            };

            const errors: ValidationGameError[] = [];
            const mapFeedback = gameValidationService['validateMap'](validGameWithMapNotAllStartPoint, errors);
            expect(errors[0]).to.include(ValidationGameError.NotAllStartPointOnMap);
            expect(mapFeedback.mapStatus).to.equal(false);
        });

        it('should add multiple errors if multiple conditions are invalid', () => {
            mapValidatorStub.generateResponse.returns({
                mapStatus: false,
                blockedSection: [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: 2 },
                    { x: 0, y: 3 },
                ],
                invalidDoors: [{ x: 4, y: 1 }],
                excessTiles: 5,
                areItemsPlaced: false,
                areStartingPointPlaced: false,
            });

            const invalidGameWithMapAllNotOk: Game = {
                gid: 'invalid-gid',
                name: 'inValid Game',
                description: 'A invalid game description',
                mode: undefined,
                mapSize: 10,
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
                gameMap: [
                    [18, 0, 10, 10, 10, 10, 10, 15, 0, 10],
                    [10, 0, 10, 10, 50, 12, 0, 0, 0, 10],
                    [10, 0, 12, 12, 0, 0, 0, 0, 0, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10],
                ],
            };

            const errors: ValidationGameError[] = [];
            const mapFeedback = gameValidationService['validateMap'](invalidGameWithMapAllNotOk, errors);
            const itemErrorMessage = `${ValidationGameError.NotAllItemsOnMap}${ITEM_COUNT_ERROR[GameMapSize.Small]}`;
            expect(errors).to.include(ValidationGameError.MapNotAllConnected);
            expect(errors).to.include(ValidationGameError.DoorNotValid);
            expect(errors).to.include(ValidationGameError.NotEnoughWalkableTile);
            expect(errors).to.include(ValidationGameError.NotAllStartPointOnMap);
            expect(errors).to.include(itemErrorMessage);
            expect(mapFeedback.mapStatus).to.equal(false);
        });

        it('should add  correct errors if item condition is not good when maps size is upper than small', () => {
            mapValidatorStub.generateResponse.returns({
                mapStatus: false,
                blockedSection: [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                    { x: 0, y: 2 },
                    { x: 0, y: 3 },
                ],
                invalidDoors: [{ x: 4, y: 1 }],
                excessTiles: 5,
                areItemsPlaced: false,
                areStartingPointPlaced: false,
            });

            const invalidGameWithMapAllNotOk: Game = {
                gid: 'invalid-gid',
                name: 'inValid Game',
                description: 'A invalid game description',
                mode: undefined,
                mapSize: 15,
                creationDate: undefined,
                lastEditDate: undefined,
                imageBase64: '',
                isVisible: false,
                gameMap: [
                    [18, 0, 10, 10, 10, 10, 10, 15, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 10, 10, 50, 12, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 12, 12, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                    [10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10],
                ],
            };

            const errors: ValidationGameError[] = [];
            const mapFeedback = gameValidationService['validateMap'](invalidGameWithMapAllNotOk, errors);
            const itemErrorMessage = `${ValidationGameError.NotAllItemsOnMap}${ITEM_COUNT_ERROR[GameMapSize.Medium]}`;
            expect(errors).to.include(itemErrorMessage);
            expect(mapFeedback.mapStatus).to.equal(false);
        });
    });

    describe('GameValidationService generateMapValidationRules', () => {
        it('should return validation rules with all conditions false when map feedback is valid and mode is not Flag', () => {
            const mapFeedback: MapValidationIndicator = {
                mapStatus: true,
                blockedSection: [],
                invalidDoors: [],
                excessTiles: 0,
                areItemsPlaced: true,
                areStartingPointPlaced: true,
                isFlagInMap: true,
            };
            const mode = 'Classic';

            const validationRules = gameValidationService['generateMapValidationRules'](mapFeedback, mode);

            expect(validationRules).to.deep.equal([
                { condition: false, error: ValidationGameError.MapNotAllConnected },
                { condition: false, error: ValidationGameError.DoorNotValid },
                { condition: false, error: ValidationGameError.NotEnoughWalkableTile },
                { condition: false, error: ValidationGameError.NotAllItemsOnMap },
                { condition: false, error: ValidationGameError.NotAllStartPointOnMap },
            ]);
        });

        it('should return validation rules with specific conditions true when map feedback has errors', () => {
            const mapFeedback: MapValidationIndicator = {
                mapStatus: false,
                blockedSection: [{ x: 1, y: 1 }],
                invalidDoors: [{ x: 2, y: 2 }],
                excessTiles: 5,
                areItemsPlaced: false,
                areStartingPointPlaced: false,
                isFlagInMap: false,
            };
            const mode = 'Classic';

            const validationRules = gameValidationService['generateMapValidationRules'](mapFeedback, mode);

            expect(validationRules).to.deep.equal([
                { condition: true, error: ValidationGameError.MapNotAllConnected },
                { condition: true, error: ValidationGameError.DoorNotValid },
                { condition: true, error: ValidationGameError.NotEnoughWalkableTile },
                { condition: true, error: ValidationGameError.NotAllItemsOnMap },
                { condition: true, error: ValidationGameError.NotAllStartPointOnMap },
            ]);
        });

        it('should include flag validation when mode is Flag and flag is not in map', () => {
            const mapFeedback: MapValidationIndicator = {
                mapStatus: true,
                blockedSection: [],
                invalidDoors: [],
                excessTiles: 0,
                areItemsPlaced: true,
                areStartingPointPlaced: true,
                isFlagInMap: false,
            };
            const mode = GameMode.Flag;

            const validationRules = gameValidationService['generateMapValidationRules'](mapFeedback, mode);

            expect(validationRules).to.deep.equal([
                { condition: false, error: ValidationGameError.MapNotAllConnected },
                { condition: false, error: ValidationGameError.DoorNotValid },
                { condition: false, error: ValidationGameError.NotEnoughWalkableTile },
                { condition: false, error: ValidationGameError.NotAllItemsOnMap },
                { condition: false, error: ValidationGameError.NotAllStartPointOnMap },
                { condition: true, error: ValidationGameError.FlagAreNotPlaceOnTheMap },
            ]);
        });

        it('should not include flag validation when mode is not Flag', () => {
            const mapFeedback: MapValidationIndicator = {
                mapStatus: true,
                blockedSection: [],
                invalidDoors: [],
                excessTiles: 0,
                areItemsPlaced: true,
                areStartingPointPlaced: true,
                isFlagInMap: false,
            };
            const mode = 'Classic';

            const validationRules = gameValidationService['generateMapValidationRules'](mapFeedback, mode);

            expect(validationRules).to.deep.equal([
                { condition: false, error: ValidationGameError.MapNotAllConnected },
                { condition: false, error: ValidationGameError.DoorNotValid },
                { condition: false, error: ValidationGameError.NotEnoughWalkableTile },
                { condition: false, error: ValidationGameError.NotAllItemsOnMap },
                { condition: false, error: ValidationGameError.NotAllStartPointOnMap },
            ]);
        });

        it('should handle mixed conditions correctly in Flag mode', () => {
            const mapFeedback: MapValidationIndicator = {
                mapStatus: false,
                blockedSection: [{ x: 1, y: 1 }],
                invalidDoors: [],
                excessTiles: 0,
                areItemsPlaced: true,
                areStartingPointPlaced: true,
                isFlagInMap: false,
            };
            const mode = GameMode.Flag;
            const validationRules = gameValidationService['generateMapValidationRules'](mapFeedback, mode);

            expect(validationRules).to.deep.equal([
                { condition: true, error: ValidationGameError.MapNotAllConnected },
                { condition: false, error: ValidationGameError.DoorNotValid },
                { condition: false, error: ValidationGameError.NotEnoughWalkableTile },
                { condition: false, error: ValidationGameError.NotAllItemsOnMap },
                { condition: false, error: ValidationGameError.NotAllStartPointOnMap },
                { condition: true, error: ValidationGameError.FlagAreNotPlaceOnTheMap },
            ]);
        });
    });

    describe('checkMissingField', () => {
        it('should add an error if the field is empty or missing', () => {
            const errors: ValidationGameError[] = [];
            gameValidationService['checkMissingField']('', ValidationGameError.MissingName, errors);
            gameValidationService['checkMissingField'](undefined as unknown as string, ValidationGameError.MissingDescription, errors);

            expect(errors).to.include(ValidationGameError.MissingName);
            expect(errors).to.include(ValidationGameError.MissingDescription);
        });

        it('should not add an error if the field is filled', () => {
            const errors: ValidationGameError[] = [];
            gameValidationService['checkMissingField']('Some Name', ValidationGameError.MissingName, errors);
            expect(errors.length).to.equal(0);
        });
    });

    describe('isNameTaken', () => {
        it('should return true if the name is already taken', async () => {
            collectionStub.findOne.resolves(validGame);
            const result = await gameValidationService['isNameTaken'](validGame.name, collectionStub as unknown as Collection);
            expect(result).to.equal(true);
        });

        it('should return false if the name is not taken', async () => {
            collectionStub.findOne.resolves(null);
            const result = await gameValidationService['isNameTaken'](validGame.name, collectionStub as unknown as Collection);
            expect(result).to.equal(false);
        });
    });

    describe('isNameAlreadyExist', () => {
        it('should return true if the name already exists for a creation', async () => {
            collectionStub.findOne.resolves(validGame);
            const result = await gameValidationService['isNameAlreadyExist'](validationParamCreate, collectionStub);
            expect(result).to.equal(true);
        });

        it('should return false if the name does not exist for a creation', async () => {
            collectionStub.findOne.resolves(null);
            const result = await gameValidationService['isNameAlreadyExist'](validationParamCreate, collectionStub);
            expect(result).to.equal(false);
        });

        it('should return true if the name is modified for an update and already exists', async () => {
            const paramWithDifferentName: ValidationParameter = {
                record: { ...validGame, name: 'New Game' },
                create: false,
                oldName: 'Old Game',
            };
            collectionStub.findOne.resolves(validGame);
            const result = await gameValidationService['isNameAlreadyExist'](paramWithDifferentName, collectionStub);
            expect(result).to.equal(true);
        });

        it('should return false if the name has not changed for an update', async () => {
            const paramWithSameName: ValidationParameter = {
                record: validGame,
                create: false,
                oldName: 'Valid Game',
            };
            const result = await gameValidationService['isNameAlreadyExist'](paramWithSameName, collectionStub);
            expect(result).to.equal(false);
        });
    });
});
