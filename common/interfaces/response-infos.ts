import { ValidationFeedback } from './validation-feedback';
import { Message } from './message';

export interface RequestResponse<T> {
    message: Message;
    resource: T;
}

export interface ValidationResponse<T> {
    resource: T;
    feedbacks?: ValidationFeedback;
}
