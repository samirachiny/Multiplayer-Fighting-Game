/* eslint-disable no-redeclare */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { PlayerService } from './player.service';
import { PlayerInfos } from '@common/interfaces/player-infos';
import * as sinon from 'sinon';
import { ItemType } from '@common/enums/item';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { WsEventClient } from '@common/enums/web-socket-event';

describe('PlayerService', () => {
    let playerService: PlayerService;
    const partyId = 'party1';
    const playerId = 'player0';
    let player: PlayerInfos;
    let player1: PlayerInfos;
    let player2: PlayerInfos;
    let player3: PlayerInfos;
    let players: Map<string, PlayerInfos>;

    beforeEach(() => {
        player = {
            items: [],
            name: 'John',
            pid: 'player0',
            character: undefined,
            isOrganizer: false,
            speed: 0,
            attack: 0,
            defense: 0,
            life: 0,
            wins: 0,
            diceAssignment: undefined,
            isGiveUp: false,
            isCurrentPlayer: false,
            availableMoves: 0,
            remainingAction: 0,
            startPosition: undefined,
            currentPosition: undefined,
            previousPosition: undefined,
        };
        player1 = { ...player, pid: 'player1', name: 'Johnery', speed: 5 };
        player2 = { ...player, pid: 'player2', name: 'JohnyJunior', speed: 10 };
        player3 = { ...player, pid: 'player3', name: 'Johnyta', speed: 7 };
        players = new Map<string, PlayerInfos>([
            ['player1', player1],
            ['player2', player2],
            ['player3', player3],
        ]);
        playerService = new PlayerService();
        playerService['partiesPlayers'].set(partyId, players);
    });

    afterEach(() => {
        sinon.restore();
    });
    it('should initialize party players with an empty map', () => {
        playerService.initPartyPlayers('party12');
        expect(playerService['partiesPlayers'].get('party12')).to.deep.equal(new Map());
    });
    it('should set a player', () => {
        playerService.setPlayer(partyId, playerId, player);
        expect(playerService.getPlayer(partyId, playerId)).to.exist;
    });

    it('should remove a player', () => {
        playerService['partiesPlayers'].set(partyId, new Map());
        playerService.setPlayer(partyId, playerId, player);
        const result = playerService.removePlayer(partyId, playerId);
        expect(result).to.be.true;
        expect(playerService.getPlayer(partyId, playerId)).to.not.exist;
    });

    it('should get a player', () => {
        playerService.setPlayer(partyId, player1.pid, player);
        const result = playerService.getPlayer(partyId, player1.pid);
        expect(result).to.exist;
        expect(result.name).to.equal(player.name);
    });

    it('should get players in party', () => {
        const result = playerService.getPlayers(partyId);
        expect(result).to.include(player1);
        expect(result).to.include(player2);
        expect(result).to.include(player3);
    });
    it('should get players return empty array if party does not exist', () => {
        playerService['partiesPlayers'] = new Map();
        const result = playerService.getPlayers(partyId);
        expect(result).to.be.an('array').that.is.empty;
    });
    it('should get player return null if party does not exist', () => {
        playerService['partiesPlayers'] = new Map();
        const result = playerService.getPlayer(partyId, playerId);
        expect(result).to.be.null;
    });

    it('should return false if trying to remove a player from a party that does not exist', () => {
        playerService['partiesPlayers'] = new Map();
        const result = playerService.removePlayer(partyId, playerId);
        expect(result).to.be.false;
    });

    it('should return an empty array if party does not exist', () => {
        playerService['partiesPlayers'].set(partyId, new Map());
        const result = playerService.getPlayers(partyId);
        expect(result).to.be.an('array').that.is.empty;
    });

    describe('getOrderPlayers', () => {
        it('should return players ordered by speed', () => {
            const orderedPlayers = playerService.getOrderPlayers(partyId);
            expect(orderedPlayers).to.deep.equal(playerService.getPlayers(partyId).sort((player11, player12) => player12.speed - player11.speed));
        });
    });

    describe('setCurrentPlayer', () => {
        it('should set current player status', () => {
            playerService.setCurrentPlayer(partyId, player1.pid, true);
            const updatedPlayer = playerService.getPlayer(partyId, player1.pid);
            expect(updatedPlayer).to.exist;
            expect(updatedPlayer?.isCurrentPlayer).to.be.true;
        });

        it('should not set current player status if player does not exist', () => {
            playerService['partiesPlayers'].set(partyId, new Map());

            playerService.setCurrentPlayer(partyId, playerId, true);

            const updatedPlayer = playerService.getPlayer(partyId, playerId);
            expect(updatedPlayer).to.not.exist;
        });
    });

    describe('setPlayerGiveUp', () => {
        it('should set player give up status', () => {
            playerService.setPlayerGiveUp(partyId, player1.pid);
            const updatedPlayer = playerService.getPlayer(partyId, player1.pid);
            expect(updatedPlayer).to.exist;
            expect(updatedPlayer?.isGiveUp).to.be.true;
        });

        it('should not set player give up status if player does not exist', () => {
            playerService['partiesPlayers'].set(partyId, new Map());

            playerService.setPlayerGiveUp(partyId, playerId);

            const updatedPlayer = playerService.getPlayer(partyId, playerId);
            expect(updatedPlayer).to.not.exist;
        });
    });

    describe('setPlayerAvailableMove', () => {
        it('should set player available moves', () => {
            const availableMoves = 3;
            playerService.setPlayerAvailableMove(partyId, player1.pid, availableMoves);
            const updatedPlayer = playerService.getPlayer(partyId, player1.pid);
            expect(updatedPlayer).to.exist;
            expect(updatedPlayer?.availableMoves).to.equal(availableMoves);
        });

        it('should not set available moves if player does not exist', () => {
            const availableMoves = 3;
            playerService['partiesPlayers'].set(partyId, new Map());

            playerService.setPlayerAvailableMove(partyId, playerId, availableMoves);

            const updatedPlayer = playerService.getPlayer(partyId, playerId);
            expect(updatedPlayer).to.not.exist;
        });
    });

    describe('increaseWinCount', () => {
        it('should increment the win count of an existing player', () => {
            const initialWins = player1.wins;
            const newWinCount = playerService.addToWinCount(partyId, player1.pid, 1);
            expect(newWinCount).to.equal(initialWins + 1);
            expect(playerService.getPlayer(partyId, player1.pid)?.wins).to.equal(initialWins + 1);
        });

        it('should return 0 if the player does not exist in the party', () => {
            const newWinCount = playerService.addToWinCount(partyId, 'nonExistentPlayerId', 1);
            expect(newWinCount).to.equal(0);
        });

        it('should return 0 if the party does not exist', () => {
            const newWinCount = playerService.addToWinCount('nonExistentPartyId', playerId, 1);
            expect(newWinCount).to.equal(0);
        });

        it('should return 0 if total is negative', () => {
            players.set(player1.pid, { ...player1, wins: 0 });
            const newWinCount = playerService.addToWinCount(partyId, player1.pid, -1);
            expect(newWinCount).to.equal(0);
        });
    });

    describe('decrementRemainingAction', () => {
        it('should decrement player remaining action', () => {
            const initialRemainingAction = 2;
            playerService['partiesPlayers'].set(partyId, new Map([[playerId, { ...player, remainingAction: initialRemainingAction }]]));

            playerService.decrementRemainingAction(partyId, playerId);

            const updatedPlayer = playerService.getPlayer(partyId, playerId);
            expect(updatedPlayer).to.exist;
            expect(updatedPlayer?.remainingAction).to.equal(initialRemainingAction - 1);
        });

        it('should not decrement remaining action if player does not exist', () => {
            playerService['partiesPlayers'].set(partyId, new Map());

            playerService.decrementRemainingAction(partyId, playerId);

            const updatedPlayer = playerService.getPlayer(partyId, playerId);
            expect(updatedPlayer).to.not.exist;
        });
    });

    describe('resetAttributePlayer', () => {
        it('should reset player attributes', () => {
            const playerSpeed = 5;
            playerService['partiesPlayers'].set(
                partyId,
                new Map([[playerId, { ...player, speed: playerSpeed, remainingAction: 0, availableMoves: 0 }]]),
            );

            playerService.resetAttributePlayer(partyId, playerId);

            const updatedPlayer = playerService.getPlayer(partyId, playerId);
            expect(updatedPlayer).to.exist;
            expect(updatedPlayer?.remainingAction).to.equal(1);
            expect(updatedPlayer?.availableMoves).to.equal(playerSpeed);
        });

        it('should not reset attributes if player does not exist', () => {
            playerService['partiesPlayers'].set(partyId, new Map());

            playerService.resetAttributePlayer(partyId, playerId);

            const updatedPlayer = playerService.getPlayer(partyId, playerId);
            expect(updatedPlayer).to.not.exist;
        });
    });

    describe('updatePlayerPosition', () => {
        it('should update player position', () => {
            const initialCurrentPosition = { x: 1, y: 1 };
            const newPosition = { x: 2, y: 3 };
            playerService['partiesPlayers'].set(partyId, new Map([[playerId, { ...player, currentPosition: initialCurrentPosition }]]));

            playerService.updatePlayerPosition(partyId, playerId, newPosition);

            const updatedPlayer = playerService.getPlayer(partyId, playerId);
            expect(updatedPlayer).to.exist;
            expect(updatedPlayer?.previousPosition).to.deep.equal(initialCurrentPosition);
            expect(updatedPlayer?.currentPosition).to.deep.equal({ x: newPosition.y, y: newPosition.x }); // Swapped x and y
        });

        it('should not update position if player does not exist', () => {
            const newPosition = { x: 2, y: 3 };
            playerService['partiesPlayers'].set(partyId, new Map());

            playerService.updatePlayerPosition(partyId, playerId, newPosition);

            const updatedPlayer = playerService.getPlayer(partyId, playerId);
            expect(updatedPlayer).to.not.exist;
        });
    });
    it("should add an item to the player's items", () => {
        const item = ItemType.Flag;
        playerService.addPlayerItem(partyId, player1.pid, item);
        expect(playerService.getPlayer(partyId, player1.pid)?.items).to.include(item);
    });
    it("should remove an item from the player's items", () => {
        const item = ItemType.Flag;
        player1 = { ...player1, items: [item] };
        playerService['partiesPlayers'].set(partyId, new Map([[playerId, player1]]));
        playerService.removePlayerItem(partyId, playerId, item);
        expect(player1.items).to.not.include(item);
    });
    it("should not add an item to the player's items if no player", () => {
        const item = ItemType.SwapOpponentLife;
        playerService.addPlayerItem(partyId, playerId, item);
    });
    it("should not remove an item from the player's items if no player", () => {
        const item = ItemType.BoostDefense;
        playerService.removePlayerItem(partyId, playerId, item);
    });
    it("should remove all the items from the player's items", () => {
        const items = [ItemType.BoostDefense, ItemType.DoubleIceBreak];
        player1 = { ...player1, items, hasFlag: true };
        playerService['partiesPlayers'].set(partyId, new Map([[playerId, player1]]));
        playerService.removeAllPlayerItem(partyId, playerId);
        expect(player1.items).to.not.include(items[0]);
        expect(player1.items).to.not.include(items[1]);
    });
    it("should not remove all the items from the player's items if no player", () => {
        playerService.removeAllPlayerItem(partyId, playerId);
    });
    it("should get the items from the player's items", () => {
        const items = [ItemType.BoostDefense, ItemType.DoubleIceBreak];
        player1 = { ...player1, items };
        playerService['partiesPlayers'].set(partyId, new Map([[playerId, player1]]));
        const returnedItems = playerService.getPlayerItems(partyId, playerId);
        expect(returnedItems).to.equal(items);
    });
    it('should getPlayerItems return empty array if no player', () => {
        const returnedItems = playerService.getPlayerItems(partyId, playerId);
        expect(returnedItems).to.be.an('array').that.is.empty;
    });
    it('should deletePartyPlayers delete partyPlayers', () => {
        playerService.deletePartyPlayers(partyId);
        expect(playerService['partiesPlayers'].get(partyId)).to.be.undefined;
    });

    it('should changeFlagOwnerIfFlagExistFor change flag owner partyPlayers', () => {
        const sendStub = sinon.stub(PartyHelper as any, 'sendEvent');
        playerService.changeFlagOwnerIfFlagExistFor(partyId, player1, true);
        expect(player1.hasFlag).to.be.true;
        expect(sendStub.calledWith(partyId, WsEventClient.PlayerListUpdated, players));
    });
});
