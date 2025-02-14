/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as io from 'socket.io';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { PartyService } from '@app/services/party/party.service';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient } from '@common/enums/web-socket-event';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { Dice } from '@common/enums/dice';
import { Character } from '@common/interfaces/character';
import { CHARACTERS } from '@common/constants/character';

describe('VirtualPlayerService', () => {
    let virtualPlayerService: VirtualPlayerService;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    let partyStatServiceStub: sinon.SinonStubbedInstance<PartyStatisticsService>;
    let sioStub: any;
    let socketStub: any;

    beforeEach(() => {
        partyServiceStub = sinon.createStubInstance(PartyService);
        partyStatServiceStub = sinon.createStubInstance(PartyStatisticsService);
        virtualPlayerService = new VirtualPlayerService(
            partyServiceStub as any as PartyService,
            partyStatServiceStub as any as PartyStatisticsService,
        );

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
        sinon.stub(console, 'log');
        PartyHelper.init(sioStub);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('addVirtualPlayer', () => {
        it('should add a virtual player successfully', () => {
            const partyId = 'party1';
            const profile = BotProfile.Aggressive;
            const virtualPlayer: PlayerInfos = {
                pid: 'virtualPlayer1',
                name: 'Bot1',
                character: { id: 1, name: 'Character1' } as Character,
                isOrganizer: false,
                isGiveUp: false,
                isCurrentPlayer: false,
                speed: 6,
                attack: 4,
                defense: 4,
                life: 6,
                wins: 0,
                items: [],
                availableMoves: 6,
                remainingAction: 1,
                diceAssignment: { attack: Dice.D4, defense: Dice.D6 },
                startPosition: null,
                currentPosition: null,
                previousPosition: null,
                isVirtualPlayer: true,
                virtualPlayerProfile: profile,
            };

            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            sinon.stub(virtualPlayerService as any, 'initializeVirtualPlayer').returns(virtualPlayer);
            partyServiceStub.setPlayer.returns(true);
            partyServiceStub.isPartyFull.returns(true);
            partyServiceStub.getPlayers.returns([virtualPlayer]);
            partyServiceStub.replaceCharacterOccupied.returns(true);
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');

            virtualPlayerService.addVirtualPlayer(socketStub as any as io.Socket, profile);

            expect(partyServiceStub.setPlayer.calledOnceWith(partyId, virtualPlayer.pid, virtualPlayer)).to.be.true;
            expect(partyStatServiceStub.setPlayerStatistic.calledOnceWith(partyId, virtualPlayer.pid, virtualPlayer.name)).to.be.true;
            expect(partyServiceStub.setLock.calledOnceWith(partyId, true)).to.be.true;
            expect(sendEventSpy.calledWith(partyId, WsEventClient.PartyFull, true)).to.be.true;
            expect(sendEventSpy.calledWith(partyId, WsEventClient.AllPlayers, [virtualPlayer])).to.be.true;
            expect(partyServiceStub.replaceCharacterOccupied.calledOnceWith(partyId, virtualPlayer.pid, virtualPlayer.character.id)).to.be.true;
            expect(sendEventSpy.calledWith(partyId, WsEventClient.CharacterOccupiedUpdated, partyServiceStub.getCharactersOccupied(partyId))).to.be
                .true;
        });

        it('should not add a virtual player if character is null', () => {
            const partyId = 'party1';
            const profile = BotProfile.Aggressive;
            const virtualPlayer: PlayerInfos = {
                pid: 'virtualPlayer1',
                name: 'Bot1',
                character: null,
                isOrganizer: false,
                isGiveUp: false,
                isCurrentPlayer: false,
                speed: 6,
                attack: 4,
                defense: 4,
                life: 6,
                wins: 0,
                items: [],
                availableMoves: 6,
                remainingAction: 1,
                diceAssignment: { attack: Dice.D4, defense: Dice.D6 },
                startPosition: null,
                currentPosition: null,
                previousPosition: null,
                isVirtualPlayer: true,
                virtualPlayerProfile: profile,
            };

            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            sinon.stub(virtualPlayerService as any, 'initializeVirtualPlayer').returns(virtualPlayer);

            virtualPlayerService.addVirtualPlayer(socketStub as any as io.Socket, profile);

            expect(partyServiceStub.setPlayer.called).to.be.false;
            expect(partyStatServiceStub.setPlayerStatistic.called).to.be.false;
        });

        it('should not add a virtual player if setPlayer fails', () => {
            const partyId = 'party1';
            const profile = BotProfile.Aggressive;
            const virtualPlayer: PlayerInfos = {
                pid: 'virtualPlayer1',
                name: 'Bot1',
                character: { id: 1, name: 'Character1' } as Character,
                isOrganizer: false,
                isGiveUp: false,
                isCurrentPlayer: false,
                speed: 6,
                attack: 4,
                defense: 4,
                life: 6,
                wins: 0,
                items: [],
                availableMoves: 6,
                remainingAction: 1,
                diceAssignment: { attack: Dice.D4, defense: Dice.D6 },
                startPosition: null,
                currentPosition: null,
                previousPosition: null,
                isVirtualPlayer: true,
                virtualPlayerProfile: profile,
            };
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            sinon.stub(virtualPlayerService as any, 'initializeVirtualPlayer').returns(virtualPlayer);
            partyServiceStub.setPlayer.returns(false);
            virtualPlayerService.addVirtualPlayer(socketStub as any as io.Socket, profile);
            expect(partyServiceStub.setPlayer.calledOnceWith(partyId, virtualPlayer.pid, virtualPlayer)).to.be.true;
            expect(partyStatServiceStub.setPlayerStatistic.called).to.be.false;
        });
        it('should not send CharacterOccupiedUpdated event if replaceCharacterOccupied fails', () => {
            const partyId = 'party1';
            const profile = BotProfile.Aggressive;
            const virtualPlayer: PlayerInfos = {
                pid: 'virtualPlayer1',
                name: 'Bot1',
                character: { id: 1, name: 'Character1' } as Character,
                isOrganizer: false,
                isGiveUp: false,
                isCurrentPlayer: false,
                speed: 6,
                attack: 4,
                defense: 4,
                life: 6,
                wins: 0,
                items: [],
                availableMoves: 6,
                remainingAction: 1,
                diceAssignment: { attack: Dice.D4, defense: Dice.D6 },
                startPosition: null,
                currentPosition: null,
                previousPosition: null,
                isVirtualPlayer: true,
                virtualPlayerProfile: profile,
            };
            sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            sinon.stub(virtualPlayerService as any, 'initializeVirtualPlayer').returns(virtualPlayer);
            partyServiceStub.setPlayer.returns(true);
            partyServiceStub.isPartyFull.returns(false);
            partyServiceStub.replaceCharacterOccupied.returns(false);
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');
            virtualPlayerService.addVirtualPlayer(socketStub as any as io.Socket, profile);
            expect(partyServiceStub.setPlayer.calledOnceWith(partyId, virtualPlayer.pid, virtualPlayer)).to.be.true;
            expect(partyStatServiceStub.setPlayerStatistic.calledOnceWith(partyId, virtualPlayer.pid, virtualPlayer.name)).to.be.true;
            expect(sendEventSpy.calledWith(partyId, WsEventClient.CharacterOccupiedUpdated)).to.be.false;
        });
    });

    describe('generateVirtualPlayerName', () => {
        it('should generate a valid virtual player name', () => {
            const partyId = 'party1';
            const botName = 'Bot1';
            sinon.stub(Math, 'random').returns(0.1);
            sinon.stub(PartyHelper, 'generateValidName').returns(botName);
            partyServiceStub.getPlayers.returns([]);
            const name = virtualPlayerService['generateVirtualPlayerName'](partyId);
            expect(name).to.equal(botName);
        });
    });
    describe('getRandomCharacter', () => {
        it('should return a random available character', () => {
            const partyId = 'party1';
            const availableCharacter = CHARACTERS[1];
            partyServiceStub.getCharactersOccupied.returns([1]);
            sinon.stub(Math, 'random').returns(0);
            const character = virtualPlayerService['getRandomCharacter'](partyId);
            expect(character).to.equal(availableCharacter);
            sinon.restore();
        });

        it('should return null if no characters are available', () => {
            const partyId = 'party1';
            partyServiceStub.getCharactersOccupied.returns(CHARACTERS.map((_, index) => index + 1));
            const character = virtualPlayerService['getRandomCharacter'](partyId);
            expect(character).to.be.null;
        });
    });

    describe('generateRandomPid', () => {
        let randomPidSet: Set<string>;

        beforeEach(() => {
            randomPidSet = new Set();
        });

        it('should generate a string of correct length', () => {
            const pid = virtualPlayerService['generateRandomPid']();
            expect(pid).to.be.a('string');
            expect(pid.length).to.equal(9);
        });

        it('should generate unique values on multiple calls', () => {
            const numberOfPids = 5;
            for (let i = 0; i < numberOfPids; i++) {
                const pid = virtualPlayerService['generateRandomPid']();
                expect(randomPidSet.has(pid)).to.be.false;
                randomPidSet.add(pid);
            }
        });

        it('should contain only alphanumeric characters', () => {
            const pid = virtualPlayerService['generateRandomPid']();
            expect(pid).to.match(/^[a-z0-9]+$/i);
        });
    });

    describe('getRandomAttributes', () => {
        it('should return random attributes with increased value', () => {
            sinon.stub(Math, 'random').returns(0.5);
            const attributes = virtualPlayerService['getRandomAttributes']();
            expect(attributes).to.deep.equal({ speed: 4, life: 6 });
        });
    });

    describe('getRandomDiceAssignment', () => {
        it('should return a random dice assignment', () => {
            sinon.stub(Math, 'random').returns(0.1);
            const diceAssignment = virtualPlayerService['getRandomDiceAssignment']();
            expect(diceAssignment).to.deep.equal({ attack: Dice.D4, defense: Dice.D6 });
        });
    });

    describe('initializeVirtualPlayer', () => {
        it('should initialize a virtual player with random attributes', () => {
            const partyId = 'party1';
            const profile = BotProfile.Aggressive;
            const randomAttributes = { speed: 6, life: 6 };
            const randomDiceAssignment = { attack: Dice.D4, defense: Dice.D6 };
            const randomCharacter = { id: 1, name: 'Character1' } as Character;

            sinon.stub(virtualPlayerService as any, 'getRandomAttributes').returns(randomAttributes);
            sinon.stub(virtualPlayerService as any, 'generateRandomPid').returns('virtualPlayer1');
            sinon.stub(virtualPlayerService as any, 'generateVirtualPlayerName').returns('Bot1');
            sinon.stub(virtualPlayerService as any, 'getRandomCharacter').returns(randomCharacter);
            sinon.stub(virtualPlayerService as any, 'getRandomDiceAssignment').returns(randomDiceAssignment);

            const virtualPlayer = virtualPlayerService['initializeVirtualPlayer'](partyId, profile);

            expect(virtualPlayer.pid).to.equal('virtualPlayer1');
            expect(virtualPlayer.name).to.equal('Bot1');
            expect(virtualPlayer.character).to.equal(randomCharacter);
            expect(virtualPlayer.speed).to.equal(randomAttributes.speed);
            expect(virtualPlayer.life).to.equal(randomAttributes.life);
            expect(virtualPlayer.diceAssignment).to.equal(randomDiceAssignment);
            expect(virtualPlayer.isVirtualPlayer).to.be.true;
            expect(virtualPlayer.virtualPlayerProfile).to.equal(profile);
        });
    });
});
