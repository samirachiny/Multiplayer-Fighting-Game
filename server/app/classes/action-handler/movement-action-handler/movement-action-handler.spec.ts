/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { MovementActionHandler } from './movement-action-handler';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { MovementManager } from '@app/classes/movement-manager/movement-manager';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { PartyService } from '@app/services/party/party.service';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { WsEventClient } from '@common/enums/web-socket-event';
import { LogTypeEvent } from '@common/enums/log-type';
import { GameEventType } from '@common/enums/game-event-type';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { Coordinate } from '@common/interfaces/coordinate';
import { ItemType } from '@common/enums/item';

describe('MovementActionHandler', () => {
    let handler: MovementActionHandler;
    let mockMapManager: sinon.SinonStubbedInstance<MapManager>;
    let mockMovementManager: sinon.SinonStubbedInstance<MovementManager>;
    let mockRespawnManager: sinon.SinonStubbedInstance<RespawnManager>;
    let mockPartyService: sinon.SinonStubbedInstance<PartyService>;
    let mockPartyEventListener: sinon.SinonStubbedInstance<PartyEventListener>;
    let sioStub: any;
    let sendEventStub: any;

    const mockPartyId = 'testPartyId';
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
        mockMapManager = sinon.createStubInstance(MapManager);
        mockMovementManager = sinon.createStubInstance(MovementManager);
        mockRespawnManager = sinon.createStubInstance(RespawnManager);
        mockPartyService = sinon.createStubInstance(PartyService);
        mockPartyEventListener = sinon.createStubInstance(PartyEventListener);

        sioStub = {
            to: sinon.stub().returnsThis(),
            in: sinon.stub().returnsThis(),
            socketsLeave: sinon.stub().returnsThis(),
            emit: sinon.stub().returnsThis(),
            on: sinon.stub().returnsThis(),
            socketsJoin: sinon.stub().returnsThis(),
        };

        PartyHelper.init(sioStub);
        sendEventStub = sinon.stub(PartyHelper, 'sendEvent');

        handler = new MovementActionHandler(mockPartyId, mockMapManager, mockMovementManager);
        handler['partyService'] = mockPartyService as unknown as PartyService;
        handler['partyEventListener'] = mockPartyEventListener as unknown as PartyEventListener;
        handler['respawnManager'] = mockRespawnManager as unknown as RespawnManager;
        mockPartyService.getPlayer.returns(mockPlayer);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('move', () => {
        it('should move the player and emit events for each position', async () => {
            mockMovementManager.getPlayerPathTo.returns([
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ]);
            sinon.stub(handler as any, 'movePlayerTo');
            sinon.stub(handler as any, 'detectSlipped').resolves(false);
            sinon.stub(handler as any, 'pickUpItem').returns(false);

            const result = await handler.move(mockPlayerId, { x: 10, y: 10 });

            expect((mockPartyEventListener.emit as any).callCount).to.equal(2);
            expect(result).to.equal(true);
        });

        it('should end movement if the player slips', async () => {
            mockMovementManager.getPlayerPathTo.returns([{ x: 1, y: 1 }]);
            sinon.stub(handler as any, 'movePlayerTo');
            sinon.stub(handler as any, 'detectSlipped').resolves(true);

            const result = await handler.move(mockPlayerId, { x: 10, y: 10 });

            expect((mockPartyEventListener.emit as any).calledWith(GameEventType.TileVisited)).to.equal(true);
            expect(result).to.equal(false);
        });

        it('should stop movement if an item is picked up', async () => {
            mockMovementManager.getPlayerPathTo.returns([{ x: 1, y: 1 }]);
            sinon.stub(handler as any, 'movePlayerTo');
            sinon.stub(handler as any, 'detectSlipped').resolves(false);
            sinon.stub(handler as any, 'pickUpItem').returns(true);

            const result = await handler.move(mockPlayerId, { x: 10, y: 10 });

            expect(result).to.equal(true);
        });
    });

    describe('teleportPlayer', () => {
        it('should teleport the player and emit events', () => {
            handler.teleportPlayer(mockPlayerId, { x: 1, y: 1 });
            expect(mockRespawnManager.teleportPlayer.calledWith(mockPlayerId, { x: 1, y: 1 })).to.equal(true);
            expect(mockPartyEventListener.emit.calledWith(GameEventType.TileVisited)).to.equal(true);
        });
    });

    describe('checkIfPlayerCanWinInMoveAndHandleGameEnd', () => {
        it('should emit EndGame event if the player reaches the start position with a flag', () => {
            mockPlayer.hasFlag = true;
            mockPlayer.currentPosition = mockPlayer.startPosition;

            handler['checkIfPlayerCanWinInMoveAndHandleGameEnd'](mockPlayer);

            expect(mockPartyEventListener.emit.calledWith(LogTypeEvent.EndGame)).to.equal(true);
            expect(sendEventStub.calledWith(mockPartyId, WsEventClient.GameEnd, mockPlayer.name)).to.equal(true);
        });

        it('should not emit EndGame event if the player does not have a flag', () => {
            mockPlayer.hasFlag = false;

            handler['checkIfPlayerCanWinInMoveAndHandleGameEnd'](mockPlayer);

            expect(mockPartyEventListener.emit.calledWith(LogTypeEvent.EndGame)).to.equal(false);
        });
    });

    describe('detectSlipped', () => {
        it('should emit IceBroken and ReplacePlayerAfterIceBroken if the player slips', async () => {
            mockMovementManager.hasSlipped.returns(true);

            const result = await handler['detectSlipped'](mockPosition, mockPlayer);

            expect(result).to.equal(true);
            expect(sendEventStub.calledWith(mockPartyId, WsEventClient.IceBroken, mockPosition)).to.equal(true);
            expect(sendEventStub.calledWith(mockPartyId, WsEventClient.ReplacePlayerAfterIceBroken, mockPlayer)).to.equal(true);
        });

        it('should return false if the player does not slip', async () => {
            mockMovementManager.hasSlipped.returns(false);

            const result = await handler['detectSlipped'](mockPosition, mockPlayer);

            expect(result).to.equal(false);
        });
    });

    describe('pickUpItem', () => {
        it('should add item to player and update map if an item is present', () => {
            mockMapManager.hasItem.returns(true);
            mockPartyService.getPlayerItems.returns([ItemType.BoostAttack]);
            sinon.stub(handler as any, 'addItemToPlayer');
            sinon.stub(handler as any, 'updateMap');

            const result = handler['pickUpItem'](mockPosition, mockPlayer);
            expect(result).to.equal(true);
            expect((handler['addItemToPlayer'] as any).calledWith(mockPosition, mockPlayer)).to.equal(true);
            expect((handler['updateMap'] as any).calledWith(mockPosition)).to.equal(true);
        });

        it('should return false if no item is present', () => {
            mockMapManager.hasItem.returns(false);
            const result = handler['pickUpItem'](mockPosition, mockPlayer);
            expect(result).to.equal(false);
        });

        it('should add item to player, update map, and return true when inventory is not full', () => {
            mockMapManager.hasItem.returns(true);
            mockPartyService.getPlayerItems.returns([]);
            sinon.stub(handler as any, 'addItemToPlayer');
            sinon.stub(handler as any, 'updateMap');
            const result = handler['pickUpItem'](mockPosition, mockPlayer);
            expect(result).to.equal(true);
            expect(sendEventStub.calledWith(mockPartyId, WsEventClient.RemoveItem, mockPosition)).to.equal(true);
            expect((handler['addItemToPlayer'] as any).calledWith(mockPosition, mockPlayer)).to.equal(true);
            expect((handler['updateMap'] as any).calledWith(mockPosition)).to.equal(true);
        });

        it('should set isChoosingItem to true and emit ChooseItemToRemove when inventory is full', () => {
            mockMapManager.hasItem.returns(true);
            mockPartyService.getParty.returns({
                isChoosingItem: false,
                id: 'party1',
                charactersOccupiedIds: undefined,
                chatMessages: [],
                game: undefined,
                isLocked: false,
                accessCode: 0,
                logs: [],
                isDebugMode: false,
            });
            mockPartyService.getPlayerItems.returns([
                ItemType.BoostAttack,
                ItemType.SecondChance,
                ItemType.SwapOpponentLife,
                ItemType.BoostDefense,
                ItemType.DoubleIceBreak,
                ItemType.DecreaseLoserWins,
                ItemType.Flag,
            ]);
            sinon.stub(handler as any, 'addItemToPlayer');
            sinon.stub(handler as any, 'updateMap');
            const result = handler['pickUpItem'](mockPosition, mockPlayer);
            expect(result).to.equal(true);
            expect(mockPartyService.getParty.calledWith(mockPartyId)).to.equal(true);
            expect(mockPartyService.getParty(mockPartyId).isChoosingItem).to.equal(true);
            expect(sendEventStub.calledWith(mockPlayer.pid, WsEventClient.ChooseItemToRemove)).to.equal(true);
        });

        it('should return false if isUnableToPickupItem returns true', () => {
            sinon.stub(handler as any, 'isUnableToPickupItem').returns(true);
            const result = handler['pickUpItem'](mockPosition, mockPlayer);
            expect(result).to.equal(false);
            expect(sendEventStub.called).to.equal(false);
        });

        it('should return false if no item is present at the position', () => {
            mockMapManager.hasItem.returns(false);
            const result = handler['pickUpItem'](mockPosition, mockPlayer);
            expect(result).to.equal(false);
            expect(sendEventStub.called).to.equal(false);
        });
    });

    describe('addItemToPlayer', () => {
        it('should remove item from map and add it to the player', () => {
            mockMapManager.removeItem.returns(1);
            handler['addItemToPlayer'](mockPosition, mockPlayer);
            expect(mockMapManager.removeItem.calledWith(mockPosition)).to.equal(true);
            expect(mockPartyService.addPlayerItem.calledWith(mockPartyId, mockPlayerId, 1)).to.equal(true);
        });

        it('should remove the item from the map and add it to the player inventory', () => {
            mockMapManager.removeItem.returns(ItemType.BoostAttack);
            handler['addItemToPlayer'](mockPosition, mockPlayer);
            expect(mockMapManager.removeItem.calledWith(mockPosition)).to.equal(true);
            expect(mockPartyService.addPlayerItem.calledWith(mockPartyId, mockPlayerId, ItemType.BoostAttack)).to.equal(true);
        });

        it('should emit UpdateItem event after adding the item', () => {
            mockMapManager.removeItem.returns(ItemType.BoostAttack);
            handler['addItemToPlayer'](mockPosition, mockPlayer);
            expect(sendEventStub.calledWith(mockPlayerId, WsEventClient.UpdateItem)).to.equal(true);
        });

        it('should emit UpdateItem event after adding the item and send all logs if item is collected and stat count', () => {
            mockMapManager.removeItem.returns(ItemType.BoostAttack);
            handler['addItemToPlayer'](mockPosition, mockPlayer);
            sinon.stub(handler as any, 'resolveItemEventAndSendItemLog');
            handler['resolveItemEventAndSendItemLog'](mockPosition, mockPlayer.pid);
            expect((mockPartyEventListener.emit as any).calledWith(GameEventType.ItemCount)).to.equal(true);
            expect(mockPartyEventListener.emit.calledWith(LogTypeEvent.CollectItem)).to.equal(true);
        });
    });

    describe('updateMap', () => {
        it('should update the map with the correct tile', () => {
            mockMapManager.getTile.returns(1);
            handler['updateMap'](mockPosition);
            expect(mockPartyService.updateMap.calledWith(mockPartyId, mockPosition, 1)).to.equal(true);
        });
    });

    describe('hasPlayerReachedStartWithFlag', () => {
        it('should return true if player is at the start position with a flag', () => {
            mockPlayer.hasFlag = true;
            mockPlayer.currentPosition = mockPlayer.startPosition;
            const result = handler['hasPlayerReachedStartWithFlag'](mockPlayer);
            expect(result).to.equal(true);
        });

        it('should return false if player is not at the start position or does not have a flag', () => {
            mockPlayer.hasFlag = false;
            const result = handler['hasPlayerReachedStartWithFlag'](mockPlayer);
            expect(result).to.equal(false);
        });
    });

    describe('checkIfPlayerCanWinInMoveAndHandleGameEnd', () => {
        it('should emit EndGame if the player reaches the start position with the flag', () => {
            mockPlayer.hasFlag = true;
            mockPlayer.currentPosition = mockPlayer.startPosition;
            handler['checkIfPlayerCanWinInMoveAndHandleGameEnd'](mockPlayer);
            expect(mockPartyEventListener.emit.calledWith(LogTypeEvent.EndGame)).to.equal(true);
            expect(sendEventStub.calledWith(mockPartyId, WsEventClient.GameEnd, mockPlayer.name)).to.equal(true);
        });

        it('should not emit EndGame if the player does not have the flag', () => {
            mockPlayer.hasFlag = false;
            handler['checkIfPlayerCanWinInMoveAndHandleGameEnd'](mockPlayer);
            expect(mockPartyEventListener.emit.calledWith(LogTypeEvent.EndGame)).to.equal(false);
        });
    });

    describe('movePlayerTo', () => {
        it('should update player position and send PlayerMoving event', async () => {
            mockMovementManager.getNode.returns({
                remainingMoves: 3,
                position: undefined,
                cost: 0,
            });
            await handler['movePlayerTo'](mockPlayerId, mockPlayer, mockPosition);

            expect(mockPartyService.updatePlayerPosition.calledWith(mockPartyId, mockPlayerId, mockPosition)).to.equal(true);
            expect(sendEventStub.calledWith(mockPartyId, WsEventClient.PlayerMoving, mockPlayer)).to.equal(true);
        });

        it('should update remaining moves after moving the player', async () => {
            mockMovementManager.getNode.returns({
                remainingMoves: 3,
                position: undefined,
                cost: 0,
            });
            await handler['movePlayerTo'](mockPlayerId, mockPlayer, mockPosition);
            expect(mockPartyService.setPlayerAvailableMove.calledWith(mockPartyId, mockPlayerId, 3)).to.equal(true);
        });
    });

    describe('resolveItemEventAndSendItemLog', () => {
        it('should emit CollectFlag event if the position contains a flag', () => {
            mockMapManager.hasFlag.returns(true);
            handler['resolveItemEventAndSendItemLog'](mockPosition, mockPlayerId);
            expect(mockPartyEventListener.emit.calledWith(LogTypeEvent.CollectFlag)).to.equal(true);
        });

        it('should emit CollectItem event if the position does not contain a flag', () => {
            mockMapManager.hasFlag.returns(false);
            handler['resolveItemEventAndSendItemLog'](mockPosition, mockPlayerId);
            expect(mockPartyEventListener.emit.calledWith(LogTypeEvent.CollectItem)).to.equal(true);
        });
    });

    describe('detectSlipped', () => {
        it('should emit IceBroken and ReplacePlayerAfterIceBroken if the player slips', async () => {
            mockMovementManager.hasSlipped.returns(true);
            const result = await handler['detectSlipped'](mockPosition, mockPlayer);
            expect(result).to.equal(true);
            expect(sendEventStub.calledWith(mockPartyId, WsEventClient.IceBroken, mockPosition)).to.equal(true);
            expect(sendEventStub.calledWith(mockPartyId, WsEventClient.ReplacePlayerAfterIceBroken, mockPlayer)).to.equal(true);
        });

        it('should return false if the player does not slip', async () => {
            mockMovementManager.hasSlipped.returns(false);
            const result = await handler['detectSlipped'](mockPosition, mockPlayer);
            expect(result).to.equal(false);
        });

        it('should return false if debug mode is enabled', async () => {
            mockPartyService.isDebugMode.returns(true);
            const result = await handler['detectSlipped'](mockPosition, mockPlayer);
            expect(result).to.equal(false);
        });
    });

    describe('isUnableToPickupItem', () => {
        it('should return true if there is no item at the position', () => {
            mockMapManager.hasItem.returns(false);
            const result = handler['isUnableToPickupItem'](mockPosition, mockPlayer);
            expect(result).to.equal(true);
            expect(mockMapManager.hasItem.calledWith(mockPosition)).to.equal(true);
        });

        it('should return true if the player is a virtual player and their inventory is full', () => {
            mockMapManager.hasItem.returns(true);
            mockPlayer.isVirtualPlayer = true;
            mockPlayer.items = [ItemType.BoostAttack, ItemType.SecondChance];
            const result = handler['isUnableToPickupItem'](mockPosition, mockPlayer);
            expect(result).to.equal(true);
        });

        it('should return false if there is an item and the player is not virtual', () => {
            mockMapManager.hasItem.returns(true);
            mockPlayer.isVirtualPlayer = false;
            mockPlayer.items = [];
            const result = handler['isUnableToPickupItem'](mockPosition, mockPlayer);
            expect(result).to.equal(false);
        });

        it('should return false if the player is virtual but their inventory is not full', () => {
            mockMapManager.hasItem.returns(true);
            mockPlayer.isVirtualPlayer = true;
            mockPlayer.items = [];
            const result = handler['isUnableToPickupItem'](mockPosition, mockPlayer);
            expect(result).to.equal(false);
        });

        it('should return false if there is an item and the player inventory is not full', () => {
            mockMapManager.hasItem.returns(true);
            mockPlayer.isVirtualPlayer = false;
            mockPlayer.items = new Array(5);
            const result = handler['isUnableToPickupItem'](mockPosition, mockPlayer);
            expect(result).to.equal(false);
        });
    });
});
