import { LogEventData } from './log-event-data';
import { StatisticEventData } from './statistic-event-data';
export interface EventHandler {
    event: string;
    handler: (data: LogEventData | StatisticEventData) => void;
}