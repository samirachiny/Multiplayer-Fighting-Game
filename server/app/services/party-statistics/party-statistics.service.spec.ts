/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { PartyStatisticsService } from './party-statistics.service';
import { PartyService } from '@app/services/party/party.service';
import { PlayerStatisticService } from '@app/services/player-statistic/player-statistic.service';
import { PartyStatisticData } from '@common/interfaces/party-statistics';
import { coordinateToString } from '@app/utils/helper';

describe('PartyStatisticsService', () => {
    let partyStatisticsService: PartyStatisticsService;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    let playerStatServiceStub: sinon.SinonStubbedInstance<PlayerStatisticService>;

    beforeEach(() => {
        partyServiceStub = sinon.createStubInstance(PartyService);
        playerStatServiceStub = sinon.createStubInstance(PlayerStatisticService);

        partyStatisticsService = new PartyStatisticsService(
            partyServiceStub as any as PartyService,
            playerStatServiceStub as any as PlayerStatisticService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('initializePartyStatistic', () => {
        it('should initialize party statistics and call playerStatService.initPartyPlayerStatistics', () => {
            const partyId = 'party-123';
            partyStatisticsService.initializePartyStatistic(partyId);

            expect(playerStatServiceStub.initPartyPlayerStatistics.calledOnceWith(partyId)).to.be.true;
            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.exist;
            expect(stats.totalRounds).to.equal(0);
        });

        it('should not re-initialize if statistics already exist for the party', () => {
            const partyId = 'party-123';
            partyStatisticsService.initializePartyStatistic(partyId);
            const initialStats = (partyStatisticsService as any).partyStatistics.get(partyId);

            partyStatisticsService.initializePartyStatistic(partyId);
            const statsAfterReinit = (partyStatisticsService as any).partyStatistics.get(partyId);

            expect(statsAfterReinit).to.equal(initialStats);
            expect(playerStatServiceStub.initPartyPlayerStatistics.calledOnceWith(partyId)).to.be.true;
        });
    });

    describe('deletePartyStatistic', () => {
        it('should delete party statistics and call playerStatService.deletePlayerStatistics', () => {
            const partyId = 'party-123';
            partyStatisticsService.initializePartyStatistic(partyId);
            partyStatisticsService.deletePartyStatistic(partyId);

            expect(playerStatServiceStub.deletePlayerStatistics.calledOnceWith(partyId)).to.be.true;
            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.be.undefined;
        });

        it('should handle deletion when stats do not exist for the given partyId', () => {
            const partyId = 'non-existent-party';

            expect(() => partyStatisticsService.deletePartyStatistic(partyId)).to.not.throw();
            expect(playerStatServiceStub.deletePlayerStatistics.calledOnceWith(partyId)).to.be.true;
        });
    });

    describe('updateTotalWalkableTile', () => {
        it('should update the total walkable tiles for a party', () => {
            const partyId = 'party-123';
            const totalWalkableTile = 100;
            partyStatisticsService.initializePartyStatistic(partyId);
            partyStatisticsService.updateTotalWalkableTile(partyId, totalWalkableTile);

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats.totalWalkableTile).to.equal(totalWalkableTile);
        });

        it('should return early if stats do not exist for the given partyId', () => {
            const partyId = 'non-existent-party';
            const totalWalkableTile = 100;

            expect(() => partyStatisticsService.updateTotalWalkableTile(partyId, totalWalkableTile)).to.not.throw();
            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.be.undefined;
        });
    });

    describe('updateVisitedTile', () => {
        it('should add a visited tile to the party statistics', () => {
            const partyId = 'party-123';
            const coordinate = { x: 1, y: 2 };
            partyStatisticsService.initializePartyStatistic(partyId);
            partyStatisticsService.updateVisitedTile(partyId, coordinate);

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats.tilesVisited.has(coordinateToString(coordinate))).to.be.true;
        });

        it('should return early if stats do not exist', () => {
            const partyId = 'non-existent-party';
            const coordinate = { x: 1, y: 2 };

            expect(() => partyStatisticsService.updateVisitedTile(partyId, coordinate)).to.not.throw();

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.be.undefined;
        });

        it('should return early if stats do not exist for the given partyId', () => {
            const partyId = 'non-existent-party';
            const totalWalkableTile = 100;
            expect(() => partyStatisticsService.updateTotalWalkableTile(partyId, totalWalkableTile)).to.not.throw();
            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.be.undefined;
        });
    });

    describe('calculateVisitedTilesPercentage', () => {
        it('should calculate the correct percentage of visited tiles', () => {
            const partyId = 'party-123';
            partyStatisticsService.initializePartyStatistic(partyId);
            partyStatisticsService.updateTotalWalkableTile(partyId, 10);
            partyStatisticsService.updateVisitedTile(partyId, { x: 1, y: 2 });
            partyStatisticsService.updateVisitedTile(partyId, { x: 3, y: 4 });

            const percentage = partyStatisticsService.calculateVisitedTilesPercentage(partyId);
            expect(percentage).to.equal(20);
        });

        it('should return 0 if totalWalkableTile is 0', () => {
            const partyId = 'party-123';
            partyStatisticsService.initializePartyStatistic(partyId);

            const percentage = partyStatisticsService.calculateVisitedTilesPercentage(partyId);
            expect(percentage).to.equal(0);
        });

        it('should return 0 if stats do not exist for the given partyId', () => {
            const partyId = 'non-existent-party';

            const percentage = partyStatisticsService.calculateVisitedTilesPercentage(partyId);
            expect(percentage).to.equal(0);
        });
    });

    describe('getPartyStatistic', () => {
        it('should return correct statistics for an existing party with flagHolderNames', () => {
            const partyId = 'party-1';
            const mockStats: PartyStatisticData = {
                totalRounds: 10,
                tilesVisited: new Set<string>(['1,1', '2,2']),
                doorsManipulated: new Set<string>(['3,3']),
                totalWalkableTile: 20,
                totalDoor: 5,
                flagHolderNames: new Set<string>(['Player1', 'Player2']),
                winner: 'Player1',
            };

            const mockPlayerStats = [
                {
                    visitedTile: new Set<string>(['1,1']),
                    objectsCollected: new Set<number>([1]),
                    displayablePlayerStatistic: {
                        playerName: 'Player1',
                        percentageOfMapTilesVisited: 0,
                        numberOfObjectsCollected: 0,
                        numberOfFights: 3,
                        numberOfEscapes: 1,
                        numberOfWins: 2,
                        numberOfDefeats: 1,
                        totalHealthLost: 50,
                        totalDamageDealt: 100,
                    },
                },
            ];

            (partyStatisticsService as any).partyStatistics.set(partyId, mockStats);
            playerStatServiceStub.getPlayerStatistics.withArgs(partyId).returns(mockPlayerStats as any);
            partyServiceStub.getPartyDuration.withArgs(partyId).returns('10:00');

            const result = partyStatisticsService.getPartyStatistic(partyId);

            expect(result).to.deep.equal({
                winner: 'Player1',
                totalDuration: '10:00',
                totalRounds: 10,
                visitedTilesPercentage: 10,
                manipulatedDoorsPercentage: 20,
                flagHoldersCount: 2,
                displayPlayerStatistics: [
                    {
                        playerName: 'Player1',
                        percentageOfMapTilesVisited: 5,
                        numberOfObjectsCollected: 1,
                        numberOfFights: 3,
                        numberOfEscapes: 1,
                        numberOfWins: 2,
                        numberOfDefeats: 1,
                        totalHealthLost: 50,
                        totalDamageDealt: 100,
                    },
                ],
            });
        });

        it('should return null if stats do not exist for the given partyId', () => {
            const partyId = 'non-existent-party';

            const result = partyStatisticsService.getPartyStatistic(partyId);

            expect(result).to.be.null;
        });
    });

    describe('getDisplayPlayerStatistics', () => {
        it('should return null if stats do not exist for the given partyId', () => {
            const partyId = 'non-existent-party';
            const result = (partyStatisticsService as any).getDisplayPlayerStatistics(partyId);
            expect(result).to.be.null;
        });
    });

    describe('updateManipulatedDoor', () => {
        it('should add the door position to doorsManipulated if stats exist', () => {
            const partyId = 'party-1';
            const mockPos = { x: 1, y: 2 };
            partyStatisticsService.initializePartyStatistic(partyId);

            partyStatisticsService.updateManipulatedDoor(partyId, mockPos);

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats.doorsManipulated.has('1,2')).to.be.true;
        });

        it('should return early if stats do not exist', () => {
            const partyId = 'non-existent-party';
            const mockPos = { x: 1, y: 2 };

            expect(() => partyStatisticsService.updateManipulatedDoor(partyId, mockPos)).to.not.throw();

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.be.undefined;
        });
    });

    describe('updateFlagHolderNames', () => {
        it('should add player name to flagHolderNames if stats exist', () => {
            const partyId = 'party-1';
            const playerName = 'Player1';
            partyStatisticsService.initializePartyStatistic(partyId);

            partyStatisticsService.updateFlagHolderNames(partyId, playerName);

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats.flagHolderNames.has(playerName)).to.be.true;
        });

        it('should return early if stats do not exist', () => {
            const partyId = 'non-existent-party';
            const playerName = 'Player1';

            expect(() => partyStatisticsService.updateFlagHolderNames(partyId, playerName)).to.not.throw();

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.be.undefined;
        });
    });

    describe('updateWinner', () => {
        it('should set winner name if stats exist', () => {
            const partyId = 'party-1';
            const playerName = 'Player1';
            partyStatisticsService.initializePartyStatistic(partyId);
            partyStatisticsService.updateWinner(partyId, playerName);
            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats.winner).to.equal(playerName);
        });

        it('should return early if stats do not exist', () => {
            const partyId = 'non-existent-party';
            const playerName = 'Player1';
            expect(() => partyStatisticsService.updateWinner(partyId, playerName)).to.not.throw();
            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.be.undefined;
        });
    });

    describe('incrementTotalRounds', () => {
        it('should increment totalRounds if stats exist for the given partyId', () => {
            const partyId = 'party-1';
            partyStatisticsService.initializePartyStatistic(partyId);

            partyStatisticsService.incrementTotalRounds(partyId);

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats.totalRounds).to.equal(1);
        });

        it('should return early if stats do not exist', () => {
            const partyId = 'non-existent-party';

            expect(() => partyStatisticsService.incrementTotalRounds(partyId)).to.not.throw();

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.be.undefined;
        });
    });

    describe('deletePlayerStatistic', () => {
        it('should call playerStatService.deletePlayerStatistic with correct parameters', () => {
            const partyId = 'party-123';
            const playerId = 'player-456';

            partyStatisticsService.deletePlayerStatistic(partyId, playerId);

            expect(playerStatServiceStub.deletePlayerStatistic.calledOnceWith(partyId, playerId)).to.be.true;
        });
    });

    describe('setPlayerStatistic', () => {
        it('should call playerStatService.setPlayerStatistic with correct parameters', () => {
            const partyId = 'party-123';
            const playerId = 'player-456';
            const playerName = 'Player1';

            partyStatisticsService.setPlayerStatistic(partyId, playerId, playerName);

            expect(playerStatServiceStub.setPlayerStatistic.calledOnceWith(partyId, playerId, playerName)).to.be.true;
        });
    });

    describe('updateTotalDoor', () => {
        it('should update totalDoor when stats exist', () => {
            const partyId = 'party-123';
            const totalDoor = 10;
            partyStatisticsService.initializePartyStatistic(partyId);

            partyStatisticsService.updateTotalDoor(partyId, totalDoor);

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats.totalDoor).to.equal(totalDoor);
        });

        it('should return early if stats do not exist', () => {
            const partyId = 'non-existent-party';
            const totalDoor = 10;

            expect(() => partyStatisticsService.updateTotalDoor(partyId, totalDoor)).to.not.throw();

            const stats = (partyStatisticsService as any).partyStatistics.get(partyId);
            expect(stats).to.be.undefined;
        });
    });
});
