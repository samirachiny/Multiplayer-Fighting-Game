/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
import * as io from 'socket.io';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { Party } from '@common/interfaces/party';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { LogTypeEvent } from '@common/enums/log-type';
import { WsEventClient } from '@common/enums/web-socket-event';

describe('PartyHelper', () => {
    it('should generate a valid access code', () => {
        const parties: Party[] = [
            {
                accessCode: 1234,
                id: '',
                charactersOccupiedIds: new Map(),
                chatMessages: [],
                game: undefined,
                isLocked: false,
                logs: undefined,
                isDebugMode: false,
            },
        ];
        const code = PartyHelper.generateValidAccessCode(parties);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        expect(code).to.be.a('number').and.not.equal(1234);
    });

    it('should generate a unique name', () => {
        const players: PlayerInfos[] = [
            {
                name: 'John',
                pid: '',
                character: undefined,
                isOrganizer: false,
                speed: 0,
                attack: 0,
                defense: 0,
                life: 0,
                wins: 0,
                diceAssignment: undefined,
                isGiveUp: undefined,
                isCurrentPlayer: undefined,
                availableMoves: undefined,
                remainingAction: undefined,
                startPosition: undefined,
                currentPosition: undefined,
                previousPosition: undefined,
                items: [],
            },
        ];
        const name = PartyHelper.generateValidName('John', players);
        expect(name).to.equal('John-2');
    });

    it('should get the correct party id', () => {
        const mockSocket = {
            rooms: new Set(['socketId', 'partyId']),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const partyId = PartyHelper.getPartyId(mockSocket as any);
        expect(partyId).to.equal('partyId');
    });

    it('should isInParty return false if the socket is not in a party', () => {
        const mockSocket = {
            rooms: new Set(['socketId']),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isInParty = PartyHelper.isInParty(mockSocket as any);
        expect(isInParty).to.be.false;
    });

    it('should isInParty return true if the socket is in a party', () => {
        const mockSocket = {
            rooms: new Set(['socketId', 'partyId', 'otherPartyId']),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isInParty = PartyHelper.isInParty(mockSocket as any);
        expect(isInParty).to.be.true;
    });
    it('should return true if the socket is the organizer', () => {
        const mockSocket = {
            id: 'socketId',
            rooms: new Set(['socketId', 'socketId-partyId']),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isOrganizer = PartyHelper.isOrganizer(mockSocket as any);
        expect(isOrganizer).to.be.true;
    });

    describe('isOrganizer', () => {
        it('should return true if the socket ID matches the beginning of the party ID', () => {
            const mockSocket = { id: 'socketId', rooms: new Set(['socketId', 'socketId-partyId']) };
            const isOrganizer = PartyHelper.isOrganizer(mockSocket as any);
            expect(isOrganizer).to.be.true;
        });
        it('should return false if the socket ID does not match the beginning of the party ID', () => {
            const mockSocket = { id: 'socketId', rooms: new Set(['socketId', 'anotherPartyId']) };
            const isOrganizer = PartyHelper.isOrganizer(mockSocket as any);
            expect(isOrganizer).to.be.false;
        });
        it('should return false if the socket is not in any party room', () => {
            const mockSocket = { id: 'socketId', rooms: new Set(['socketId']) };
            const isOrganizer = PartyHelper.isOrganizer(mockSocket as any);
            expect(isOrganizer).to.be.undefined;
        });
    });
    describe('init', () => {
        it('should initialize the sio property', () => {
            const sioStub = {} as io.Server;
            PartyHelper.init(sioStub);
            expect((PartyHelper as any).sio).to.equal(sioStub);
        });
    });
    describe('getPartyDuration', () => {
        it('should return the duration between the BeginParty and EndGame logs', () => {
            const logs = [
                { type: LogTypeEvent.BeginParty, time: '2023-11-28T12:00:00Z' },
                { type: LogTypeEvent.EndFight, time: '2023-11-28T12:30:00Z' },
                { type: LogTypeEvent.EndGame, time: '2023-11-28T13:00:00Z' },
            ];
            const duration = PartyHelper.getPartyDuration(logs as any);
            expect(duration).to.equal('60:00');
        });
        it('should return "0" if BeginParty or EndGame logs are missing', () => {
            const logs = [
                { type: LogTypeEvent.EndGame, time: '2023-11-28T12:30:00Z' },
                { type: LogTypeEvent.EndFight, time: '2023-11-28T13:00:00Z' },
            ];
            const duration = PartyHelper.getPartyDuration(logs as any);
            expect(duration).to.equal('0');
        });
    });

    describe('sendEvent', () => {
        it('should send event to a specific room', () => {
            const sioStub = { to: sinon.stub().returnsThis(), emit: sinon.stub() };
            PartyHelper.init(sioStub as any);
            PartyHelper.sendEvent('roomId', WsEventClient.UpdateRemainTime, { time: 10 });
            sinon.assert.calledWith(sioStub.to, 'roomId');
            sinon.assert.calledWith(sioStub.emit, WsEventClient.UpdateRemainTime, { time: 10 });
        });
        it('should send event to a specific room excluding another room', () => {
            const sioStub = { to: sinon.stub().returnsThis(), except: sinon.stub().returnsThis(), emit: sinon.stub() };
            PartyHelper.init(sioStub as any);
            PartyHelper.sendEvent('roomId', WsEventClient.UpdateRemainTime, { time: 10 }, 'excludeRoomId');
            sinon.assert.calledWith(sioStub.to, 'roomId');
            sinon.assert.calledWith(sioStub.except, 'excludeRoomId');
            sinon.assert.calledWith(sioStub.emit, WsEventClient.UpdateRemainTime, { time: 10 });
        });
    });
    describe('removePlayerFromParty', () => {
        it('should remove player from a specific party', () => {
            const sioStub = { in: sinon.stub().returnsThis(), socketsLeave: sinon.stub() };
            PartyHelper.init(sioStub as any);
            PartyHelper.removePlayerFromParty('playerId', 'partyId');
            sinon.assert.calledWith(sioStub.in, 'playerId');
            sinon.assert.calledWith(sioStub.socketsLeave, 'partyId');
        });
    });
    describe('disconnectSocketsFromParty', () => {
        it('should disconnect all sockets from a specific party', () => {
            const sioStub = { socketsLeave: sinon.stub() };
            PartyHelper.init(sioStub as any);
            PartyHelper.disconnectSocketsFromParty('partyId');
            sinon.assert.calledWith(sioStub.socketsLeave, 'partyId');
        });
    });
});
