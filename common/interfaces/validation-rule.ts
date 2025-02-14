import { ValidationGameError } from '@common/enums/validation-game-error';
export interface ValidationRule {
    condition: boolean;
    error: ValidationGameError;
}