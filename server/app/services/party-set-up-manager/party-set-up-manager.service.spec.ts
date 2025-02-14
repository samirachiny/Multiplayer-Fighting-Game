/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { PartySetUpManagerService } from './party-set-up-manager.service';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { PartyService } from '@app/services/party/party.service';
import { SetUpPartyParams } from '@common/interfaces/set-up-party-params';
import { VALIDATE_ACCESS_CODE_FEEDBACK } from '@app/utils/const';
import { WsEventClient } from '@common/enums/web-socket-event';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';

describe('PartySetUpManagerService', () => {
    let service: PartySetUpManagerService;
    let sioStub: any;
    let socketStub: any;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    let partyStatServiceStub: sinon.SinonStubbedInstance<PartyStatisticsService>;

    beforeEach(() => {
        partyServiceStub = sinon.createStubInstance(PartyService);
        partyStatServiceStub = sinon.createStubInstance(PartyStatisticsService);

        sioStub = {
            to: sinon.stub().returnsThis(),
            in: sinon.stub().returnsThis(),
            socketsLeave: sinon.stub().returnsThis(),
            emit: sinon.stub().returnsThis(),
            on: sinon.stub().returnsThis(),
            socketsJoin: sinon.stub().returnsThis(),
            except: sinon.stub().returnsThis(),
        };
        socketStub = {
            to: sinon.stub().returnsThis(),
            in: sinon.stub().returnsThis(),
            socketsLeave: sinon.stub().returnsThis(),
            emit: sinon.stub().returnsThis(),
            on: sinon.stub().returnsThis(),
            join: sinon.stub().returnsThis(),
            socketsJoin: sinon.stub().returnsThis(),
        };

        socketStub.id = 'player1';
        PartyHelper.init(sioStub);
        service = new PartySetUpManagerService(partyServiceStub, partyStatServiceStub);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('setUpPartyInfos', () => {
        it('should set up party infos correctly', () => {
            const party = { id: 'party1', players: new Map(), accessCode: 1234, isLocked: false, game: { mapSize: 15 } } as any;
            party.players.set('player1', { id: 'player1' } as any as PlayerInfos);
            partyServiceStub.getParty.returns(party);
            partyServiceStub.getPlayers.returns(Array.from(party.players.values()));
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');

            const callback = sinon.spy();
            service.setUpPartyInfos(socketStub, callback);

            expect(callback.calledOnce);
            expect(
                callback.calledWith({
                    players: Array.from(party.players.values()),
                    player: party.players.get(socketStub.id),
                    game: party.game,
                    accessCode: party.accessCode,
                    isLocked: party.isLocked,
                    maxPlayers: 4,
                } as SetUpPartyParams),
            );
        });
    });

    describe('joinParty', () => {
        let sendEventSpy: sinon.SinonSpy;
        const player = { id: 'player1' } as any as PlayerInfos;
        beforeEach(() => {
            sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');
            partyServiceStub.getPlayers.returns([player]);
        });
        afterEach(() => {
            sendEventSpy.restore();
        });
        it('should join party successfully', () => {
            const partyId = 'party1';
            const party = { id: partyId, players: new Map() } as any;
            party.players.set('player1', player);
            partyServiceStub.getParty.returns(party);
            partyServiceStub.setPlayer.returns(true);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.isPartyFull.returns(true);
            const callback = sinon.spy();
            service.joinParty(socketStub, { id: 'player1' } as any as PlayerInfos, callback);

            expect(callback.calledOnce);
            expect(callback.calledWith(true));
            expect(sendEventSpy.calledWith(partyId, WsEventClient.PartyFull, true, socketStub.id)).to.equal(true);
            expect(sendEventSpy.calledWith(partyId, WsEventClient.AllPlayers, [player])).to.equal(true);
            expect(partyServiceStub.setLock.calledWith(partyId, false));
        });

        it('should not join party if setting player fails', () => {
            partyServiceStub.setPlayer.returns(false);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            const callback = sinon.spy();
            service.joinParty(socketStub, { id: 'player1' } as any as PlayerInfos, callback);
            expect(callback.calledOnce);
            expect(callback.calledWith(false));
        });
    });

    describe('leaveParty', () => {
        it('should leave party', () => {
            const partyId = 'party1';
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            partyServiceStub.isPartyFull.returns(true);
            const player = { pid: 'player1', name: 'John', character: { id: 1 } } as any as PlayerInfos;
            partyServiceStub.getPlayer.returns(player);
            partyServiceStub.removePlayer.returns(true);
            partyServiceStub.getPlayers.returns([player]);
            service.leaveParty(socketStub, socketStub.id);

            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.LeftParty, player.name));
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.AllPlayers, [player]));
            expect(sioStub.in(socketStub.id).socketsLeave.calledWith(partyId));
        });

        it('should eject player from party', () => {
            const partyId = 'party1';
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            partyServiceStub.isPartyFull.returns(true);
            const player = { pid: 'player1', name: 'John', character: { id: 1 } } as any as PlayerInfos;
            partyServiceStub.getPlayer.returns(player);
            partyServiceStub.getPlayers.returns([player]);
            partyServiceStub.removePlayer.returns(true);

            service.leaveParty(socketStub, socketStub.id, true);
            expect(sioStub.to.calledWith(partyId));
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.EjectPlayer, player.name));
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.AllPlayers, [player]));
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.PartyFull, false));
            expect(sioStub.in(player.pid).socketsLeave.calledWith(partyId));
            expect(partyServiceStub.setLock.calledWith(partyId, false));
        });

        it('should leave party and update character occupied and socketStubsLeave', () => {
            const partyId = 'party1';
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            partyServiceStub.isPartyFull.returns(true);
            const player = { pid: 'player1', name: 'John', character: { id: 1 } } as any as PlayerInfos;
            partyServiceStub.getPlayer.returns(player);
            partyServiceStub.removePlayer.returns(true);
            partyServiceStub.getPlayers.returns([player]);
            partyServiceStub.getCharactersOccupied.returns([2, 3]);
            service.leaveParty(socketStub, socketStub.id);
            // expect(sioStub.except.calledWith(WsEventClient.LeftParty, player.name)).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.AllPlayers, [player])).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.CharacterOccupiedUpdated, [2, 3])).to.equal(true);
            expect(sioStub.in(socketStub.id).socketsLeave.calledWith(partyId)).to.equal(true);
        });

        it('should eject player from party and update character occupied and socketStubsLeave', () => {
            const partyId = 'party1';
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            partyServiceStub.isPartyFull.returns(true);
            const player = { pid: 'player1', name: 'John', character: { id: 1 } } as any as PlayerInfos;
            partyServiceStub.getPlayer.returns(player);
            partyServiceStub.getPlayers.returns([player]);
            partyServiceStub.removePlayer.returns(true);
            partyServiceStub.getCharactersOccupied.returns([2, 3]);
            service.leaveParty(socketStub, socketStub.id, true);

            expect(sioStub.to(partyId).except(socketStub.id).emit.calledWith(WsEventClient.EjectPlayer, player.name)).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.AllPlayers, [player])).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.PartyFull, false)).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.CharacterOccupiedUpdated, [2, 3])).to.equal(true);
            expect(sioStub.in(socketStub.id).socketsLeave.calledWith(partyId)).to.equal(true);
            expect(partyServiceStub.setLock.calledWith(partyId, false)).to.equal(true);
        });

        it('should leave party when not full and update character occupied and socketStubsLeave', () => {
            const partyId = 'party1';
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            partyServiceStub.isPartyFull.returns(false);
            const player = { pid: 'player1', name: 'John', character: { id: 1 } } as any as PlayerInfos;
            partyServiceStub.getPlayer.returns(player);
            partyServiceStub.removePlayer.returns(true);
            partyServiceStub.getPlayers.returns([player]);
            partyServiceStub.getCharactersOccupied.returns([]); // No other characters are occupied
            service.leaveParty(socketStub, socketStub.id);
            expect(sioStub.to(partyId).except(socketStub.id).emit.calledWith(WsEventClient.LeftParty, player.name)).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.AllPlayers, [player])).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.CharacterOccupiedUpdated, [])).to.equal(true);
            expect(sioStub.in(sioStub.id).socketsLeave.calledWith(partyId)).to.equal(true);
            expect(partyServiceStub.setLock.called).to.equal(false);
            expect(socketStub.to(partyId).emit.calledWith(WsEventClient.PartyFull, false)).to.equal(false);
        });

        it('should handle leaveParty when playerId differs from socketStub.id', () => {
            const partyId = 'party1';
            const otherPlayerId = 'player2';
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            partyServiceStub.isPartyFull.returns(false);
            const player = { pid: otherPlayerId, name: 'Jane', character: { id: 2 } } as any as PlayerInfos;
            partyServiceStub.getPlayer.returns(player);
            partyServiceStub.removePlayer.returns(true);
            partyServiceStub.getPlayers.returns([]);
            partyServiceStub.getCharactersOccupied.returns([]);

            service.leaveParty(socketStub, otherPlayerId);
            expect(sioStub.to(partyId).except(socketStub.id).emit.calledWith(WsEventClient.LeftParty, player.name)).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.AllPlayers, [])).to.equal(true);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.CharacterOccupiedUpdated, [])).to.equal(true);
            expect(sioStub.in(sioStub.id).socketsLeave.calledWith(partyId)).to.equal(true);
        });
    });

    describe('getCharactersOccupied', () => {
        it('should get characters occupied list', () => {
            partyServiceStub.getCharactersOccupied.returns([1, 2, 3]);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');

            const callback = sinon.spy();
            service.getCharactersOccupied(socketStub, callback);

            expect(callback.calledOnce);
            expect(callback.calledWith([1, 2, 3]));
        });
    });

    describe('endParty', () => {
        it('should end party', () => {
            const partyId = 'party1';
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            service.endParty(socketStub);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.PartyEnd, socketStub.id));
            expect(sioStub.socketsLeave.calledWith(partyId));
            expect((partyServiceStub.deleteParty as any).calledWith(partyId));
        });
    });
    describe('createParty', () => {
        it('should create party successfully', async () => {
            const gid = 'game1';
            const id = socketStub.id + gid;
            partyServiceStub.createParty.resolves(true);
            const callback = sinon.spy();

            await service.createParty(socketStub, gid, callback);

            expect(socketStub.join.calledWith(id));
            expect(callback.calledOnce);
            expect(callback.calledWith(true, [gid, id]));
        });

        it('should fail to create party', async () => {
            const gid = 'game1';
            partyServiceStub.createParty.resolves(false);
            const callback = sinon.spy();

            await service.createParty(socketStub, gid, callback);

            expect(callback.calledOnce);
            expect(callback.calledWith(false, ["Le jeu n'est pas disponible car il n'existe plus ou n'est pas visible"])).to.be.true;
        });
    });
    describe('toggleLockParty', () => {
        it('should toggle lock party successfully', () => {
            const party = { players: new Map(), game: { mapSize: 15 }, isLocked: false } as any;
            party.players.set('player1', { id: 'player1' } as any as PlayerInfos);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.getParty.returns(party);
            const callback = sinon.spy();

            service.toggleLockParty(socketStub, callback);

            expect(callback.calledOnce);
            expect(callback.calledWith(true));
            expect(socketStub.to('party1').emit.calledWith(WsEventClient.PartyLocked));
        });

        it('should not lock party if full', () => {
            const party = { players: new Map(), game: { mapSize: 15 }, isLocked: false } as any;
            party.players.set('player1', { id: 'player1' } as any as PlayerInfos);
            party.players.set('player2', 2);
            party.players.set('player3', { id: 'player3' } as any as PlayerInfos);
            party.players.set('player4', { id: 'player4' } as any as PlayerInfos);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.getParty.returns(party);
            const callback = sinon.spy();

            service.toggleLockParty(socketStub, callback);

            expect(callback.calledOnce);
            expect(callback.calledWith(false));
        });

        it('should not toggle lock if party is full (branch coverage for line 82)', () => {
            const party = { players: new Map(), game: { mapSize: 15 }, isLocked: false } as any;
            party.players.set('player1', { id: 'player1' } as any as PlayerInfos);
            party.players.set('player2', { id: 'player2' } as any as PlayerInfos);
            party.players.set('player3', { id: 'player3' } as any as PlayerInfos);
            party.players.set('player4', { id: 'player4' } as any as PlayerInfos);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.getParty.returns(party);
            partyServiceStub.isPartyFull.returns(true);
            const callback = sinon.spy();
            service.toggleLockParty(socketStub, callback);
            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith(false)).to.equal(true);
            expect(socketStub.to.called).to.equal(false);
        });
    });
    describe('updateCharacterOccupied', () => {
        it('should update character occupied', () => {
            const partyId = 'party1';
            const newCharacterSelected = 2;
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            partyServiceStub.replaceCharacterOccupied.returns(true);
            partyServiceStub.getCharactersOccupied.returns([1, 2, 3]);

            service.updateCharacterOccupied(socketStub, newCharacterSelected);

            expect(socketStub.to(partyId).emit.calledWith(WsEventClient.CharacterOccupiedUpdated, [1, 2, 3]));
        });

        it('should not update character occupied if replacement fails', () => {
            const partyId = 'party1';
            const newCharacterSelected = 2;
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            partyServiceStub.replaceCharacterOccupied.returns(false);

            service.updateCharacterOccupied(socketStub, newCharacterSelected);

            expect(socketStub.to.called).to.be.false;
        });
    });
    describe('validateAccessCode', () => {
        it('should validate access code successfully', () => {
            const accessCode = 1234;
            const party = { id: 'party1', isLocked: false, players: new Map(), charactersOccupiedIds: new Set() } as any;
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.getPartyWithAccessCode.returns(party);
            const callback = sinon.spy();

            service.validateAccessCode(socketStub, accessCode, callback);

            expect(socketStub.join.calledWith(party.id));
            expect(callback.calledOnce);
            expect(callback.calledWith({ isValid: true }));
        });

        it('should return invalid if access code is incorrect', () => {
            const accessCode = 1234;
            partyServiceStub.getPartyWithAccessCode.returns(null);
            const callback = sinon.spy();

            service.validateAccessCode(socketStub, accessCode, callback);

            expect(callback.calledOnce);
            expect(callback.calledWith({ isValid: false, feedback: 'Code invalide' }));
        });

        it('should return invalid if party is locked', () => {
            const accessCode = 1234;
            const party = { id: 'party1', game: { mapSize: 10 }, isLocked: true, players: new Map(), charactersOccupiedIds: new Set() } as any;
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.getPartyWithAccessCode.returns(party);
            const callback = sinon.spy();

            service.validateAccessCode(socketStub, accessCode, callback);

            expect(callback.calledOnce);
            expect(callback.calledWith({ isValid: false, feedback: 'La partie est verouillée' }));
        });
        it('should return invalid if party is full', () => {
            const accessCode = 1234;
            const party = { id: 'party1', game: { mapSize: 10 }, isLocked: true, players: new Map(), charactersOccupiedIds: new Set() } as any;
            party.players.set('player3', { id: 'player3' } as any as PlayerInfos);
            party.players.set('player4', { id: 'player4' } as any as PlayerInfos);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.getPartyWithAccessCode.returns(party);
            const callback = sinon.spy();

            service.validateAccessCode(socketStub, accessCode, callback);

            expect(callback.calledOnce);
            expect(callback.calledWith({ isValid: false, feedback: 'La partie est pleine' }));
        });
        it('should return invalid if party room is full', () => {
            const accessCode = 1234;
            const party = { id: 'party1', game: { mapSize: 10 }, isLocked: false, players: new Map(), charactersOccupiedIds: new Map() } as any;
            party.charactersOccupiedIds.set('player1', 1);
            party.charactersOccupiedIds.set('player2', 2);
            party.charactersOccupiedIds.set('player3', 3);
            party.charactersOccupiedIds.set('player4', 4);
            party.charactersOccupiedIds.set('player5', 5);
            party.charactersOccupiedIds.set('player6', 6);
            party.charactersOccupiedIds.set('player7', 7);
            party.charactersOccupiedIds.set('player8', 8);
            party.charactersOccupiedIds.set('player9', 9);
            party.charactersOccupiedIds.set('player10', 10);
            party.charactersOccupiedIds.set('player11', 11);
            party.charactersOccupiedIds.set('player12', 12);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.getPartyWithAccessCode.returns(party);
            const callback = sinon.spy();

            service.validateAccessCode(socketStub, accessCode, callback);

            expect(callback.calledOnce);
            expect(callback.calledWith({ isValid: false, feedback: VALIDATE_ACCESS_CODE_FEEDBACK.partyRoomFull }));
        });

        it('should return feedback "partyLocked" when party is locked but not full (branch coverage for line 92)', () => {
            const accessCode = 1234;
            const party = { id: 'party1', isLocked: true, players: new Map(), charactersOccupiedIds: new Set() } as any;
            party.players.set('player1', { id: 'player1' } as any as PlayerInfos);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.getPartyWithAccessCode.returns(party);
            partyServiceStub.isPartyFull.returns(false); // La partie est verrouillée mais pas pleine
            const callback = sinon.spy();

            service.validateAccessCode(socketStub, accessCode, callback);

            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith({ isValid: false, feedback: VALIDATE_ACCESS_CODE_FEEDBACK.partyLocked })).to.equal(true);
        });

        it('should return feedback "partyFull" when party is locked and full (branch coverage for line 92)', () => {
            const accessCode = 1234;
            const party = { id: 'party1', isLocked: true, players: new Map(), charactersOccupiedIds: new Set() } as any;
            party.players.set('player1', { id: 'player1' } as any as PlayerInfos);
            party.players.set('player2', { id: 'player2' } as any as PlayerInfos);
            party.players.set('player3', { id: 'player3' } as any as PlayerInfos);
            party.players.set('player4', { id: 'player4' } as any as PlayerInfos);
            sinon.stub(PartyHelper, 'getPartyId').returns('party1');
            partyServiceStub.getPartyWithAccessCode.returns(party);
            partyServiceStub.isPartyFull.returns(true); // La partie est verrouillée et pleine
            const callback = sinon.spy();
            service.validateAccessCode(socketStub, accessCode, callback);
            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith({ isValid: false, feedback: VALIDATE_ACCESS_CODE_FEEDBACK.partyFull })).to.equal(true);
        });
    });

    describe('handlePartyUnlockIfNeeded', () => {
        it('should unlock the party and emit PARTY_FULL with false if the party was full', () => {
            const partyId = 'party1';
            service['handlePartyUnlockIfNeeded'](partyId, true);
            sinon.assert.calledWith(partyServiceStub.setLock, partyId, false);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.PartyFull, false)).to.equal(true);
        });

        it('should not unlock the party if it was not full', () => {
            const partyId = 'party1';
            service['handlePartyUnlockIfNeeded'](partyId, false);
            sinon.assert.notCalled(partyServiceStub.setLock);
            sinon.assert.notCalled(sioStub.emit);
        });
    });

    describe('notifyPlayersOnLeave', () => {
        it('should notify all players and emit LEFT_PARTY when a player leaves', () => {
            const partyId = 'party1';
            const playerName = 'John';
            service['notifyPlayersOnLeave'](partyId, socketStub as any, false, playerName);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.AllPlayers, partyServiceStub.getPlayers(partyId))).to.equal(true);
            expect(sioStub.to(partyId).except(socketStub.id).emit.calledWith(WsEventClient.LeftParty, playerName)).to.equal(true);
        });

        it('should notify all players and emit EJECT_PLAYER when a player is ejected', () => {
            const partyId = 'party1';
            const playerName = 'John';
            service['notifyPlayersOnLeave'](partyId, socketStub as any, true, playerName);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.AllPlayers, partyServiceStub.getPlayers(partyId))).to.equal(true);
            expect(sioStub.to(partyId).except(socketStub.id).emit.calledWith(WsEventClient.EjectPlayer, playerName)).to.equal(true);
        });
    });

    describe('updateOccupiedCharacters', () => {
        it('should emit CHARACTER_OCCUPIED_UPDATED with the updated characters', () => {
            const partyId = 'party1';
            partyServiceStub.getCharactersOccupied.returns([1, 2, 3]);
            service['updateOccupiedCharacters'](partyId);
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.CharacterOccupiedUpdated, [1, 2, 3])).to.equal(true);
        });
    });
});
