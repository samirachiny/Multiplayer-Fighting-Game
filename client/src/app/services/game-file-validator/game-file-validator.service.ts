import { Injectable } from '@angular/core';
import {
    MAX_NAME_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    GAME_MODE_OPTIONS,
    MAP_SIZE_OPTIONS,
    DECIMAL_TILE_BASE,
    GAME_VALIDATION_FILE_ERRORS,
    TILE_TYPE,
} from '@app/constants/consts';
import { ImportGameFormat } from '@app/interfaces/import-game-format';
import { GameMode } from '@common/enums/game-infos';
import { TileType } from '@common/enums/tile';

@Injectable({
    providedIn: 'root',
})
export class GameFileValidatorService {
    private messageErrors: string[] = [];

    getErrors(): string[] {
        return this.messageErrors;
    }

    validateGameFile(fileContent: string): boolean {
        this.messageErrors = [];
        try {
            const game = JSON.parse(fileContent);
            if (!game) {
                this.addError(GAME_VALIDATION_FILE_ERRORS.jsonFileEmpty);
                return false;
            }
            return this.validateFile(game);
        } catch {
            this.addError(GAME_VALIDATION_FILE_ERRORS.jsonFileInvalid);
            return false;
        }
    }
    private validateFile(game: ImportGameFormat): boolean {
        this.validateName(game.name);
        this.validateDescription(game.description);
        this.validateMode(game.mode);
        this.validateMap(game.gameMap);
        return this.messageErrors.length === 0;
    }

    private addError(message: string): void {
        this.messageErrors.push(message);
    }

    private validateName(name: string): void {
        if (!name || name.length > MAX_NAME_LENGTH) {
            this.addError(GAME_VALIDATION_FILE_ERRORS.gameNameInvalid);
        }
    }

    private validateDescription(description: string): void {
        if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
            this.addError(GAME_VALIDATION_FILE_ERRORS.gameDescriptionInvalid);
        }
    }

    private validateMode(mode: GameMode): void {
        if (!(mode && GAME_MODE_OPTIONS.includes(mode))) {
            this.addError(GAME_VALIDATION_FILE_ERRORS.gameModeInvalid);
        }
    }

    private validateMap(map: number[][]): void {
        if (!map || map.length === 0) {
            this.addError(GAME_VALIDATION_FILE_ERRORS.gameMapMissing);
            return;
        }
        if (!this.validateMapSize(map.length)) return;
        map.forEach((row) => {
            if (!(this.validateRowLength(row.length, map.length) && this.validateRowTiles(row))) return;
        });
    }

    private validateMapSize(size: number): boolean {
        if (!MAP_SIZE_OPTIONS.includes(size)) {
            this.addError(GAME_VALIDATION_FILE_ERRORS.gameMapSizeInvalid);
            return false;
        }
        return true;
    }

    private validateRowLength(rowLength: number, mapLength: number): boolean {
        if (rowLength !== mapLength) {
            this.addError(GAME_VALIDATION_FILE_ERRORS.gameMapInvalid);
            return false;
        }
        return true;
    }

    private validateRowTiles(row: number[]): boolean {
        return row.every((tile) => this.validateTile(tile));
    }

    private validateTile(tileNumber: number): boolean {
        const tile = Math.floor(tileNumber / DECIMAL_TILE_BASE);
        if (typeof tileNumber !== TILE_TYPE || !TileType[tile]) {
            this.addError(GAME_VALIDATION_FILE_ERRORS.gameMapTileInvalid);
            return false;
        }
        return true;
    }
}
