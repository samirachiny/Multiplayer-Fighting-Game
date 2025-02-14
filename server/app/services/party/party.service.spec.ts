/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-redeclare */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { PartyService } from './party.service';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { GameService } from '@app/services/game/game.service';
import { GameMapSize, GameMode } from '@common/enums/game-infos';
import * as sinon from 'sinon';
import { MAP_SIZE_TO_MAX_PLAYERS } from '@common/constants/map-size-to-max-players';
import { ChatMessage } from '@common/interfaces/chat-message';
import { Coordinate } from '@common/interfaces/coordinate';
import { GameLogs } from '@common/interfaces/game-logs';
import { LogTypeEvent } from '@common/enums/log-type';
import { PlayerService } from '@app/services/player/player.service';
import { ItemService } from '@app/services/item/item.service';
import { ItemType } from '@common/enums/item';
import { Party } from '@common/interfaces/party';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { BASE_TILE_DECIMAL } from '@app/utils/const';
import { TileType } from '@common/enums/tile';

describe('PartyService', () => {
    let partyService: PartyService;
    const partyId = 'party1';
    const playerId = 'player1';
    const player: PlayerInfos = {
        items: [],
        name: 'John',
        pid: 'player1',
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
    const characters = new Map<string, number>([['player1', 1]]);
    const game = {
        gid: 'game1',
        mode: GameMode.Classic,
        mapSize: GameMapSize.Medium,
        name: '',
        description: '',
        creationDate: new Date(),
        lastEditDate: new Date(),
        imageBase64: '',
        isVisible: false,
        gameMap: [[1, 1]],
    };
    const party: Party = {
        charactersOccupiedIds: characters,
        id: '',
        chatMessages: [] as ChatMessage[],
        game,
        isLocked: false,
        accessCode: 0,
        isDebugMode: false,
        logs: [],
        hasDoubleIceBreakEffect: false,
        hasDecreaseLoserWinsEffect: false,
    };
    let gameServiceStub: sinon.SinonStubbedInstance<GameService>;
    let playerServiceStub: sinon.SinonStubbedInstance<PlayerService>;
    let itemServiceStub: sinon.SinonStubbedInstance<ItemService>;

    beforeEach(() => {
        gameServiceStub = sinon.createStubInstance(GameService);
        playerServiceStub = sinon.createStubInstance(PlayerService);
        itemServiceStub = sinon.createStubInstance(ItemService);
        playerServiceStub['partiesPlayers'] = new Map();
        partyService = new PartyService(gameServiceStub, playerServiceStub, itemServiceStub);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should create a party', async () => {
        const gameId = 'game1';
        gameServiceStub.getGameById.resolves(game);
        const result = await partyService.createParty(partyId, gameId);
        expect(result).to.be.true;
        expect(partyService.getParty(partyId)).to.exist;
    });

    it('should create a party if game mode is Flag', async () => {
        const gameId = 'game1';
        gameServiceStub.getGameById.resolves({ ...game, mode: GameMode.Flag });
        const result = await partyService.createParty(partyId, gameId);
        expect(result).to.be.true;
        expect(partyService.getParty(partyId)).to.exist;
    });

    it('should replace character occupied', () => {
        const oldCharacterId = 1;
        const newCharacterId = 2;
        partyService['parties'].set(partyId, party as any);
        partyService.createParty(partyId, 'game1');
        partyService.getParty(partyId).charactersOccupiedIds.set(playerId, oldCharacterId);
        const result = partyService.replaceCharacterOccupied(partyId, playerId, newCharacterId);
        expect(result).to.be.true;
        expect(partyService.getCharactersOccupied(partyId)).to.include(newCharacterId);
        expect(partyService.getCharactersOccupied(partyId)).to.not.include(oldCharacterId);
    });

    it('should replace character occupied return false if party does not exist', () => {
        const newCharacterId = 2;
        const result = partyService.replaceCharacterOccupied(partyId, playerId, newCharacterId);
        expect(result).to.be.false;
    });

    describe('setPlayer', () => {
        it('should set a player and return true if party not full', () => {
            sinon.stub(partyService, 'isPartyFull').returns(false);
            const result = partyService.setPlayer(partyId, playerId, player);
            expect(playerServiceStub.setPlayer.called).to.equal(true);
            expect(result).to.be.true;
        });

        it('should not set a player and return false if party full', () => {
            sinon.stub(partyService, 'isPartyFull').returns(true);
            const result = partyService.setPlayer(partyId, playerId, player);
            expect(playerServiceStub.setPlayer.called).to.equal(false);
            expect(result).to.be.false;
        });
    });

    describe('removePlayer', () => {
        it('should not remove a player and return false if party not exist', () => {
            partyService['parties'].set(partyId, {
                ...party,
                logs: [],
                isDebugMode: false,
            });
            const result = partyService.removePlayer('partyId45', playerId);
            expect(result).to.be.false;
        });

        it('should remove a player and return true', () => {
            partyService['parties'].set(partyId, {
                ...party,
                logs: [],
                isDebugMode: false,
            });
            partyService.removePlayer(partyId, playerId);
            expect(playerServiceStub.removePlayer.calledWith(partyId, playerId)).to.equal(true);
        });
    });

    it('should get party with access code', async () => {
        const accessCode = 1234;
        const gameId = 'game1';
        gameServiceStub.getGameById.resolves(game);
        await partyService.createParty(partyId, gameId);
        partyService.getParty(partyId).accessCode = accessCode;
        const result = partyService.getPartyWithAccessCode(accessCode);
        expect(result).to.exist;
        expect(result.id).to.equal(partyId);
    });

    it('should get characters occupied', () => {
        const characterId = 1;
        const party1 = { ...party, charactersOccupiedIds: new Map() };
        party1.charactersOccupiedIds.set(playerId, characterId);
        partyService['parties'].set(partyId, party1 as any);
        const result = partyService.getCharactersOccupied(partyId);
        expect(result).to.include(characterId);
    });

    it('should check if party is full', () => {
        playerServiceStub.getPlayers.returns(
            Array(MAP_SIZE_TO_MAX_PLAYERS[game.mapSize])
                .fill(null)
                .map(() => player),
        );
        partyService['parties'].set(partyId, party as any);
        const result = partyService.isPartyFull(partyId);
        expect(result).to.be.true;
    });

    it('should delete a party', () => {
        partyService['parties'].set(partyId, party as any);
        partyService.deleteParty(partyId);
        expect(partyService['parties'].get(partyId)).to.not.exist;
    });

    it('should add message to chat', () => {
        const message: ChatMessage = { message: 'Hello, world!', senderName: 'user1', timestamp: new Date() };
        partyService['parties'].set(partyId, party as any);
        partyService.addMessageToChat(partyId, message);
        const chatMessages = partyService['parties'].get(partyId)?.chatMessages;
        expect(chatMessages).to.include(message);
    });

    it('should get chat messages', () => {
        const message: ChatMessage = { message: 'Hello, world!', senderName: 'user1', timestamp: new Date() };
        partyService['parties'].set(partyId, { ...party, chatMessages: [message] } as any);
        const result = partyService.getChatMessages(partyId);
        expect(result).to.include(message);
    });

    it('should get a player', () => {
        partyService['parties'].set(partyId, party as any);
        partyService.getPlayer(partyId, playerId);
        expect(playerServiceStub.getPlayer.calledWith(partyId, playerId)).to.equal(true);
    });

    it('should set lock on party', () => {
        const isLocked = true;
        partyService['parties'].set(partyId, party as any);
        partyService.setLock(partyId, isLocked);
        const partyModified = partyService['parties'].get(partyId);
        expect(partyModified.isLocked).to.equal(isLocked);
    });

    it('should get players in party', () => {
        playerServiceStub.getPlayers.returns([player]);
        const result = partyService.getPlayers(partyId);
        expect(result).to.include(player);
    });

    it('should return null if no party with access code', () => {
        const accessCode = 1234;
        const result = partyService.getPartyWithAccessCode(accessCode);
        expect(result).to.be.null;
    });

    it('should return an empty array if no characters are occupied', () => {
        partyService['parties'].set(partyId, { ...party, charactersOccupiedIds: new Map() } as any);
        const result = partyService.getCharactersOccupied(partyId);
        expect(result).to.be.an('array').that.is.empty;
    });

    it('should return false if trying to set a player when party is full', async () => {
        playerServiceStub.getPlayers.returns(
            Array(MAP_SIZE_TO_MAX_PLAYERS[game.mapSize])
                .fill(null)
                .map(() => player),
        );
        partyService['parties'].set(partyId, party as any);

        const newPlayerId = 'player2';
        const newPlayer: PlayerInfos = {
            items: [],
            name: 'Jane',
            pid: 'player2',
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
        const result = partyService.setPlayer(partyId, newPlayerId, newPlayer);
        expect(result).to.be.false;
    });

    it('should not add a chat message and return null if party does not exist', () => {
        const message: ChatMessage = { message: 'Hello, world!', senderName: 'user1', timestamp: new Date() };
        partyService.addMessageToChat(partyId, message);
        const partyModified = partyService['parties'].get(partyId);
        expect(partyModified).to.be.undefined;
    });

    it('should get chat messages return null if party does not exist', () => {
        const result = partyService.getChatMessages(partyId);
        expect(result).to.be.null;
    });

    it('should return false if trying to remove a player from a party that does not exist', () => {
        const result = partyService.removePlayer(partyId, playerId);
        expect(result).to.be.false;
    });

    it('should not set lock if party does not exist', () => {
        const isLocked = true;
        partyService.setLock(partyId, isLocked);
        const partyModified = partyService['parties'].get(partyId);
        expect(partyModified).to.be.undefined;
    });

    describe('addLog', () => {
        it('should add a log to the party', () => {
            const log: GameLogs = {
                type: LogTypeEvent.BeginParty,
                message: 'Début de la partie',
                time: new Date(),
            };
            partyService['parties'].set(partyId, { ...party, logs: [] } as any);

            partyService.addLog(partyId, log);

            const partyModified = partyService.getParty(partyId);
            expect(partyModified).to.exist;
            expect(partyModified?.logs).to.include(log);
        });

        it('should not add a log if party does not exist', () => {
            const log: GameLogs = {
                type: LogTypeEvent.BeginParty,
                message: 'Début de la partie',
                time: new Date(),
            };

            partyService.addLog(partyId, log);

            const partyModified = partyService.getParty(partyId);
            expect(partyModified).to.not.exist;
        });
    });

    describe('getLogs', () => {
        it('should get logs of the party', () => {
            const log: GameLogs = {
                type: LogTypeEvent.BeginParty,
                message: 'Début de la partie',
                time: new Date(),
            };
            partyService['parties'].set(partyId, { ...party, logs: [log] } as any);

            const logs = partyService.getLogs(partyId, 'player1');

            expect(logs).to.include(log);
        });

        it('should return empty array if party does not exist', () => {
            const logs = partyService.getLogs(partyId, 'player1');

            expect(logs).to.be.an('array').that.is.empty;
        });

        it('should return empty array if party does not exist', () => {
            const logs = partyService.getLogs(partyId, 'player1');

            expect(logs).to.be.an('array').that.is.empty;
        });

        it('should return an empty array if the party does not exist', () => {
            const result = partyService.getLogs('invalidPartyId', 'player1');
            expect(result).to.be.an('array').that.is.empty;
        });

        it('should return an empty array if the party exists but has no logs', () => {
            partyService['parties'].set(partyId, { ...party, logs: [] } as any);
            const result = partyService.getLogs(partyId, 'player1');
            expect(result).to.be.an('array').that.is.empty;
        });

        it('should return all logs not in FIGHT_LOGS_TYPES regardless of playerId', () => {
            const logNotFight: GameLogs = {
                type: LogTypeEvent.BeginParty, // Not in FIGHT_LOGS_TYPES
                message: 'Game started',
                time: new Date(),
            };
            partyService['parties'].set(partyId, { ...party, logs: [logNotFight] } as any);
            const result = partyService.getLogs(partyId, 'player1');
            expect(result).to.include(logNotFight);
        });

        it('should include fight logs if log.playerId includes the playerId', () => {
            const fightLog: GameLogs = {
                type: LogTypeEvent.AttackTo, // In FIGHT_LOGS_TYPES
                message: 'Player1 attacked Player2',
                time: new Date(),
                playerIds: ['player1', 'player2'],
            };
            partyService['parties'].set(partyId, { ...party, logs: [fightLog] } as any);
            const result = partyService.getLogs(partyId, 'player1');
            expect(result).to.include(fightLog);
        });

        it('should exclude fight logs if log.playerId does not include the playerId', () => {
            const fightLog: GameLogs = {
                type: LogTypeEvent.AttackTo,
                message: 'Player3 attacked Player4',
                time: new Date(),
                playerIds: ['player3', 'player4'],
            };
            partyService['parties'].set(partyId, { ...party, logs: [fightLog] } as any);
            const result = partyService.getLogs(partyId, 'player1');
            expect(result).to.not.include(fightLog);
        });

        it('should exclude fight logs if log.playerId is undefined', () => {
            const fightLog: GameLogs = {
                type: LogTypeEvent.AttackTo,
                message: 'An attack happened',
                time: new Date(),
                playerIds: undefined,
            };
            partyService['parties'].set(partyId, { ...party, logs: [fightLog] } as any);
            const result = partyService.getLogs(partyId, 'player1');
            expect(result).to.not.include(fightLog);
        });

        it('should correctly filter multiple logs with mixed types and playerIds', () => {
            const logNotFight: GameLogs = {
                type: LogTypeEvent.BeginParty,
                message: 'Game started',
                time: new Date(),
            };
            const fightLogWithPlayer: GameLogs = {
                type: LogTypeEvent.AttackTo,
                message: 'Player1 attacked Player2',
                time: new Date(),
                playerIds: ['player1', 'player2'],
            };
            const fightLogWithoutPlayer: GameLogs = {
                type: LogTypeEvent.AttackTo,
                message: 'Player3 attacked Player4',
                time: new Date(),
                playerIds: ['player3', 'player4'],
            };
            const fightLogUndefinedPlayerId: GameLogs = {
                type: LogTypeEvent.AttackTo,
                message: 'An attack happened',
                time: new Date(),
                playerIds: undefined,
            };
            partyService['parties'].set(partyId, {
                ...party,
                logs: [logNotFight, fightLogWithPlayer, fightLogWithoutPlayer, fightLogUndefinedPlayerId],
            } as any);
            const result = partyService.getLogs(partyId, 'player1');
            expect(result).to.include(logNotFight);
            expect(result).to.include(fightLogWithPlayer);
            expect(result).to.not.include(fightLogWithoutPlayer);
            expect(result).to.not.include(fightLogUndefinedPlayerId);
        });

        it('should return logs appropriately when playerId is undefined', () => {
            const logNotFight: GameLogs = {
                type: LogTypeEvent.BeginParty,
                message: 'Game started',
                time: new Date(),
            };
            const fightLog: GameLogs = {
                type: LogTypeEvent.AttackTo,
                message: 'An attack happened',
                time: new Date(),
                playerIds: ['player1', 'player2'],
            };
            partyService['parties'].set(partyId, { ...party, logs: [logNotFight, fightLog] } as any);
            const result = partyService.getLogs(partyId, undefined);
            expect(result).to.include(logNotFight);
            // Since playerId is undefined, fight logs should not include undefined in playerId array
            expect(result).to.not.include(fightLog);
        });

        it('should return logs appropriately when playerId is an empty string', () => {
            const logNotFight: GameLogs = {
                type: LogTypeEvent.BeginParty,
                message: 'Game started',
                time: new Date(),
            };
            const fightLogWithEmptyPlayerId: GameLogs = {
                type: LogTypeEvent.AttackTo,
                message: 'An attack happened',
                time: new Date(),
                playerIds: [''],
            };
            partyService['parties'].set(partyId, { ...party, logs: [logNotFight, fightLogWithEmptyPlayerId] } as any);
            const result = partyService.getLogs(partyId, '');
            expect(result).to.include(logNotFight);
            expect(result).to.include(fightLogWithEmptyPlayerId);
        });

        it('should handle logs with different LogTypeEvent values', () => {
            const defenseLog: GameLogs = {
                type: LogTypeEvent.DefenseFrom, // In FIGHT_LOGS_TYPES
                message: 'Player1 defended against Player2',
                time: new Date(),
                playerIds: ['player1', 'player2'],
            };
            const escapeLog: GameLogs = {
                type: LogTypeEvent.EscapeFrom, // In FIGHT_LOGS_TYPES
                message: 'Player1 tried to escape',
                time: new Date(),
                playerIds: ['player1'],
            };
            partyService['parties'].set(partyId, { ...party, logs: [defenseLog, escapeLog] } as any);
            const result = partyService.getLogs(partyId, 'player1');
            expect(result).to.include(defenseLog);
            expect(result).to.include(escapeLog);
        });
    });

    describe('getOrderPlayers', () => {
        it('should call playerService getOrderPlayers', () => {
            partyService.getOrderPlayers(partyId);
            expect(playerServiceStub.getOrderPlayers.calledWith(partyId)).to.equal(true);
        });
    });

    describe('setCurrentPlayer', () => {
        it('should call playerService setCurrentPlayer', () => {
            partyService['parties'].set(partyId, party as any);
            partyService.setCurrentPlayer(partyId, playerId, true);
            expect(playerServiceStub.setCurrentPlayer.calledWith(partyId, playerId, true)).to.equal(true);
        });
    });

    describe('setPlayerGiveUp', () => {
        it('should call playerService setPlayerGiveUp', () => {
            partyService['parties'].set(partyId, party as any);
            partyService.setPlayerGiveUp(partyId, playerId);
            expect(playerServiceStub.setPlayerGiveUp.calledWith(partyId, playerId)).to.equal(true);
        });
    });

    describe('setPlayerAvailableMove', () => {
        it('should call playerService setPlayerAvailableMove', () => {
            partyService['parties'].set(partyId, party as any);
            partyService.setPlayerAvailableMove(partyId, playerId, 2);
            expect(playerServiceStub.setPlayerAvailableMove.calledWith(partyId, playerId, 2)).to.equal(true);
        });
    });

    describe('increaseWinCount', () => {
        it('should call playerService setCurrentPlayer', () => {
            partyService['parties'].set(partyId, party as any);
            partyService.addToWinCount(partyId, playerId, 1);
            expect(playerServiceStub.addToWinCount.calledWith(partyId, playerId, 1)).to.equal(true);
        });
    });

    describe('decrementRemainingAction', () => {
        it('should call playerService decrementRemainingAction', () => {
            partyService['parties'].set(partyId, party as any);
            partyService.decrementRemainingAction(partyId, playerId);
            expect(playerServiceStub.decrementRemainingAction.calledWith(partyId, playerId)).to.equal(true);
        });
    });

    describe('resetAttributePlayer', () => {
        it('should call playerService resetAttributePlayer', () => {
            partyService['parties'].set(partyId, party as any);
            partyService.resetAttributePlayer(partyId, playerId);
            expect(playerServiceStub.resetAttributePlayer.calledWith(partyId, playerId)).to.equal(true);
        });
    });

    describe('updatePlayerPosition', () => {
        it('should call playerService updatePlayerPosition', () => {
            partyService['parties'].set(partyId, party as any);
            const pos = { x: 1, y: 2 };
            partyService.updatePlayerPosition(partyId, playerId, pos);
            expect(playerServiceStub.updatePlayerPosition.calledWith(partyId, playerId, pos)).to.equal(true);
        });
    });

    describe('addPlayerItem', () => {
        it('should call playerService addPlayerItem', () => {
            partyService['parties'].set(partyId, party as any);
            partyService.addPlayerItem(partyId, playerId, 5);
            expect(playerServiceStub.addPlayerItem.calledWith(partyId, playerId, 5)).to.equal(true);
        });
    });

    describe('removePlayerItem', () => {
        it('should call playerService removePlayerItem', () => {
            partyService['parties'].set(partyId, party as any);
            partyService.removePlayerItem(partyId, playerId, 2);
            expect(playerServiceStub.removePlayerItem.calledWith(partyId, playerId, 2)).to.equal(true);
        });
    });

    describe('updateMap', () => {
        it('should update map at given position', () => {
            const pos: Coordinate = { x: 1, y: 0 };
            const newValue = 42;
            const gameMap = [
                [0, 0],
                [0, 0],
            ];
            partyService['parties'].set(partyId, { ...party, game: { ...game, gameMap } } as any);

            partyService.updateMap(partyId, pos, newValue);

            const updatedParty = partyService.getParty(partyId);
            expect(updatedParty).to.exist;
            expect(updatedParty?.game.gameMap[pos.y][pos.x]).to.equal(newValue);
        });

        it('should not update map if party does not exist', () => {
            const pos: Coordinate = { x: 1, y: 0 };
            const newValue = 42;

            partyService.updateMap(partyId, pos, newValue);

            const updatedParty = partyService.getParty(partyId);
            expect(updatedParty).to.not.exist;
        });
    });

    describe('setPartyDebugMode', () => {
        it('should set party mode if exist', () => {
            partyService['parties'].set(partyId, { ...party, game } as any);
            partyService.setPartyDebugMode(partyId, true);
            const updatedParty = partyService.getParty(partyId);
            expect(updatedParty).to.exist;
            expect(updatedParty.isDebugMode).to.equal(true);
        });

        it("should don't set party mode if exist", () => {
            partyService['parties'].set(partyId, { ...party, game } as any);
            partyService.setPartyDebugMode('', false);
            const updatedParty = partyService.getParty('');
            expect(updatedParty).to.not.exist;
        });
    });

    describe('togglePartyMode', () => {
        it('should call  setPartyDebugMode', () => {
            const setPartyDebugModeSpy = sinon.spy(partyService as any, 'setPartyDebugMode');
            partyService['parties'].set(partyId, { ...party, game } as any);
            partyService.togglePartyMode(partyId);
            expect(setPartyDebugModeSpy.calledWith(partyId, true)).to.equal(true);
        });
    });

    describe('isDebugMode', () => {
        it('should return attribute debug mode of party if exist', () => {
            partyService['parties'].set(partyId, { ...party, game, isDebugMode: true } as any);
            const res = partyService.isDebugMode(partyId);
            expect(res).to.equal(true);
        });

        it('should return false if party not exist', () => {
            const res = partyService.isDebugMode(partyId);
            expect(res).to.equal(false);
        });
    });
    it('should remove and get player items correctly', () => {
        const item = ItemType.BoostAttack;
        const player1 = { ...player, items: [item] } as PlayerInfos;
        // Stub the necessary methods
        sinon.stub(partyService as any, 'getParty').returns(party);
        sinon.stub(partyService as any, 'getPlayer').returns(player1);

        // Test removeAllPlayerItem
        partyService.removeAllPlayerItem(partyId, playerId);
        expect(itemServiceStub.removeAllItemEffect.calledWith(party, player1)).to.be.true;
        expect(playerServiceStub.removeAllPlayerItem.calledWith(partyId, playerId)).to.be.true;
        // Test getPlayerItems
        playerServiceStub.getPlayerItems.returns(player1.items);
        const items = partyService.getPlayerItems(partyId, playerId);
        expect(playerServiceStub.getPlayerItems.calledWith(partyId, playerId)).to.be.true;
        expect(items).to.deep.equal([item]);
    });
    it('should return false if party does not have double ice break effect', () => {
        sinon.stub(partyService as any, 'getParty').returns(party);
        const result = partyService.hasPartyDoubleIceBreak(partyId);
        expect(result).to.be.false;
    });

    it('should return false if party is undefined', () => {
        sinon.stub(partyService as any, 'getParty').returns(undefined);
        const result = partyService.hasPartyDoubleIceBreak(partyId);
        expect(result).to.be.false;
    });
    it('should return true if party has double ice break effect', () => {
        const party1 = { ...party, hasDoubleIceBreakEffect: true };
        sinon.stub(partyService as any, 'getParty').returns(party1);
        const result = partyService.hasPartyDoubleIceBreak(partyId);
        expect(result).to.be.true;
    });
    it('should return false if party does not have take loser item effect', () => {
        sinon.stub(partyService as any, 'getParty').returns(party);
        const result = partyService.hasPartyDecreaseLoserWins(partyId);
        expect(result).to.be.false;
    });

    it('should return false if party is undefined', () => {
        sinon.stub(partyService as any, 'getParty').returns(undefined);
        const result = partyService.hasPartyDecreaseLoserWins(partyId);
        expect(result).to.be.false;
    });
    it('should return true if party has take loser item effect', () => {
        const party1 = { ...party, hasDecreaseLoserWinsEffect: true };
        sinon.stub(partyService as any, 'getParty').returns(party1);
        const result = partyService.hasPartyDecreaseLoserWins(partyId);
        expect(result).to.be.true;
    });

    it('should getPartyGameMode return GameMode if party exist', () => {
        sinon.stub(partyService as any, 'getParty').returns(party);
        const result = partyService.getPartyGameMode(partyId);
        expect(result).to.be.equal(party.game.mode);
    });
    it('should getPartyGameMode return null if no party', () => {
        const result = partyService.getPartyGameMode(partyId);
        expect(result).to.be.null;
    });
    it('should getPartyDuration return party duration if party exist', () => {
        const duration = '30:00';
        sinon.stub(partyService as any, 'getParty').returns(party);
        sinon.stub(PartyHelper as any, 'getPartyDuration').returns(duration);
        const result = partyService.getPartyDuration(partyId);
        expect(result).to.be.equal(duration);
    });
    it('should getPartyDuration return empty string if no party', () => {
        const result = partyService.getPartyDuration(partyId);
        expect(result).to.be.equal('');
    });

    it('should getMap return GameMap', () => {
        sinon.stub(partyService as any, 'getParty').returns(party);
        const result = partyService.getMap(partyId);
        expect(result).to.be.equal(party.game.gameMap);
    });
    it('should not get the starting points coordinates if no party', () => {
        sinon.stub(partyService as any, 'getParty').returns(undefined);
        const result = partyService.getStartPositions(partyId);
        expect(result).to.deep.equal([]);
    });
    it('should get the starting points coordinate', () => {
        const party1 = {
            ...party,
            game: {
                ...party.game,
                mapSize: 3,
                gameMap: [
                    [10, 10, 10],
                    [10, TileType.Base * BASE_TILE_DECIMAL + ItemType.StartingPoint, 10],
                    [10, 10, TileType.Base * BASE_TILE_DECIMAL + ItemType.StartingPoint],
                ],
            },
        };
        sinon.stub(partyService as any, 'getParty').returns(party1);

        const result = partyService.getStartPositions(partyId);
        expect(result).to.deep.equal([
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ]);
    });
});
