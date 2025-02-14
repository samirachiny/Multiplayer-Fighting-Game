import { FightMessageEvent } from '@app/enums/fight-message-event';

export type FightMessageFunction = (name?: string) => string;

export type FightMessageTemplates = {
    [key in FightMessageEvent]: FightMessageFunction;
};
