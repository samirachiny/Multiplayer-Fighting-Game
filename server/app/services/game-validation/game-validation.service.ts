import { ITEM_COUNT_ERROR } from '@app/utils/const';
import { Game } from '@common/interfaces/game';
import { Collection } from 'mongodb';
import { Service } from 'typedi';
import { MapValidator } from '@app/services/map-validator/map-validator.service';
import { MapValidationIndicator } from '@common/interfaces/map-validation-indicator';
import { ValidationParameter } from '@app/interfaces/validation-parameter';
import { ValidationFeedback } from '@common/interfaces/validation-feedback';
import { GameMapSize, GameMode } from '@common/enums/game-infos';
import { ValidationRule } from '@common/interfaces/validation-rule';
import { ValidationGameError } from '@common/enums/validation-game-error';

@Service()
export class GameValidationService {
    constructor(private mapValidator: MapValidator) {}

    async validate(param: ValidationParameter, collection: Collection): Promise<ValidationFeedback> {
        const errors: ValidationGameError[] = [];
        this.checkMissingField(param.record.name, ValidationGameError.MissingName, errors);
        this.checkMissingField(param.record.description, ValidationGameError.MissingDescription, errors);
        if (await this.isNameAlreadyExist(param, collection)) {
            errors.push(ValidationGameError.ExistingName);
        }
        const mapFeedback: MapValidationIndicator = this.validateMap(param.record, errors);
        return { errors, mapFeedback };
    }

    private validateMap(game: Game, errors: ValidationGameError[]): MapValidationIndicator {
        this.mapValidator.setMap(game.gameMap);
        const mapFeedback: MapValidationIndicator = this.mapValidator.generateResponse(game.mode === GameMode.Flag);
        if (mapFeedback.mapStatus) return mapFeedback;
        this.generateMapValidationRules(mapFeedback, game.mode).forEach((rule: ValidationRule) => {
            if (rule.condition) errors.push(rule.error);
        });

        this.updateErrorMessageForItemCount(errors, game.mapSize);
        return mapFeedback;
    }

    private updateErrorMessageForItemCount(errors: ValidationGameError[], size: GameMapSize): void {
        const itemErrorIndex = errors.findIndex((error) => ValidationGameError.NotAllItemsOnMap === error);
        const msg: string = ITEM_COUNT_ERROR[size];
        if (itemErrorIndex !== -1) {
            errors[itemErrorIndex] = errors[itemErrorIndex].concat(msg) as ValidationGameError;
        }
    }

    private generateMapValidationRules(mapFeedBack: MapValidationIndicator, mode: string): ValidationRule[] {
        const validationRules: ValidationRule[] = [
            { condition: mapFeedBack.blockedSection.length > 0, error: ValidationGameError.MapNotAllConnected },
            { condition: mapFeedBack.invalidDoors.length > 0, error: ValidationGameError.DoorNotValid },
            { condition: mapFeedBack.excessTiles > 0, error: ValidationGameError.NotEnoughWalkableTile },
            { condition: mapFeedBack.areItemsPlaced === false, error: ValidationGameError.NotAllItemsOnMap },
            { condition: mapFeedBack.areStartingPointPlaced === false, error: ValidationGameError.NotAllStartPointOnMap },
        ];

        if (mode === GameMode.Flag) {
            validationRules.push({
                condition: !mapFeedBack.isFlagInMap,
                error: ValidationGameError.FlagAreNotPlaceOnTheMap,
            });
        }
        return validationRules;
    }

    private checkMissingField(field: string | undefined, errorType: ValidationGameError, errorArray: ValidationGameError[]): void {
        if (!field || field.trim().length === 0) {
            errorArray.push(errorType);
        }
    }

    private async isNameTaken(name: string, collection: Collection): Promise<boolean> {
        return !!(await collection.findOne({ name: name.trim() }));
    }

    private async isNameAlreadyExist(param: ValidationParameter, collection: Collection): Promise<boolean> {
        return (param.create || param.record.name.trim() !== param.oldName.trim()) && (await this.isNameTaken(param.record.name, collection));
    }
}
