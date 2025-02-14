/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { EventBus } from '@app/classes/event-bus/event-bus';
import { PartyLogService } from '@app/services/party-logs/party-logs.service';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';
import { PlayerStatisticService } from '@app/services/player-statistic/player-statistic.service';
import { Container } from 'typedi';
import { LogTypeEvent } from '@common/enums/log-type';
import { GameEventType } from '@common/enums/game-event-type';
import { SendingOptions } from '@common/enums/sending-options';
import { LogEventData } from '@common/interfaces/log-event-data';
import { StatisticEventData } from '@common/interfaces/statistic-event-data';
import { ItemType } from '@common/enums/item';
import { IncrementablePlayerStatisticFields } from '@common/enums/incrementable-player-statistic';

describe('PartyEventListener', () => {
    let eventListener: PartyEventListener;
    let eventBus: EventBus;
    let partyLogsServiceStub: sinon.SinonStubbedInstance<PartyLogService>;
    let partyStatServiceStub: sinon.SinonStubbedInstance<PartyStatisticsService>;
    let playerStatServiceStub: sinon.SinonStubbedInstance<PlayerStatisticService>;

    beforeEach(() => {
        eventBus = EventBus.getInstance();
        partyLogsServiceStub = sinon.createStubInstance(PartyLogService);
        partyStatServiceStub = sinon.createStubInstance(PartyStatisticsService);
        playerStatServiceStub = sinon.createStubInstance(PlayerStatisticService);

        Container.set(PartyLogService, partyLogsServiceStub);
        Container.set(PartyStatisticsService, partyStatServiceStub);
        Container.set(PlayerStatisticService, playerStatServiceStub);

        eventListener = new PartyEventListener();
    });

    afterEach(() => {
        eventListener.dispose();
        sinon.restore();
    });

    describe('emit', () => {
        it('should emit event with data passed', () => {
            const emitSpy = sinon.spy(eventBus, 'emit');
            const event = 'testEvent';
            const data = { key: 'value' };

            eventListener.emit(event, data);
            expect(emitSpy.calledOnceWithExactly(event, data)).to.equal(true);
        });
    });

    describe('listenPartyEventAndProcess', () => {
        const logEvents: LogTypeEvent[] = [
            LogTypeEvent.BeginParty,
            LogTypeEvent.StartTurn,
            LogTypeEvent.EndTurn,
            LogTypeEvent.GiveUp,
            LogTypeEvent.EndGame,
            LogTypeEvent.DebugOff,
            LogTypeEvent.DebugOn,
            LogTypeEvent.QuitGame,
        ];

        logEvents.forEach((event) => {
            it(`should call addLog for party event like ${event}`, () => {
                const data: LogEventData = {
                    partyId: 'partyId',
                    logParameters: { event },
                    options: SendingOptions.Broadcast,
                };

                eventBus.emit(event, data);

                expect(partyLogsServiceStub.addLog.calledOnceWithExactly(data.partyId, data.logParameters, data.options)).to.equal(true);
            });
        });
    });

    describe('listenPlayerEventAndProcess', () => {
        const playerEvents: LogTypeEvent[] = [
            LogTypeEvent.CloseDoor,
            LogTypeEvent.OpenDoor,
            LogTypeEvent.CollectFlag,
            LogTypeEvent.CollectItem,
            LogTypeEvent.LossTheFlag,
        ];

        playerEvents.forEach((event) => {
            it(`should call addLog for player event like ${event}`, () => {
                const data: LogEventData = {
                    partyId: 'partyId',
                    logParameters: { event, playerIds: ['player1'] },
                    options: SendingOptions.Unicast,
                };

                eventBus.emit(event, data);

                expect(partyLogsServiceStub.addLog.calledOnceWithExactly(data.partyId, data.logParameters, data.options)).to.equal(true);
            });
        });
    });

    describe('listenAndComputeStats', () => {
        it('should update totalWalkableTile and totalDoor when event PartyBegin is emitted', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                totalWalkableTile: 100,
                totalDoor: 10,
            };

            eventBus.emit(GameEventType.PartyBegin, data);

            expect(partyStatServiceStub.updateTotalWalkableTile.calledOnceWithExactly(data.partyId, data.totalWalkableTile)).to.equal(true);
            expect(partyStatServiceStub.updateTotalDoor.calledOnceWithExactly(data.partyId, data.totalDoor)).to.equal(true);
        });

        it('should update visited tiles for the player and the party with the playerId and partyId targeted', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                playerId: 'playerId',
                coord: { x: 1, y: 2 },
            };

            eventBus.emit(GameEventType.TileVisited, data);

            expect(playerStatServiceStub.updateVisitedTile.calledOnceWithExactly(data.partyId, data.playerId, data.coord)).to.equal(true);
            expect(partyStatServiceStub.updateVisitedTile.calledOnceWithExactly(data.partyId, data.coord)).to.equal(true);
        });

        it('should update visited tiles for the party only when playerId not provided', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                coord: { x: 1, y: 2 },
            };

            eventBus.emit(GameEventType.TileVisited, data);

            expect(playerStatServiceStub.updateVisitedTile.notCalled).to.equal(true);
            expect(partyStatServiceStub.updateVisitedTile.calledOnceWithExactly(data.partyId, data.coord)).to.equal(true);
        });

        it('should update doors manipulated for the party with DoorManipulated emitted', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                coord: { x: 3, y: 4 },
            };

            eventBus.emit(GameEventType.DoorManipulated, data);

            expect(partyStatServiceStub.updateManipulatedDoor.calledOnceWithExactly(data.partyId, data.coord)).to.equal(true);
        });

        it('should update the statistic field numberOfFights for players when BeginFight is emitted', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                attackerPid: 'attackerId',
                defenderPid: 'defenderId',
            };

            eventBus.emit(GameEventType.BeginFight, data);

            expect(
                playerStatServiceStub.updateStatisticField.calledWithExactly(
                    data.partyId,
                    data.attackerPid,
                    IncrementablePlayerStatisticFields.numberOfFights,
                ),
            ).to.equal(true);
            expect(
                playerStatServiceStub.updateStatisticField.calledWithExactly(
                    data.partyId,
                    data.defenderPid,
                    IncrementablePlayerStatisticFields.numberOfFights,
                ),
            ).to.equal(true);
        });

        it('should decrement total rounds when event RoundCount is emitted', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
            };

            eventBus.emit(GameEventType.RoundCount, data);

            expect(partyStatServiceStub.incrementTotalRounds.calledOnceWithExactly(data.partyId)).to.equal(true);
        });

        it('should update the flag holder name and items collected when item is a flag', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                item: ItemType.Flag,
                player: {
                    pid: 'playerId',
                    name: 'playerName',
                    character: undefined,
                    isOrganizer: false,
                    isGiveUp: false,
                    isCurrentPlayer: false,
                    speed: 0,
                    attack: 0,
                    defense: 0,
                    life: 0,
                    wins: 0,
                    items: [],
                    availableMoves: 0,
                    remainingAction: 0,
                    diceAssignment: undefined,
                    startPosition: undefined,
                    currentPosition: undefined,
                    previousPosition: undefined,
                },
            };

            eventBus.emit(GameEventType.ItemCount, data);

            expect(partyStatServiceStub.updateFlagHolderNames.calledOnceWithExactly(data.partyId, data.player.name)).to.equal(true);
            expect(playerStatServiceStub.updateObjectsCollected.calledOnceWithExactly(data.partyId, data.player.pid, data.item)).to.equal(true);
        });

        it('should update collected items when item is not a flag', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                item: ItemType.SwapOpponentLife,
                player: {
                    pid: 'playerId',
                    name: 'playerName',
                    character: undefined,
                    isOrganizer: false,
                    isGiveUp: false,
                    isCurrentPlayer: false,
                    speed: 0,
                    attack: 0,
                    defense: 0,
                    life: 0,
                    wins: 0,
                    items: [],
                    availableMoves: 0,
                    remainingAction: 0,
                    diceAssignment: undefined,
                    startPosition: undefined,
                    currentPosition: undefined,
                    previousPosition: undefined,
                },
            };

            eventBus.emit(GameEventType.ItemCount, data);

            expect(partyStatServiceStub.updateFlagHolderNames.notCalled).to.equal(true);
            expect(playerStatServiceStub.updateObjectsCollected.calledOnceWithExactly(data.partyId, data.player.pid, data.item)).to.equal(true);
        });

        it('should update players victory and defeat statistics when PlayerVictory is emitted', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                attackerPid: 'winnerId',
                defenderPid: 'loserId',
            };

            eventBus.emit(GameEventType.PlayerVictory, data);

            expect(
                playerStatServiceStub.updateStatisticField.calledWithExactly(
                    data.partyId,
                    data.attackerPid,
                    IncrementablePlayerStatisticFields.numberOfWins,
                ),
            ).to.equal(true);
            expect(
                playerStatServiceStub.updateStatisticField.calledWithExactly(
                    data.partyId,
                    data.defenderPid,
                    IncrementablePlayerStatisticFields.numberOfDefeats,
                ),
            ).to.equal(true);
        });

        it('should update damages dealt and health lost when a LifePointDamage event is emitted', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                attackerPid: 'attackerId',
                defenderPid: 'defenderId',
            };

            eventBus.emit(GameEventType.LifePointDamage, data);

            expect(
                playerStatServiceStub.updateStatisticField.calledWithExactly(
                    data.partyId,
                    data.attackerPid,
                    IncrementablePlayerStatisticFields.totalDamageDealt,
                ),
            ).to.equal(true);
            expect(
                playerStatServiceStub.updateStatisticField.calledWithExactly(
                    data.partyId,
                    data.defenderPid,
                    IncrementablePlayerStatisticFields.totalHealthLost,
                ),
            ).to.equal(true);
        });

        it('should update the count of escape when EscapeAttempt occurs', () => {
            const data: StatisticEventData = {
                partyId: 'partyId',
                attackerPid: 'playerId',
            };

            eventBus.emit(GameEventType.EscapeAttempt, data);

            expect(
                playerStatServiceStub.updateStatisticField.calledOnceWithExactly(
                    data.partyId,
                    data.attackerPid,
                    IncrementablePlayerStatisticFields.numberOfEscape,
                ),
            ).to.equal(true);
        });
    });

    describe('listenFightEventAndProcess', () => {
        const fightEvents: LogTypeEvent[] = [
            LogTypeEvent.StartCombat,
            LogTypeEvent.AttackTo,
            LogTypeEvent.DefenseFrom,
            LogTypeEvent.EscapeFrom,
            LogTypeEvent.EndFight,
            LogTypeEvent.EndFightWithoutWinner,
            LogTypeEvent.ComputeDiceAttackBonus,
            LogTypeEvent.ComputeDiceDefenseBonus,
        ];

        fightEvents.forEach((event) => {
            it(` should call addLog for the event: ${event}`, () => {
                const data: LogEventData = {
                    partyId: 'partyId',
                    logParameters: { event },
                    options: SendingOptions.Broadcast,
                };

                eventBus.emit(event, data);

                expect(partyLogsServiceStub.addLog.calledOnceWithExactly(data.partyId, data.logParameters, data.options)).to.equal(true);
            });
        });
    });
});
