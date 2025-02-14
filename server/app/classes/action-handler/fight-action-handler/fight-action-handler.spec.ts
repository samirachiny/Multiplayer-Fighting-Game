/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { FightActionHandler } from './fight-action-handler';
import { CombatManager } from '@app/classes/combat-manager/combat-manager';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { PartyService } from '@app/services/party/party.service';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { EventEmitter } from 'events';
import { Coordinate } from '@common/interfaces/coordinate';
import { PlayerInfos, Fighter } from '@common/interfaces/player-infos';
import { LogTypeEvent } from '@common/enums/log-type';
import { Container } from 'typedi';

describe('FightActionHandler', () => {
    let fightHandler: FightActionHandler;
    let mockCombatManager: sinon.SinonStubbedInstance<CombatManager>;
    let mockRespawnManager: sinon.SinonStubbedInstance<RespawnManager>;
    let mockPartyService: sinon.SinonStubbedInstance<PartyService>;
    let mockPartyEventListener: sinon.SinonStubbedInstance<PartyEventListener>;
    let mockTurnManager: sinon.SinonStubbedInstance<TurnManager>;
    let mockMapManager: sinon.SinonStubbedInstance<MapManager>;

    const mockPartyId = 'testPartyId';
    const mockPlayerId = 'player1';
    const mockEnemyId = 'enemy1';
    const mockPosition: Coordinate = { x: 5, y: 5 };

    beforeEach(() => {
        mockCombatManager = sinon.createStubInstance(CombatManager);
        mockRespawnManager = sinon.createStubInstance(RespawnManager);
        mockPartyService = sinon.createStubInstance(PartyService);
        mockPartyEventListener = sinon.createStubInstance(PartyEventListener);
        mockTurnManager = sinon.createStubInstance(TurnManager);
        mockMapManager = sinon.createStubInstance(MapManager);

        Container.set(PartyService, mockPartyService);
        Container.set(PartyEventListener, mockPartyEventListener);

        fightHandler = new FightActionHandler(mockPartyId, mockTurnManager, mockMapManager);

        (fightHandler['combatManager'] as any) = mockCombatManager as any;
        fightHandler['respawnManager'] = mockRespawnManager as any;
        fightHandler['partyService'] = mockPartyService as any;
        fightHandler['partyEventListener'] = mockPartyEventListener as any;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('initFight', () => {
        it('should initialize fight and emit StartCombat event', () => {
            const mockEnemy: PlayerInfos = { pid: mockEnemyId, currentPosition: mockPosition } as PlayerInfos;
            // const mockPlayer: PlayerInfos = { pid: mockPlayerId, currentPosition: mockPosition } as PlayerInfos;
            sinon.stub(fightHandler as any, 'resolveEnemy').returns(mockEnemy);
            sinon.stub(fightHandler as any, 'initFighter').callsFake(
                (id: string) =>
                    ({
                        pid: id,
                        name: `Player ${id}`,
                    }) as Fighter,
            );

            fightHandler.initFight(mockPlayerId, mockPosition, true);

            expect(mockPartyService.decrementRemainingAction.calledWith(mockPartyId, mockPlayerId)).to.equal(true);
            expect(mockTurnManager.pauseTurnTimer.calledOnce).to.equal(true);
            expect(
                mockCombatManager.initFight.calledWithMatch(sinon.match.has('pid', mockPlayerId), sinon.match.has('pid', mockEnemyId), true),
            ).to.equal(true);
            expect(mockPartyEventListener.emit.calledWith(LogTypeEvent.StartCombat)).to.equal(true);
        });
    });

    describe('getFighters', () => {
        it('should return fighters from CombatManager', () => {
            const mockFighters = { attacker: {}, defender: {} } as any;
            mockCombatManager.getFighters.returns(mockFighters);

            const fighters = fightHandler.getFighters();
            expect(fighters).to.equal(mockFighters);
        });
    });

    describe('getFightEndEventSignal', () => {
        it('should return fight end event observable', () => {
            const mockObservable = new EventEmitter();
            (mockCombatManager as any).endFightEvent$ = mockObservable as any;

            const result = fightHandler.getFightEndEventSignal();
            expect(result).to.equal(mockObservable);
        });
    });

    describe('handleGiveUp', () => {
        it('should handle player give up via CombatManager', async () => {
            await fightHandler.handleGiveUp(mockPlayerId);
            expect(mockCombatManager.handleGiveUp.calledWith(mockPlayerId)).to.equal(true);
        });
    });

    describe('handleAttack', () => {
        it('should handle attack via CombatManager', async () => {
            await fightHandler.handleAttack();
            expect(mockCombatManager.handleAttack.calledOnce).to.equal(true);
        });
    });

    describe('handleEscape', () => {
        it('should handle escape via CombatManager', async () => {
            await fightHandler.handleEscape();
            expect(mockCombatManager.handleEvasion.calledOnce).to.equal(true);
        });
    });

    describe('resolveEnemy', () => {
        it('should return enemy player at the given position', () => {
            const mockPlayers = [{ pid: mockEnemyId, currentPosition: { x: 5, y: 5 } } as PlayerInfos];
            mockPartyService.getPlayers.returns(mockPlayers);

            const result = (fightHandler as any).resolveEnemy(mockPosition);
            expect(result?.pid).to.equal(mockEnemyId);
        });

        it('should return null if no player is found at the given position', () => {
            mockPartyService.getPlayers.returns([]);
            const result = (fightHandler as any).resolveEnemy(mockPosition);
            expect(result).to.equal(null);
        });
    });

    describe('initFighter', () => {
        it('should initialize fighter with adjusted stats if on ice', () => {
            const mockPlayer: PlayerInfos = {
                pid: mockPlayerId,
                name: 'Test Player',
                attack: 10,
                defense: 5,
                life: 100,
                currentPosition: { x: 1, y: 1 },
            } as PlayerInfos;
            mockPartyService.getPlayer.returns(mockPlayer);
            mockMapManager.isIce.returns(true);

            const result = (fightHandler as any).initFighter(mockPlayerId);
            expect(result.attack).to.equal(8); // attack - 2
            expect(result.defense).to.equal(3); // defense - 2
        });

        it('should initialize fighter with normal stats if not on ice', () => {
            const mockPlayer: PlayerInfos = {
                pid: mockPlayerId,
                name: 'Test Player',
                attack: 10,
                defense: 5,
                life: 100,
                currentPosition: { x: 1, y: 1 },
            } as PlayerInfos;
            mockPartyService.getPlayer.returns(mockPlayer);
            mockMapManager.isIce.returns(false);

            const result = (fightHandler as any).initFighter(mockPlayerId);
            expect(result.attack).to.equal(10);
            expect(result.defense).to.equal(5);
        });
    });

    describe('destroy', () => {
        it('should call resetAll on combatManager', () => {
            fightHandler.destroy();
            expect(mockCombatManager.resetAll.calledOnce).to.equal(true);
        });
    });
});
