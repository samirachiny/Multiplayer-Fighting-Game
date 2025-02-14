import { Coordinate } from "./coordinate";
import { PlayerInfos } from "./player-infos";
import { ItemType } from "../enums/item";

export interface StatisticEventData {
    partyId: string;
    totalWalkableTile?: number;
    totalDoor?: number;
    playerId?: string;
    player?: PlayerInfos;
    coord?: Coordinate;
    attackerPid?: string;
    defenderPid?: string;
    item?: ItemType;
}