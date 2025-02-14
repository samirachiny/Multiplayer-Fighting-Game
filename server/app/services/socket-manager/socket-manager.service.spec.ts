/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { io as ioClient, Socket } from 'socket.io-client';
import { SocketManagerService } from './socket-manager.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import * as ioServer from 'socket.io';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { ChatMessage } from '@common/interfaces/chat-message';
import { PlayerInfos } from '@common/interfaces/player-infos';
import * as http from 'http';
import { GameService } from '@app/services/game/game.service';
import { ChatMessageService } from '@app/services/chat-message/chat-message.service';
import { PartySetUpManagerService } from '@app/services/party-set-up-manager/party-set-up-manager.service';
import { PartyService } from '@app/services/party/party.service';
import { PartyManagerService } from '@app/services/party-manager/party-manager.service';
import { Game } from '@common/interfaces/game';
import { ItemType } from '@common/enums/item';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { PartyStatistic } from '@common/interfaces/party-statistics';
const RESPONSE_DELAY = 100;

describe('SocketManager service tests', () => {
    let service: SocketManagerService;
    let server: http.Server;
    let clientSocket: Socket;
    let serverSocket: ioServer.Socket;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    let chatMessageServiceStub: sinon.SinonStubbedInstance<ChatMessageService>;
    let gameServiceStub: sinon.SinonStubbedInstance<GameService>;
    let partySetUpManagerServiceStub: sinon.SinonStubbedInstance<PartySetUpManagerService>;
    let partyManagerServiceStub: sinon.SinonStubbedInstance<PartyManagerService>;
    let partyStatServiceStub: sinon.SinonStubbedInstance<PartyStatisticsService>;
    const callback = () => {};
    const urlString = 'http://localhost:3000';

    beforeEach((done) => {
        server = http.createServer();
        partyServiceStub = sinon.createStubInstance(PartyService);
        chatMessageServiceStub = sinon.createStubInstance(ChatMessageService);
        gameServiceStub = sinon.createStubInstance(GameService);
        partySetUpManagerServiceStub = sinon.createStubInstance(PartySetUpManagerService);
        partyManagerServiceStub = sinon.createStubInstance(PartyManagerService);
        partyStatServiceStub = sinon.createStubInstance(PartyStatisticsService);
        service = new SocketManagerService();
        service['partyService'] = partyServiceStub;
        service['partySetUpManager'] = partySetUpManagerServiceStub;
        service['gameService'] = gameServiceStub;
        service['chatMessageService'] = chatMessageServiceStub;
        service['partyManagerService'] = partyManagerServiceStub;
        service['partyStatService'] = partyStatServiceStub;
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        server.listen(3000, () => {
            clientSocket = ioClient(urlString);
            clientSocket.on('connect', done);
        });
        service.init(server);
        service.handleSockets();
        service['sio'].on('connection', (socket) => {
            serverSocket = socket;
        });
        sinon.stub(console, 'log');
        service.handleSockets();
    });

    afterEach(() => {
        clientSocket.close();
        server.close();
        service['sio'].close();
        sinon.restore();
    });
    it('should handle a game modified event', (done) => {
        const gid = 'game1123' as any;
        const spy = sinon.spy(service as any, 'gameModified');
        clientSocket.emit(WsEventServer.GameModified, gid);
        setTimeout(() => {
            expect(spy.called);
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle a leave party event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        sinon.stub(PartyHelper, 'isOrganizer').returns(false);
        clientSocket.emit(WsEventServer.LeaveParty);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.leaveParty as any).calledWith(serverSocket, serverSocket.id));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle an end party event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        sinon.stub(PartyHelper, 'isOrganizer').returns(true);
        clientSocket.emit(WsEventServer.LeaveParty);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.endParty as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should leave party if in party on disconnecting event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        sinon.stub(PartyHelper, 'isOrganizer').returns(false);
        clientSocket.disconnect();
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.leaveParty as any).calledWith(serverSocket, serverSocket.id));
            done();
        }, RESPONSE_DELAY);
    });
    it('should give up if in an ongoing game party on disconnecting event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        sinon.stub(PartyHelper, 'isOrganizer').returns(false);
        partyManagerServiceStub.getPartyManager.resolves(true);
        clientSocket.disconnect();
        setTimeout(() => {
            expect((partyManagerServiceStub.giveUp as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });

    it('should end party if in party on disconnecting event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        sinon.stub(PartyHelper, 'isOrganizer').returns(true);
        clientSocket.disconnect();
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.endParty as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle a create party event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        const gid = 'game1';
        clientSocket.emit(WsEventServer.CreateParty, gid);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.createParty as any).calledWith(serverSocket, gid));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle a validate access code event', (done) => {
        const accessCode = 1234;
        clientSocket.emit(WsEventServer.ValidateAccessCode, accessCode, callback);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.validateAccessCode as any).calledWith(serverSocket, accessCode));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle a toggle lock party event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        clientSocket.emit(WsEventServer.ToggleLockParty);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.toggleLockParty as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle a get all party players event', (done) => {
        sinon.stub(PartyHelper, 'getPartyId').returns('partyId');
        clientSocket.emit(WsEventServer.GetAllPlayers, callback);
        setTimeout(() => {
            expect((partyServiceStub.getOrderPlayers as any).calledWith('partyId'));
            expect((PartyHelper.getPartyId as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle a set up party infos event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        const data = { someKey: 'someValue' };
        clientSocket.emit(WsEventServer.SetUpParty, data);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.setUpPartyInfos as any).calledWith(serverSocket, data));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle get character occupied list event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        clientSocket.emit(WsEventServer.GetOccupiedCharacters, callback);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.getCharactersOccupied as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle character occupied updated event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        const data = 2;
        clientSocket.emit(WsEventServer.CharacterOccupiedUpdated, data);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.updateCharacterOccupied as any).calledWith(serverSocket, data));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle a join party event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        const player = { id: 'player1' } as any as PlayerInfos;
        clientSocket.emit(WsEventServer.JoinParty, player);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.joinParty as any).calledWith(serverSocket, player));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle an eject player event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        const playerId = 'player1';
        clientSocket.emit(WsEventClient.EjectPlayer, playerId);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.leaveParty as any).calledWith(serverSocket, playerId, true));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle a disconnect event', (done) => {
        clientSocket.disconnect();
        setTimeout(() => {
            expect((console.log as any).calledWithMatch(/Deconnexion par l'utilisateur avec id/));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle get messages event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        clientSocket.emit(WsEventServer.GetMessages, callback);
        setTimeout(() => {
            expect((chatMessageServiceStub.getMessages as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle get player info event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        sinon.stub(service as any, 'getPlayerInfo').resolves({});
        clientSocket.emit(WsEventServer.GetPlayerInfos, callback);
        setTimeout(() => {
            expect((service['getPlayerInfo'] as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle send message event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(true);
        const message: ChatMessage = { message: 'Hello, world!', senderName: 'user1', timestamp: null };
        clientSocket.emit(WsEventServer.SendMessage, message);
        setTimeout(() => {
            expect((chatMessageServiceStub.sendMessage as any).calledWith(serverSocket, message));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle start game event', (done) => {
        clientSocket.emit(WsEventServer.StartGame);
        setTimeout(() => {
            expect((partyManagerServiceStub.startGame as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle attack event', (done) => {
        clientSocket.emit(WsEventServer.Attack);
        setTimeout(() => {
            expect((partyManagerServiceStub.handleAttack as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle escape event', (done) => {
        clientSocket.emit(WsEventServer.Escape);
        setTimeout(() => {
            expect((partyManagerServiceStub.handleEscape as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle give up fight event', (done) => {
        clientSocket.emit(WsEventServer.FightingGiveUp);
        setTimeout(() => {
            expect((partyManagerServiceStub.handleGiveUpInFight as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle delete game event when all players are virtual or have given up', (done) => {
        const mockPartyId = 'test-party-id';
        const mockPlayers = [{ isGiveUp: false, isVirtualPlayer: true }] as PlayerInfos[];
        sinon.stub(PartyHelper, 'getPartyId').returns(mockPartyId);
        partyServiceStub.getPlayers.withArgs(mockPartyId).returns(mockPlayers);
        clientSocket.emit(WsEventServer.DeleteParty);
        setTimeout(() => {
            expect(partyManagerServiceStub.deletePartyManager.calledWith(serverSocket));
            expect(partyStatServiceStub.deletePartyStatistic.calledWith(mockPartyId)).to.equal(true);
            expect(partyServiceStub.deleteParty.calledWith(mockPartyId)).to.equal(true);
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle delete game event when there are active human players remaining', (done) => {
        const mockPartyId = 'test-party-id';
        const mockPlayers = [
            { isGiveUp: false, isVirtualPlayer: false },
            { isGiveUp: false, isVirtualPlayer: false },
        ] as PlayerInfos[];
        sinon.stub(PartyHelper, 'getPartyId').returns(mockPartyId);
        partyServiceStub.getPlayers.withArgs(mockPartyId).returns(mockPlayers);
        clientSocket.emit(WsEventServer.DeleteParty);
        setTimeout(() => {
            expect(partyServiceStub.removePlayer.calledWith(mockPartyId, serverSocket.id));
            expect(partyManagerServiceStub.deletePartyManager.called).to.equal(false);
            expect(partyStatServiceStub.deletePartyStatistic.called).to.equal(false);
            expect(partyServiceStub.deleteParty.called).to.equal(false);
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle get party event', (done) => {
        clientSocket.emit(WsEventServer.GetPartyInfos, callback);
        setTimeout(() => {
            expect((partyManagerServiceStub.getPartyInfos as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle get player event', (done) => {
        sinon.stub(PartyHelper, 'getPartyId').returns('partyId');
        clientSocket.emit(WsEventServer.GetPlayer, callback);
        setTimeout(() => {
            expect((partyServiceStub.getPlayer as any).calledWith('partyId', serverSocket.id));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle get available positions event', (done) => {
        clientSocket.emit(WsEventServer.GetAvailablePositions, callback);
        setTimeout(() => {
            expect((partyManagerServiceStub.getAccessiblePositions as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle get available positions event', (done) => {
        clientSocket.emit(WsEventServer.GetInteractivePositions, callback);
        setTimeout(() => {
            expect((partyManagerServiceStub.getInteractivePositions as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle get path event', (done) => {
        clientSocket.emit(WsEventServer.GetPath, { x: 12, y: 12 }, callback);
        setTimeout(() => {
            expect((partyManagerServiceStub.getPath as any).calledWith(serverSocket, { x: 12, y: 12 }));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle start action event', (done) => {
        clientSocket.emit(WsEventServer.StartAction, { x: 12, y: 12 });
        setTimeout(() => {
            expect((partyManagerServiceStub.executeAction as any).calledWith(serverSocket, { x: 12, y: 12 }));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle player start moving event', (done) => {
        clientSocket.emit(WsEventServer.PlayerStartMoving, { x: 12, y: 12 });
        setTimeout(() => {
            expect((partyManagerServiceStub.movePlayer as any).calledWith(serverSocket, { x: 12, y: 12 }));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle get party debug mode event', (done) => {
        clientSocket.emit(WsEventServer.GetPartyDebugMode, callback);
        setTimeout(() => {
            expect((partyServiceStub.isDebugMode as any).calledWith(PartyHelper.getPartyId(serverSocket)));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle toggle debug mode event if party not exist', (done) => {
        partyServiceStub.getParty.returns(null);
        clientSocket.emit(WsEventServer.TogglePartyDebugMode);
        setTimeout(() => {
            expect((partyManagerServiceStub.toggleDebugMode as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle teleport event', (done) => {
        const pos = { x: 12, y: 12 };
        clientSocket.emit(WsEventServer.TeleportPlayer, pos);
        setTimeout(() => {
            expect((partyManagerServiceStub.teleportPlayerTo as any).calledWith(serverSocket, pos));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle give up event', (done) => {
        clientSocket.emit(WsEventServer.GiveUp);
        setTimeout(() => {
            expect((partyManagerServiceStub.giveUp as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle end round event', (done) => {
        clientSocket.emit(WsEventServer.EndRound);
        setTimeout(() => {
            expect((partyManagerServiceStub.endRound as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle get games log event', (done) => {
        sinon.stub(PartyHelper, 'getPartyId').returns('partyId');
        clientSocket.emit(WsEventServer.GetLogGames, callback);
        setTimeout(() => {
            expect((partyServiceStub.getLogs as any).calledOnce);
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle get fighters event', (done) => {
        clientSocket.emit(WsEventServer.GetFighters, callback);
        setTimeout(() => {
            expect((partyManagerServiceStub.getFighters as any).calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
    it('should handle remove chosen item event', (done) => {
        const item = ItemType.BoostAttack;
        clientSocket.emit(WsEventServer.RemoveItemChosen, item);
        setTimeout(() => {
            expect((partyManagerServiceStub.removePlayerItem as any).calledWith(serverSocket, item));
            done();
        }, RESPONSE_DELAY);
    });

    it('should not send message if socket is not in a party', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(false);
        const message: ChatMessage = { message: 'Hello, world!', senderName: 'user1', timestamp: new Date() };
        clientSocket.emit(WsEventServer.SendMessage, message);
        setTimeout(() => {
            expect((chatMessageServiceStub.sendMessage as any).notCalled);
            done();
        }, RESPONSE_DELAY);
    });

    it('should not get character occupied list if socket is not in a party', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(false);
        clientSocket.emit(WsEventServer.GetOccupiedCharacters, callback);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.getCharactersOccupied as any).notCalled);
            done();
        }, RESPONSE_DELAY);
    });

    it('should not update character occupied if socket is not in a party', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(false);
        const data = { old: 1, new: 2 };
        clientSocket.emit(WsEventServer.CharacterOccupiedUpdated, data);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.updateCharacterOccupied as any).notCalled);
            done();
        }, RESPONSE_DELAY);
    });
    it('should not get messages if socket is not in a party', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(false);
        const setMessages = sinon.spy();
        clientSocket.emit(WsEventServer.GetMessages, setMessages);
        setTimeout(() => {
            expect((chatMessageServiceStub.getMessages as any).notCalled);
            done();
        }, RESPONSE_DELAY);
    });

    it('should not get player info if socket is not in a party', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(false);
        const setPlayerInfo = sinon.spy();
        sinon.stub(service as any, 'getPlayerInfo');
        clientSocket.emit(WsEventServer.GetPlayerInfos, setPlayerInfo);
        setTimeout(() => {
            expect((service['getPlayerInfo'] as any).notCalled);
            done();
        }, RESPONSE_DELAY);
    });

    it('should not send message if socket is not in a party', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(false);
        const message: ChatMessage = { message: 'Hello, world!', senderName: 'user1', timestamp: new Date() };
        clientSocket.emit(WsEventServer.SendMessage, message);
        setTimeout(() => {
            expect((chatMessageServiceStub.sendMessage as any).notCalled);
            done();
        }, RESPONSE_DELAY);
    });

    it('should not leave party or end party if socket is not in a party', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(false);
        clientSocket.emit(WsEventServer.LeaveParty);
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.leaveParty as any).notCalled);
            expect((partySetUpManagerServiceStub.endParty as any).notCalled);
            done();
        }, RESPONSE_DELAY);
    });
    it('should not leave party or end party if socket is not in a party on disconnecting event', (done) => {
        sinon.stub(PartyHelper, 'isInParty').returns(false);
        clientSocket.disconnect();
        setTimeout(() => {
            expect((partySetUpManagerServiceStub.leaveParty as any).notCalled);
            expect((partySetUpManagerServiceStub.endParty as any).notCalled);
            done();
        }, RESPONSE_DELAY);
    });

    it('should getPlayerInfo send the player informations if player exists', () => {
        const player = { id: 'player1' } as any as PlayerInfos;
        sinon.stub(PartyHelper, 'getPartyId').returns('party1');
        partyServiceStub.getPlayer.returns(player);
        const callbackSpy = sinon.spy();
        service['getPlayerInfo'](serverSocket, callbackSpy);
        expect(callbackSpy.calledWith(player));
    });

    it('should getPlayerInfo not send the player informations if player do not exist', () => {
        sinon.stub(PartyHelper, 'getPartyId').returns('party1');
        partyServiceStub.getPlayer.returns(undefined);
        const callbackSpy = sinon.spy();
        service['getPlayerInfo'](serverSocket, callbackSpy);
        expect(callbackSpy.notCalled);
    });

    it('should gameModified send the updated games list and signal to the client', async () => {
        const games = [{ id: 'game1' }, { id: 'game2' }] as any as Game[];
        const gameId = 'game1';
        gameServiceStub.getGames.resolves(games);
        const socket = {
            broadcast: {
                emit: sinon.spy(),
            },
        } as any;
        await service['gameModified']();
        await service['gameModified']();
        expect((socket.broadcast.emit as any).calledWith(WsEventServer.GameModified, gameId));
        expect((socket.broadcast.emit as any).calledWith(WsEventClient.GameListUpdated, games));
    });

    it('should handle AddVirtualPlayer event', (done) => {
        const profileMock = 'Advanced' as BotProfile;
        const partyIdMock = 'mockPartyId';
        const playersMock = [{ name: 'Player1' }, { name: 'Player2' }] as any;

        sinon.stub(PartyHelper, 'getPartyId').returns(partyIdMock);
        sinon.stub(PartyHelper, 'generateValidName').returns('MockBotName');
        partyServiceStub.getPlayers.returns(playersMock);

        const addVirtualPlayerStub = sinon.stub(service['virtualPlayerService'], 'addVirtualPlayer').callsFake(() => {});

        clientSocket.emit(WsEventServer.AddVirtualPlayer, profileMock);

        setTimeout(() => {
            expect(addVirtualPlayerStub.calledOnce);
            expect(addVirtualPlayerStub.calledWith(serverSocket, profileMock));
            done();
        }, RESPONSE_DELAY);
    });

    it('should handle GetPartyStatistics event', (done) => {
        const partyIdMock = 'party-123';
        const partyStatisticMock = { totalRounds: 10 } as PartyStatistic;

        sinon.stub(PartyHelper, 'getPartyId').returns(partyIdMock);
        partyStatServiceStub.getPartyStatistic.withArgs(partyIdMock).returns(partyStatisticMock);

        clientSocket.emit(WsEventServer.GetPartyStatistics, (statistic: PartyStatistic) => {
            expect(statistic).to.deep.equal(partyStatisticMock);
        });

        setTimeout(() => {
            expect(partyStatServiceStub.getPartyStatistic.calledOnceWith(partyIdMock));
            expect(partyManagerServiceStub.deletePartyManager.calledWith(serverSocket));
            done();
        }, RESPONSE_DELAY);
    });
});
