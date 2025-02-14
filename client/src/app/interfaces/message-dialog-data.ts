import { MessageDialogType } from '@app/enums/message-dialog-type';

export interface MessageDialogData {
    type: MessageDialogType;
    title: string;
    body: string;
    optionals?: string[];
}
