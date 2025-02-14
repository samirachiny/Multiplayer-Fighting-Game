import { FightEventInfos } from '../types/log-message-template';
import { LogTypeEvent } from "../enums/log-type";

export interface LogParameter {
    event: LogTypeEvent;
    players?: string[];
    moreInfos?: FightEventInfos;
    playerIds?: string[];
}