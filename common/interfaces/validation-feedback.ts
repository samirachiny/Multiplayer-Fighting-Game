import { ValidationGameError } from '@common/enums/validation-game-error';
import { MapValidationIndicator } from './map-validation-indicator';

export interface ValidationFeedback {
    errors: ValidationGameError[];
    mapFeedback?: MapValidationIndicator;
}
