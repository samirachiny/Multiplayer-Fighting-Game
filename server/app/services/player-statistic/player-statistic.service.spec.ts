/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { PlayerStatisticService } from '@app/services/player-statistic/player-statistic.service';
import { PlayerStatisticData } from '@common/interfaces/player-statistic-data';
import { IncrementablePlayerStatisticFields } from '@common/enums/incrementable-player-statistic';
import { Coordinate } from '@common/interfaces/coordinate';
import { coordinateToString } from '@app/utils/helper';
import { ItemType } from '@common/enums/item';

describe('PlayerStatisticService', () => {
    let playerStatisticService: PlayerStatisticService;

    beforeEach(() => {
        playerStatisticService = new PlayerStatisticService();
        playerStatisticService['partiesPlayerStatistics'] = new Map<string, Map<string, PlayerStatisticData>>();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('initPartyPlayerStatistics', () => {
        it('should initialize player statistics for a party', () => {
            const partyId = 'party1';
            playerStatisticService.initPartyPlayerStatistics(partyId);
            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            expect(playerStatistics).to.be.instanceOf(Map);
        });
    });

    describe('setPlayerStatistic', () => {
        it('should set player statistics for a player', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const playerName = 'Player One';

            playerStatisticService.initPartyPlayerStatistics(partyId);
            playerStatisticService.setPlayerStatistic(partyId, playerId, playerName);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            const playerStatistic = playerStatistics?.get(playerId);

            expect(playerStatistic).to.exist;
            expect(playerStatistic?.displayablePlayerStatistic.playerName).to.equal(playerName);
        });

        it('should not set player statistics if party does not exist', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const playerName = 'Player One';

            playerStatisticService.setPlayerStatistic(partyId, playerId, playerName);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            expect(playerStatistics).to.be.undefined;
        });
    });

    describe('deletePlayerStatistics', () => {
        it('should delete player statistics for a party', () => {
            const partyId = 'party1';

            playerStatisticService.initPartyPlayerStatistics(partyId);
            playerStatisticService.deletePlayerStatistics(partyId);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            expect(playerStatistics).to.be.undefined;
        });
    });

    describe('deletePlayerStatistic', () => {
        it('should delete player statistics for a player', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const playerName = 'Player One';

            playerStatisticService.initPartyPlayerStatistics(partyId);
            playerStatisticService.setPlayerStatistic(partyId, playerId, playerName);
            playerStatisticService.deletePlayerStatistic(partyId, playerId);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            const playerStatistic = playerStatistics?.get(playerId);

            expect(playerStatistic).to.be.undefined;
        });

        it('should not delete player statistics if party does not exist', () => {
            const partyId = 'party1';
            const playerId = 'player1';

            playerStatisticService.deletePlayerStatistic(partyId, playerId);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            expect(playerStatistics).to.be.undefined;
        });
    });

    describe('updateVisitedTile', () => {
        it('should update visited tiles for a player', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const playerName = 'Player One';
            const pos: Coordinate = { x: 1, y: 1 };

            playerStatisticService.initPartyPlayerStatistics(partyId);
            playerStatisticService.setPlayerStatistic(partyId, playerId, playerName);
            playerStatisticService.updateVisitedTile(partyId, playerId, pos);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            const playerStatistic = playerStatistics?.get(playerId);

            expect(playerStatistic?.visitedTile.has(coordinateToString(pos))).to.be.true;
        });

        it('should not update visited tiles if player statistics do not exist', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const pos: Coordinate = { x: 1, y: 1 };

            playerStatisticService.updateVisitedTile(partyId, playerId, pos);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            expect(playerStatistics).to.be.undefined;
        });
    });

    describe('updateObjectsCollected', () => {
        it('should update objects collected for a player', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const playerName = 'Player One';
            const item = ItemType.BoostAttack;

            playerStatisticService.initPartyPlayerStatistics(partyId);
            playerStatisticService.setPlayerStatistic(partyId, playerId, playerName);
            playerStatisticService.updateObjectsCollected(partyId, playerId, item);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            const playerStatistic = playerStatistics?.get(playerId);

            expect(playerStatistic?.objectsCollected.has(item)).to.be.true;
        });

        it('should not update objects collected if player statistics do not exist', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const item = ItemType.BoostAttack;

            playerStatisticService.updateObjectsCollected(partyId, playerId, item);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            expect(playerStatistics).to.be.undefined;
        });
    });

    describe('updateStatisticField', () => {
        it('should update a statistic field for a player', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const playerName = 'Player One';
            const field: IncrementablePlayerStatisticFields = IncrementablePlayerStatisticFields.numberOfFights;

            playerStatisticService.initPartyPlayerStatistics(partyId);
            playerStatisticService.setPlayerStatistic(partyId, playerId, playerName);
            playerStatisticService.updateStatisticField(partyId, playerId, field);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            const playerStatistic = playerStatistics?.get(playerId);

            expect(playerStatistic?.displayablePlayerStatistic[field]).to.equal(1);
        });

        it('should not update a statistic field if player statistics do not exist', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const field: IncrementablePlayerStatisticFields = IncrementablePlayerStatisticFields.numberOfFights;

            playerStatisticService.updateStatisticField(partyId, playerId, field);

            const playerStatistics = playerStatisticService['partiesPlayerStatistics'].get(partyId);
            expect(playerStatistics).to.be.undefined;
        });
    });

    describe('getPlayerStatistics', () => {
        it('should return player statistics for a party', () => {
            const partyId = 'party1';
            const playerId = 'player1';
            const playerName = 'Player One';

            playerStatisticService.initPartyPlayerStatistics(partyId);
            playerStatisticService.setPlayerStatistic(partyId, playerId, playerName);

            const playerStatistics = playerStatisticService.getPlayerStatistics(partyId);

            expect(playerStatistics).to.have.lengthOf(1);
            expect(playerStatistics[0].displayablePlayerStatistic.playerName).to.equal(playerName);
        });

        it('should return an empty array if party statistics do not exist', () => {
            const partyId = 'party1';

            const playerStatistics = playerStatisticService.getPlayerStatistics(partyId);

            expect(playerStatistics).to.be.empty;
        });
    });
});
