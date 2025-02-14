import { LogParameter } from "./log-parameter";
import { SendingOptions } from "../enums/sending-options";
export interface LogEventData {
    partyId: string;
    logParameters: LogParameter;
    options: SendingOptions;
    winner?: string;
}