import { LogTypeEvent } from "@common/enums/log-type";

export interface GameLogs {
    time: Date;
    message: string;
    type: LogTypeEvent;
    playerIds?: string[];
}
