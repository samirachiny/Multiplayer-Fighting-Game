/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { GiveUpActionHandler } from '@app/classes/action-handler/give-up-action-handler/give-up-action-handler';
import { PartyService } from '@app/services/party/party.service';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient } from '@common/enums/web-socket-event';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { Coordinate } from '@common/interfaces/coordinate';

describe('GiveUpActionHandler', () => {
    let giveUpActionHandler: GiveUpActionHandler;
    let mockPartyService: sinon.SinonStubbedInstance<PartyService>;
    let mockTurnManager: sinon.SinonStubbedInstance<TurnManager>;
    let mockRespawnManager: sinon.SinonStubbedInstance<RespawnManager>;
    let mockPartyEventListener: sinon.SinonStubbedInstance<PartyEventListener>;
    let sioStub: any;
    const mockPartyId = 'party1';
    const mockPlayerId = 'player1';
    const mockPosition: Coordinate = { x: 5, y: 5 };
    const mockPlayer: PlayerInfos = {
        pid: mockPlayerId,
        name: 'Test Player',
        currentPosition: mockPosition,
        startPosition: mockPosition,
        items: [],
        hasFlag: false,
        isVirtualPlayer: false,
    } as PlayerInfos;

    beforeEach(() => {
        mockPartyService = sinon.createStubInstance(PartyService);
        mockTurnManager = sinon.createStubInstance(TurnManager);
        mockRespawnManager = sinon.createStubInstance(RespawnManager);
        mockPartyEventListener = sinon.createStubInstance(PartyEventListener);

        sioStub = {
            to: sinon.stub().returnsThis(),
            emit: sinon.stub().returnsThis(),
        };
        PartyHelper.init(sioStub);

        giveUpActionHandler = new GiveUpActionHandler(mockPartyId, mockTurnManager, mockRespawnManager);
        (giveUpActionHandler as any).partyService = mockPartyService;
        (giveUpActionHandler as any).partyEventListener = mockPartyEventListener;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('giveUp', () => {
        it('should return false if player has already given up', () => {
            mockPartyService.getPlayer.returns({ isGiveUp: true } as PlayerInfos);
            const result = giveUpActionHandler.giveUp(mockPlayerId);
            expect(result).to.equal(false);
        });

        it('should process give up and return true if only one player is left', () => {
            mockPartyService.getPlayer.returns({ isGiveUp: false } as PlayerInfos);
            sinon.stub(giveUpActionHandler as any, 'isOnlyOnePlayerLeft').returns(true);
            const sendAllPlayerGiveUpSignalSpy = sinon.spy(giveUpActionHandler as any, 'sendAllPlayerGiveUpSignal');
            const result = giveUpActionHandler.giveUp(mockPlayerId);
            expect(sendAllPlayerGiveUpSignalSpy.calledOnce).to.equal(true);
            expect(result).to.equal(true);
        });

        it('should process give up and return true if only virtual players are left', () => {
            mockPartyService.getPlayers.returns([mockPlayer]);
            mockPartyService.getPlayer.returns({ isGiveUp: false } as PlayerInfos);
            sinon.stub(giveUpActionHandler as any, 'isOnlyVirtualPlayersLeft').returns(true);
            const sendAllPlayerGiveUpSignalSpy = sinon.spy(giveUpActionHandler as any, 'sendAllPlayerGiveUpSignal');
            const result = giveUpActionHandler.giveUp(mockPlayerId);
            expect(sendAllPlayerGiveUpSignalSpy.calledOnce).to.equal(true);
            expect(result).to.equal(true);
        });

        it('should deactivate debug mode if conditions are met', () => {
            mockPartyService.getPlayer.returns({ isGiveUp: false } as PlayerInfos);
            sinon.stub(giveUpActionHandler as any, 'isOnlyOnePlayerLeft').returns(false);
            sinon.stub(giveUpActionHandler as any, 'isOnlyVirtualPlayersLeft').returns(false);
            const deactivateDebugModeSpy = sinon.spy(giveUpActionHandler as any, 'deactivateDebugModeIfNeeded');
            giveUpActionHandler.giveUp(mockPlayerId);
            expect(deactivateDebugModeSpy.calledWith(mockPlayerId)).to.equal(true);
        });

        it('should handle end round if current player gives up', () => {
            mockPartyService.getPlayer.returns({ isGiveUp: false, isCurrentPlayer: true } as PlayerInfos);
            sinon.stub(giveUpActionHandler as any, 'isOnlyOnePlayerLeft').returns(false);
            sinon.stub(giveUpActionHandler as any, 'isOnlyVirtualPlayersLeft').returns(false);
            const handleEndRoundSpy = sinon.spy(giveUpActionHandler as any, 'handleEndRoundIfCurrentPlayer');
            giveUpActionHandler.giveUp(mockPlayerId);
            expect(handleEndRoundSpy.calledWith(mockPlayerId)).to.equal(true);
        });
    });

    describe('isPlayerAlreadyGivenUp', () => {
        it('should return true if player does not exist', () => {
            mockPartyService.getPlayer.returns(null);
            const result = (giveUpActionHandler as any).isPlayerAlreadyGivenUp(mockPlayerId);
            expect(result).to.equal(true);
        });

        it('should return true if player has already given up', () => {
            mockPartyService.getPlayer.returns({ isGiveUp: true } as PlayerInfos);
            const result = (giveUpActionHandler as any).isPlayerAlreadyGivenUp(mockPlayerId);
            expect(result).to.equal(true);
        });

        it('should return false if player has not given up', () => {
            mockPartyService.getPlayer.returns({ isGiveUp: false } as PlayerInfos);
            const result = (giveUpActionHandler as any).isPlayerAlreadyGivenUp(mockPlayerId);
            expect(result).to.equal(false);
        });
    });

    describe('isOnlyOnePlayerLeft', () => {
        it('should return true if only one active player is left', () => {
            mockPartyService.getPlayers.returns([
                {
                    isGiveUp: false,
                    pid: '',
                    name: '',
                    character: undefined,
                    isOrganizer: false,
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
                {
                    isGiveUp: true,
                    pid: '',
                    name: '',
                    character: undefined,
                    isOrganizer: false,
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
            ]);
            const result = (giveUpActionHandler as any).isOnlyOnePlayerLeft();
            expect(result).to.equal(true);
        });

        it('should return false if more than one active player is left', () => {
            mockPartyService.getPlayers.returns([
                {
                    isGiveUp: false,
                    pid: '',
                    name: '',
                    character: undefined,
                    isOrganizer: false,
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
                {
                    isGiveUp: false,
                    pid: '',
                    name: '',
                    character: undefined,
                    isOrganizer: false,
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
            ]);
            const result = (giveUpActionHandler as any).isOnlyOnePlayerLeft();
            expect(result).to.equal(false);
        });
    });

    describe('isOnlyVirtualPlayersLeft', () => {
        it('should return true if all active players are virtual', () => {
            mockPartyService.getPlayers.returns([
                {
                    isVirtualPlayer: true,
                    isGiveUp: false,
                    pid: '',
                    name: '',
                    character: undefined,
                    isOrganizer: false,
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
                {
                    isGiveUp: true,
                    pid: '',
                    name: '',
                    character: undefined,
                    isOrganizer: false,
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
            ]);
            const result = (giveUpActionHandler as any).isOnlyVirtualPlayersLeft();
            expect(result).to.equal(true);
        });

        it('should return false if there are active human players', () => {
            mockPartyService.getPlayers.returns([
                {
                    isVirtualPlayer: false,
                    isGiveUp: false,
                    pid: '',
                    name: '',
                    character: undefined,
                    isOrganizer: false,
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
                {
                    isGiveUp: true,
                    pid: '',
                    name: '',
                    character: undefined,
                    isOrganizer: false,
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
            ]);
            const result = (giveUpActionHandler as any).isOnlyVirtualPlayersLeft();
            expect(result).to.equal(false);
        });
    });

    describe('deactivateDebugModeIfNeeded', () => {
        it('should not deactivate debug mode if player is not the organizer', () => {
            mockPartyService.getPlayer.returns({ isOrganizer: false } as PlayerInfos);
            mockPartyService.isDebugMode.returns(true);
            (giveUpActionHandler as any).deactivateDebugModeIfNeeded(mockPlayerId);
            expect(mockPartyService.setPartyDebugMode.called).to.equal(false);
        });

        it('should deactivate debug mode if player is the organizer and debug mode is active', () => {
            mockPartyService.getPlayer.returns({ isOrganizer: true } as PlayerInfos);
            mockPartyService.isDebugMode.returns(true);
            (giveUpActionHandler as any).deactivateDebugModeIfNeeded(mockPlayerId);
            expect(mockPartyService.setPartyDebugMode.calledWith(mockPartyId, false)).to.equal(true);
        });
    });

    describe('sendAllPlayerGiveUpSignal', () => {
        it('should send ALL_PLAYER_GIVE_UP event', () => {
            const sendEventSpy = sinon.spy(PartyHelper, 'sendEvent');
            (giveUpActionHandler as any).sendAllPlayerGiveUpSignal();
            expect(sendEventSpy.calledWith(mockPartyId, WsEventClient.AllPlayersGaveUp)).to.equal(true);
        });
    });

    describe('handleEndRoundIfCurrentPlayer', () => {
        it('should end round if player is current player', () => {
            mockPartyService.getPlayer.returns({ isCurrentPlayer: true } as PlayerInfos);
            (giveUpActionHandler as any).handleEndRoundIfCurrentPlayer(mockPlayerId);
            expect(mockTurnManager.endRound.calledWith(mockPlayerId)).to.equal(true);
        });

        it('should do nothing if player is not current player', () => {
            mockPartyService.getPlayer.returns({ isCurrentPlayer: false } as PlayerInfos);
            (giveUpActionHandler as any).handleEndRoundIfCurrentPlayer(mockPlayerId);
            expect(mockTurnManager.endRound.called).to.equal(false);
        });
    });

    describe('isUnableToDeactivateDebugMode', () => {
        it('should return true if player does not exist', () => {
            mockPartyService.getPlayer.returns(null);
            const result = (giveUpActionHandler as any).isUnableToDeactivateDebugMode(mockPlayerId);
            expect(result).to.equal(true);
        });

        it('should return true if player is not the organizer', () => {
            mockPartyService.getPlayer.returns({ isOrganizer: false } as PlayerInfos);
            mockPartyService.isDebugMode.returns(true);
            const result = (giveUpActionHandler as any).isUnableToDeactivateDebugMode(mockPlayerId);
            expect(result).to.equal(true);
        });

        it('should return true if debug mode is not active', () => {
            mockPartyService.getPlayer.returns({ isOrganizer: true } as PlayerInfos);
            mockPartyService.isDebugMode.returns(false);
            const result = (giveUpActionHandler as any).isUnableToDeactivateDebugMode(mockPlayerId);
            expect(result).to.equal(true);
        });

        it('should return false if player is the organizer and debug mode is active', () => {
            mockPartyService.getPlayer.returns({ isOrganizer: true } as PlayerInfos);
            mockPartyService.isDebugMode.returns(true);
            const result = (giveUpActionHandler as any).isUnableToDeactivateDebugMode(mockPlayerId);
            expect(result).to.equal(false);
        });
    });
});
