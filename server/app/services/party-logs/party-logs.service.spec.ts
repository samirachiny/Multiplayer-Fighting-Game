/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { PartyLogService } from './party-logs.service';
import { PartyService } from '@app/services/party/party.service';
import { LogTypeEvent } from '@common/enums/log-type';
import { GameLogs } from '@common/interfaces/game-logs';
import { LogParameter } from '@common/interfaces/log-parameter';
import { LOGS_MESSAGES } from '@app/utils/const';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { SendingOptions } from '@common/enums/sending-options';
import { WsEventClient } from '@common/enums/web-socket-event';

describe('PartyLogService', () => {
    let partyLogService: PartyLogService;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    let sio: any;
    let socket: any;

    const fakeGameLogs: GameLogs[] = [
        {
            time: new Date('2024-11-01T10:00:00'),
            message: 'Début de partie',
            type: LogTypeEvent.BeginParty,
        },
        {
            time: new Date('2024-11-01T10:05:00'),
            message: 'Début de combat entre Joueur1 et Joueur2',
            type: LogTypeEvent.StartCombat,
            playerIds: ['Joueur1', 'Joueur2'],
        },
        {
            time: new Date('2024-11-01T10:07:00'),
            message: 'Joueur1 attaque Joueur2 - Succès ! Dégâts infligés : 10',
            type: LogTypeEvent.AttackTo,
            playerIds: ['Joueur1', 'Joueur2'],
        },
        {
            time: new Date('2024-11-01T10:10:00'),
            message: 'Joueur2 tente de fuir - Échec',
            type: LogTypeEvent.EscapeFrom,
            playerIds: ['Joueur2'],
        },
        {
            time: new Date('2024-11-01T10:15:00'),
            message: 'Fin de partie - Victoire de Joueur1',
            type: LogTypeEvent.EndGame,
        },
    ];

    beforeEach(() => {
        partyServiceStub = sinon.createStubInstance(PartyService);
        partyLogService = new PartyLogService(partyServiceStub as unknown as PartyService);

        sio = {
            to: sinon.stub().returns(sio),
            in: sinon.stub().returns(sio),
            socketsLeave: sinon.stub().returns(sio),
            emit: sinon.stub().returns(sio),
            on: sinon.stub().returns(sio),
            socketsJoin: sinon.stub().returns(sio),
        };

        socket = {
            to: sinon.stub().returns(socket),
            in: sinon.stub().returns(socket),
            socketsLeave: sinon.stub().returns(socket),
            emit: sinon.stub().returns(socket),
            on: sinon.stub().returns(socket),
            join: sinon.stub().returns(socket),
            socketsJoin: sinon.stub().returns(socket),
        };
        socket.id = 'party1';
        sinon.stub(console, 'log');
        PartyHelper.init(sio);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getGameLogs', () => {
        it('getLogs from partyService should be called once with right parameter', () => {
            partyLogService.getGameLogs('party1', 'player1');
            expect(partyServiceStub.getLogs.calledOnceWith('party1', 'player1'));
        });

        it('should return logs array with valid party array', () => {
            partyServiceStub.getLogs.returns(fakeGameLogs);
            const logs = partyLogService.getGameLogs('party1', 'player1');
            expect(partyServiceStub.getLogs.calledOnceWith('party1', 'player1'));
            expect(fakeGameLogs).deep.equal(logs);
        });

        it('should return an empty array if party id not valid', async () => {
            const invalidPartyId = 'invalidId';
            const playerId = 'player1';
            partyServiceStub.getLogs.withArgs(invalidPartyId).returns([]);
            expect(await partyLogService.getGameLogs(invalidPartyId, playerId)).deep.equal([]);
        });
    });

    describe('buildLogParameter', () => {
        it('should map playerIds to player names and assign to logParameter.players', () => {
            const partyId = 'party1';
            const playerIds = ['player1', 'player2'];
            const logParameter: LogParameter = {
                playerIds,
                event: LogTypeEvent.BeginParty,
            };

            // Stub partyService to return player names
            partyServiceStub.getPlayer.withArgs(partyId, 'player1').returns({
                name: 'Player One',
                pid: 'player1',
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
            });
            partyServiceStub.getPlayer.withArgs(partyId, 'player2').returns({
                name: 'Player Two',
                pid: 'player2',
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
            });

            (partyLogService as any).buildLogParameter(partyId, logParameter, playerIds);

            expect(logParameter.players).to.deep.equal(['Player One', 'Player Two']);
        });

        it('should not modify logParameter.players if playerIds is undefined', () => {
            const partyId = 'party1';
            const logParameter: LogParameter = { event: LogTypeEvent.AttackTo };

            (partyLogService as any).buildLogParameter(partyId, logParameter, undefined);

            expect(logParameter.players).to.equal(undefined);
        });
    });

    describe('sendEventToAll', () => {
        it('should send event to all players using PartyHelper', () => {
            const partyId = 'party1';
            const logs: GameLogs = { time: new Date(), message: 'Test Log', type: LogTypeEvent.BeginParty };
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');

            (partyLogService as any).sendEventToAll(partyId, logs);
            expect(sendEventSpy.calledOnceWithExactly(partyId, WsEventClient.NewPartyLog, logs)).to.equal(true);

            sendEventSpy.restore();
        });
    });

    describe('updateGameLogs', () => {
        it('should add log and send event to all players if options is Broadcast', () => {
            const partyId = 'party1';
            const logParameter: LogParameter = { event: LogTypeEvent.BeginParty };
            const gameLog: GameLogs = { time: new Date(), message: 'Début de partie', type: LogTypeEvent.BeginParty };
            const buildLogMessageStub = sinon.stub(partyLogService as any, 'buildLogMessage').returns(gameLog);
            const sendEventToAllStub = sinon.stub(partyLogService as any, 'sendEventToAll');
            partyLogService['updateGameLogs'](partyId, logParameter, SendingOptions.Broadcast);
            expect(buildLogMessageStub.calledOnceWith(logParameter)).to.equal(true);
            expect(partyServiceStub.addLog.calledOnceWith(partyId, gameLog)).to.equal(true);
            expect(sendEventToAllStub.calledOnceWith(partyId, gameLog)).to.equal(true);
        });
        it('should add log and send event to individual players if options is not Broadcast', () => {
            const partyId = 'party1';
            const logParameter: LogParameter = {
                event: LogTypeEvent.StartCombat,
                playerIds: ['Joueur1', 'Joueur2'],
            };
            const gameLog: GameLogs = {
                time: new Date(),
                message: 'Début de combat entre Joueur1 et Joueur2',
                type: LogTypeEvent.StartCombat,
                playerIds: ['Joueur1', 'Joueur2'],
            };
            const buildLogMessageStub = sinon.stub(partyLogService as any, 'buildLogMessage').returns(gameLog);
            const sendEventToIndividualPlayersStub = sinon.stub(partyLogService as any, 'sendEventToIndividualPlayers');
            partyLogService['updateGameLogs'](partyId, logParameter, SendingOptions.Unicast);
            expect(buildLogMessageStub.calledOnceWith(logParameter)).to.equal(true);
            expect(partyServiceStub.addLog.calledOnceWith(partyId, gameLog)).to.equal(true);
            expect(sendEventToIndividualPlayersStub.calledOnceWith(logParameter.playerIds, gameLog)).to.equal(true);
        });
    });

    describe('buildLogMessage', () => {
        it(' should retunr a gameLogs with right values if players included', () => {
            const logParameter: LogParameter = {
                event: LogTypeEvent.StartTurn,
                players: ['Joueur1'],
            };
            const expectedGameLogs: GameLogs = {
                time: new Date('2024-11-01T10:00:00'),
                message: 'Début de tour pour Joueur1',
                type: LogTypeEvent.StartTurn,
            };

            const logResult: GameLogs = (partyLogService as any)['buildLogMessage'](logParameter);
            expect(logResult.message).deep.equal(expectedGameLogs.message);
            expect(logResult.type).deep.equal(expectedGameLogs.type);
        });

        it('should return gamelogs with right values if no players are specified', () => {
            const logParameter: LogParameter = {
                event: LogTypeEvent.BeginParty,
            };
            const expectedGameLogs: GameLogs = {
                time: new Date('2024-11-01T10:00:00'),
                message: 'Début de la partie',
                type: LogTypeEvent.BeginParty,
            };
            const logResult: GameLogs = (partyLogService as any)['buildLogMessage'](logParameter);
            expect(logResult.message).deep.equal(expectedGameLogs.message);
            expect(logResult.type).deep.equal(expectedGameLogs.type);
        });

        it('should return gamesLogs with right values if two players included', () => {
            const logParameter: LogParameter = {
                event: LogTypeEvent.StartCombat,
                players: ['Joueur1', 'Joueur2'],
            };
            const expectedGameLogs: GameLogs = {
                time: new Date('2024-11-01T10:00:00'),
                message: 'Début de combat entre Joueur1 et Joueur2',
                type: LogTypeEvent.StartCombat,
            };
            const logResult: GameLogs = (partyLogService as any)['buildLogMessage'](logParameter);
            expect(logResult.message).deep.equal(expectedGameLogs.message);
            expect(logResult.type).deep.equal(expectedGameLogs.type);
        });

        it('should return gamesLogs with right values if two players included and moreInfos included', () => {
            const logParameter: LogParameter = {
                event: LogTypeEvent.AttackTo,
                players: ['Joueur1', 'Joueur2'],
                moreInfos: 1,
            };
            const expectedGameLogs: GameLogs = {
                time: new Date('2024-11-01T10:00:00'),
                message: 'Attaque: Joueur1 attaque Joueur2. Joueur2 a subit 1xp de dommage',
                type: LogTypeEvent.AttackTo,
            };
            const logResult: GameLogs = (partyLogService as any)['buildLogMessage'](logParameter);
            expect(logResult.message).deep.equal(expectedGameLogs.message);
            expect(logResult.type).deep.equal(expectedGameLogs.type);
        });
    });

    describe('LOGS_MESSAGES', () => {
        it('should return the correct message for beginParty', () => {
            const result = LOGS_MESSAGES.beginParty();
            expect(result).to.equal('Début de la partie');
        });

        it('should return the correct message for startCombat with two players', () => {
            const players = ['Player1', 'Player2'];
            const result = LOGS_MESSAGES.startCombat(players);
            expect(result).to.equal('Début de combat entre Player1 et Player2');
        });

        it('should return the correct message for startTurn with one player', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.startTurn(players);
            expect(result).to.equal('Début de tour pour Player1');
        });

        it('should return the correct message for collectItem with one player', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.collectItem(players);
            expect(result).to.equal('Player1 a ramassé un objet');
        });

        it('should return the correct message for collectFlag with one player', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.collectFlag(players);
            expect(result).to.equal('Player1 a ramasse le drapeau');
        });

        it('should return the correct message for closeDoor with one player', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.closeDoor(players);
            expect(result).to.equal('Player1 a ferme une porte');
        });

        it('should return the correct message for openDoor with one player', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.openDoor(players);
            expect(result).to.equal('Player1 a ouvert une porte');
        });

        it('should return the correct message for quitGame with one player', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.quitGame(players);
            expect(result).to.equal('Player1 a quitté la partie');
        });

        it('should return the correct message for endGame with one player', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.endGame(players);
            expect(result).to.equal('Fin de la partie: Victoire de Player1');
        });

        it('should return the correct message for debugOn', () => {
            const result = LOGS_MESSAGES.debugOn();
            expect(result).to.equal('Mode de débogage activé');
        });

        it('should return the correct message for debugOff', () => {
            const result = LOGS_MESSAGES.debugOff();
            expect(result).to.equal('Mode de débogage desactivé');
        });

        it('should return the correct message for endFight with two players', () => {
            const players = ['Player1', 'Player2'];
            const result = LOGS_MESSAGES.endFight(players);
            expect(result).to.equal('Fin du combat: Player1 a vaincu Player2');
        });

        it('should return the correct message for endTurn with one player', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.endTurn(players);
            expect(result).to.equal('Fin de tour pour Player1');
        });

        it('should return the correct message for giveUp with one player', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.giveUp(players);
            expect(result).to.equal('Player1 a abandonner la partie');
        });

        it('should return the correct message for attackTo with damage', () => {
            const players = ['Player1', 'Player2'];
            const damage = 10;
            const result = LOGS_MESSAGES.attackTo(players, damage);
            expect(result).to.equal('Attaque: Player1 attaque Player2. Player2 a subit 10xp de dommage');
        });

        it('should return the correct message for attackTo with no damage', () => {
            const players = ['Player1', 'Player2'];
            const damage = 0;
            const result = LOGS_MESSAGES.attackTo(players, damage);
            expect(result).to.equal('Attaque: Player1 attaque Player2. Échec');
        });

        it('should return the correct message for defenseFrom with success', () => {
            const players = ['Player1', 'Player2'];
            const success = true;
            const result = LOGS_MESSAGES.defenseFrom(players, success);
            expect(result).to.equal("Defense: Player1 s'est defendu de Player2. Réussite");
        });

        it('should return the correct message for defenseFrom with failure', () => {
            const players = ['Player1', 'Player2'];
            const success = false;
            const result = LOGS_MESSAGES.defenseFrom(players, success);
            expect(result).to.equal("Defense: Player1 s'est defendu de Player2. Échec");
        });

        it('should return the correct message for escapeFrom with success', () => {
            const players = ['Player1', 'Player2'];
            const success = true;
            const result = LOGS_MESSAGES.escapeFrom(players, success);
            expect(result).to.equal('Évasion: Player1 tente une évasion contre Player2. Réussite');
        });

        it('should return the correct message for escapeFrom with failure', () => {
            const players = ['Player1', 'Player2'];
            const success = false;
            const result = LOGS_MESSAGES.escapeFrom(players, success);
            expect(result).to.equal('Évasion: Player1 tente une évasion contre Player2. Échec');
        });

        it('should return the correct message for endWithoutWinner', () => {
            const players = ['Player1', 'Player2'];
            const result = LOGS_MESSAGES.endFightWithoutWinner(players);
            expect(result).to.equal('Fin du combat entre Player1 et Player2. Aucun vainqueur');
        });

        it('should return the correct message for ComputeDiceDefenseBonus', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.computeDiceDefenseBonus(players, { faceNumber: 4, targetToApply: 4 });
            expect(result).to.equal('Player1 a bonus de defense = (Dé)4+(Defense)4 = 8.');
        });

        it('should return the correct message for ComputeDiceAttackBonus', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.computeDiceAttackBonus(players, { faceNumber: 4, targetToApply: 4 });
            expect(result).to.equal("Player1 a bonus d'attaque = (Dé)4+(Attaque)4 = 8.");
        });

        it('should return the correct message for lossTheFlag', () => {
            const players = ['Player1'];
            const result = LOGS_MESSAGES.lossTheFlag(players);
            expect(result).to.equal('Player1 a perdu le drapeau');
        });

        /// suite
        it('should return default message for all event if players undefined', () => {
            let players;
            let result = LOGS_MESSAGES.startCombat(players);
            expect(result).to.equal('Début de combat entre Joueur1 et Joueur2');
            result = LOGS_MESSAGES.startTurn(players);
            expect(result).to.equal('Début de tour pour Joueur1');
            result = LOGS_MESSAGES.collectItem(players);
            expect(result).to.equal('Joueur1 a ramassé un objet');
            result = LOGS_MESSAGES.collectFlag(players);
            expect(result).to.equal('Joueur1 a ramasse le drapeau');
            result = LOGS_MESSAGES.closeDoor(players);
            expect(result).to.equal('Joueur1 a ferme une porte');
            result = LOGS_MESSAGES.openDoor(players);
            expect(result).to.equal('Joueur1 a ouvert une porte');
            result = LOGS_MESSAGES.quitGame(players);
            expect(result).to.equal('Joueur1 a quitté la partie');
            result = LOGS_MESSAGES.endGame(players);
            expect(result).to.equal('Fin de la partie: Victoire de Joueur1');
            result = LOGS_MESSAGES.debugOn();
            expect(result).to.equal('Mode de débogage activé');
            result = LOGS_MESSAGES.endFight(players);
            expect(result).to.equal('Fin du combat: Joueur1 a vaincu Joueur2');
            result = LOGS_MESSAGES.endTurn(players);
            expect(result).to.equal('Fin de tour pour Joueur1');
            result = LOGS_MESSAGES.giveUp(players);
            expect(result).to.equal('Joueur1 a abandonner la partie');
            result = LOGS_MESSAGES.attackTo(players, 10);
            expect(result).to.equal('Attaque: Joueur1 attaque Joueur2. Joueur2 a subit 10xp de dommage');
            result = LOGS_MESSAGES.attackTo(players, 0);
            expect(result).to.equal('Attaque: Joueur1 attaque Joueur2. Échec');
            result = LOGS_MESSAGES.defenseFrom(players, true);
            expect(result).to.equal("Defense: Joueur1 s'est defendu de Joueur2. Réussite");
            result = LOGS_MESSAGES.defenseFrom(players, false);
            expect(result).to.equal("Defense: Joueur1 s'est defendu de Joueur2. Échec");
            result = LOGS_MESSAGES.escapeFrom(players, true);
            expect(result).to.equal('Évasion: Joueur1 tente une évasion contre Joueur2. Réussite');
            result = LOGS_MESSAGES.escapeFrom(players, false);
            expect(result).to.equal('Évasion: Joueur1 tente une évasion contre Joueur2. Échec');
            result = LOGS_MESSAGES.endFightWithoutWinner(players);
            expect(result).to.equal('Fin du combat entre Joueur1 et Joueur2. Aucun vainqueur');
            result = LOGS_MESSAGES.computeDiceAttackBonus(players, { faceNumber: 4, targetToApply: 4 });
            expect(result).to.equal('');
            result = LOGS_MESSAGES.computeDiceDefenseBonus(players, { faceNumber: 4, targetToApply: 4 });
            expect(result).to.equal('');
            result = LOGS_MESSAGES.lossTheFlag(players);
            expect(result).to.equal('Joueur1 a perdu le drapeau');
        });
    });
});
