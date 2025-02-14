import { EventBus } from '@app/classes/event-bus/event-bus';
import { PartyLogService } from '@app/services/party-logs/party-logs.service';
import { Container, Service } from 'typedi';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';
import { PlayerStatisticService } from '@app/services/player-statistic/player-statistic.service';
import { GameEventType } from '@common/enums/game-event-type';
import { LogTypeEvent } from '@common/enums/log-type';
import { ItemType } from '@common/enums/item';
import { LogEventData } from '@common/interfaces/log-event-data';
import { StatisticEventData } from '@common/interfaces/statistic-event-data';
import { EventHandler } from '@common/interfaces/event-handler';
import { IncrementablePlayerStatisticFields } from '@common/enums/incrementable-player-statistic';
@Service()
export class PartyEventListener {
    private partyLogsService: PartyLogService;
    private partyStatService: PartyStatisticsService;
    private playerStatService: PlayerStatisticService;
    private eventBus: EventBus;
    private eventHandlers: EventHandler[] = [];

    constructor() {
        this.setUp();
        this.listenAndProcess();
    }

    emit<T>(event: string, data: Record<string, T>): void {
        this.eventBus.emit(event, data);
    }

    dispose(): void {
        this.eventHandlers.forEach(({ event, handler }) => {
            this.eventBus.off(event, handler);
        });
        this.eventHandlers = [];
    }

    private addEventListener(event: string, handler: (data: LogEventData | StatisticEventData) => void): void {
        this.eventBus.on(event, handler);
        this.eventHandlers.push({ event, handler });
    }

    private listenAndProcess(): void {
        this.listenPartyEventAndProcess();
        this.listenPlayerEventAndProcess();
        this.listenAndComputeStats();
        this.listenFightEventAndProcess();
    }

    private setUp(): void {
        this.partyLogsService = Container.get(PartyLogService);
        this.partyStatService = Container.get(PartyStatisticsService);
        this.playerStatService = Container.get(PlayerStatisticService);
        this.eventBus = EventBus.getInstance();
    }

    private listenPartyEventAndProcess() {
        this.addEventListener(LogTypeEvent.BeginParty, (data: LogEventData) => {
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options);
        });
        this.addEventListener(LogTypeEvent.StartTurn, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.EndTurn, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.GiveUp, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.EndGame, (data: LogEventData) => {
            this.partyStatService.updateWinner(data.partyId, data.winner);
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options);
        });
        this.addEventListener(LogTypeEvent.DebugOff, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.DebugOn, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.QuitGame, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
    }

    private listenPlayerEventAndProcess() {
        this.addEventListener(LogTypeEvent.CloseDoor, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.OpenDoor, (data: LogEventData) => {
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options);
        });
        this.addEventListener(LogTypeEvent.CollectFlag, (data: LogEventData) => {
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options);
        });
        this.addEventListener(LogTypeEvent.CollectItem, (data: LogEventData) => {
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options);
        });
        this.addEventListener(LogTypeEvent.LossTheFlag, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
    }

    private listenAndComputeStats() {
        this.addEventListener(GameEventType.PartyBegin, (data: StatisticEventData) => {
            this.partyStatService.updateTotalWalkableTile(data.partyId, data.totalWalkableTile);
            this.partyStatService.updateTotalDoor(data.partyId, data.totalDoor);
        });
        this.addEventListener(GameEventType.TileVisited, (data: StatisticEventData) => {
            if (data.playerId) this.playerStatService.updateVisitedTile(data.partyId, data.playerId, data.coord);
            this.partyStatService.updateVisitedTile(data.partyId, data.coord);
        });
        this.addEventListener(GameEventType.DoorManipulated, (data: StatisticEventData) => {
            this.partyStatService.updateManipulatedDoor(data.partyId, data.coord);
        });
        this.addEventListener(GameEventType.BeginFight, (data: StatisticEventData) => {
            this.playerStatService.updateStatisticField(data.partyId, data.attackerPid, IncrementablePlayerStatisticFields.numberOfFights);
            this.playerStatService.updateStatisticField(data.partyId, data.defenderPid, IncrementablePlayerStatisticFields.numberOfFights);
        });
        this.addEventListener(GameEventType.RoundCount, (data: StatisticEventData) => {
            this.partyStatService.incrementTotalRounds(data.partyId);
        });
        this.addEventListener(GameEventType.ItemCount, (data: StatisticEventData) => {
            if (data.item === ItemType.Flag) this.partyStatService.updateFlagHolderNames(data.partyId, data.player.name);
            this.playerStatService.updateObjectsCollected(data.partyId, data.player.pid, data.item);
        });
        this.addEventListener(GameEventType.PlayerVictory, (data: StatisticEventData) => {
            this.playerStatService.updateStatisticField(data.partyId, data.attackerPid, IncrementablePlayerStatisticFields.numberOfWins);
            this.playerStatService.updateStatisticField(data.partyId, data.defenderPid, IncrementablePlayerStatisticFields.numberOfDefeats);
        });
        this.addEventListener(GameEventType.LifePointDamage, (data: StatisticEventData) => {
            this.playerStatService.updateStatisticField(data.partyId, data.attackerPid, IncrementablePlayerStatisticFields.totalDamageDealt);
            this.playerStatService.updateStatisticField(data.partyId, data.defenderPid, IncrementablePlayerStatisticFields.totalHealthLost);
        });
        this.addEventListener(GameEventType.EscapeAttempt, (data: StatisticEventData) => {
            this.playerStatService.updateStatisticField(data.partyId, data.attackerPid, IncrementablePlayerStatisticFields.numberOfEscape);
        });
    }

    private listenFightEventAndProcess() {
        this.addEventListener(LogTypeEvent.StartCombat, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.AttackTo, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.DefenseFrom, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.EscapeFrom, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.EndFight, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.EndFightWithoutWinner, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.ComputeDiceAttackBonus, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
        this.addEventListener(LogTypeEvent.ComputeDiceDefenseBonus, (data: LogEventData) =>
            this.partyLogsService.addLog(data.partyId, data.logParameters, data.options),
        );
    }
}
