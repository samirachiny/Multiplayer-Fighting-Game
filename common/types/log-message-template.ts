import { LogTypeEvent } from "@common/enums/log-type";

export interface DiceInfos { faceNumber: number; targetToApply: number; }
export type FightEventInfos = number | boolean | DiceInfos ;
export type LogMessageFunction = (players?: string[], moreInfos?: FightEventInfos) => string;

export type LogMessageTemplates = {
    [key in LogTypeEvent]: LogMessageFunction;
};