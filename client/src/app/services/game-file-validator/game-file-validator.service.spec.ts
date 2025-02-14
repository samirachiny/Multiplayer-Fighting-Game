/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { GameFileValidatorService } from './game-file-validator.service';
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, GAME_MODE_OPTIONS, DECIMAL_TILE_BASE, GAME_VALIDATION_FILE_ERRORS } from '@app/constants/consts';
import { TileType } from '@common/enums/tile';

describe('GameFileValidatorService', () => {
    let service: GameFileValidatorService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GameFileValidatorService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return an empty error list initially', () => {
        expect(service.getErrors()).toEqual([]);
    });

    it('should validate a correct game file', () => {
        const validGameFile = JSON.stringify({
            name: 'Valid Game',
            description: 'A valid game description',
            mode: GAME_MODE_OPTIONS[0],
            gameMap: Array(10).fill(Array(10).fill(TileType.Wall * DECIMAL_TILE_BASE)),
        });
        expect(service.validateGameFile(validGameFile)).toBeTrue();
        expect(service.getErrors()).toEqual([]);
    });

    it('should add error for empty JSON file', () => {
        const emptyGameFile = JSON.stringify(null);
        expect(service.validateGameFile(emptyGameFile)).toBeFalse();
        expect(service.getErrors()).toContain(GAME_VALIDATION_FILE_ERRORS.jsonFileEmpty);
    });

    it('should add error for invalid JSON format', () => {
        const invalidGameFile = 'invalid JSON';
        expect(service.validateGameFile(invalidGameFile)).toBeFalse();
        expect(service.getErrors()).toContain(GAME_VALIDATION_FILE_ERRORS.jsonFileInvalid);
    });

    it('should add error for invalid game name', () => {
        const invalidNameGameFile = JSON.stringify({
            name: 'A'.repeat(MAX_NAME_LENGTH + 1),
            description: 'A valid game description',
            mode: GAME_MODE_OPTIONS[0],
            gameMap: Array(10).fill(Array(10).fill(TileType.Wall * DECIMAL_TILE_BASE)),
        });
        expect(service.validateGameFile(invalidNameGameFile)).toBeFalse();
        expect(service.getErrors()).toContain(GAME_VALIDATION_FILE_ERRORS.gameNameInvalid);
    });

    it('should add error for invalid game description', () => {
        const invalidDescriptionGameFile = JSON.stringify({
            name: 'Valid Game',
            description: 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1),
            mode: GAME_MODE_OPTIONS[0],
            gameMap: Array(10).fill(Array(10).fill(TileType.Wall * DECIMAL_TILE_BASE)),
        });
        expect(service.validateGameFile(invalidDescriptionGameFile)).toBeFalse();
        expect(service.getErrors()).toContain(GAME_VALIDATION_FILE_ERRORS.gameDescriptionInvalid);
    });

    it('should add error for invalid game mode', () => {
        const invalidModeGameFile = JSON.stringify({
            name: 'Valid Game',
            description: 'A valid game description',
            mode: 'InvalidMode',
            gameMap: Array(10).fill(Array(10).fill(TileType.Wall * DECIMAL_TILE_BASE)),
        });
        expect(service.validateGameFile(invalidModeGameFile)).toBeFalse();
        expect(service.getErrors()).toContain(GAME_VALIDATION_FILE_ERRORS.gameModeInvalid);
    });

    it('should add error for absent game map', () => {
        const noMapGameFile = JSON.stringify({
            name: 'Valid Game',
            description: 'A valid game description',
            mode: GAME_MODE_OPTIONS[0],
            gameMap: null,
        });
        expect(service.validateGameFile(noMapGameFile)).toBeFalse();
        expect(service.getErrors()).toContain(GAME_VALIDATION_FILE_ERRORS.gameMapMissing);
    });

    it('should add error for invalid map size', () => {
        const invalidMapSizeGameFile = JSON.stringify({
            name: 'Valid Game',
            description: 'A valid game description',
            mode: GAME_MODE_OPTIONS[0],
            gameMap: Array(5).fill(Array(5).fill(TileType.Wall * DECIMAL_TILE_BASE)),
        });
        expect(service.validateGameFile(invalidMapSizeGameFile)).toBeFalse();
        expect(service.getErrors()).toContain(GAME_VALIDATION_FILE_ERRORS.gameMapSizeInvalid);
    });

    it('should add error for non-square map', () => {
        const nonSquareMapGameFile = JSON.stringify({
            name: 'Valid Game',
            description: 'A valid game description',
            mode: GAME_MODE_OPTIONS[0],
            gameMap: Array(10).fill(Array(5).fill(TileType.Wall * DECIMAL_TILE_BASE)),
        });
        expect(service.validateGameFile(nonSquareMapGameFile)).toBeFalse();
        expect(service.getErrors()).toContain(GAME_VALIDATION_FILE_ERRORS.gameMapInvalid);
    });

    it('should add error for invalid tile values', () => {
        const invalidTileGameFile = JSON.stringify({
            name: 'Valid Game',
            description: 'A valid game description',
            mode: GAME_MODE_OPTIONS[0],
            gameMap: Array(10).fill(Array(10).fill('InvalidTile')),
        });
        expect(service.validateGameFile(invalidTileGameFile)).toBeFalse();
        expect(service.getErrors()).toContain(GAME_VALIDATION_FILE_ERRORS.gameMapTileInvalid);
    });
});
