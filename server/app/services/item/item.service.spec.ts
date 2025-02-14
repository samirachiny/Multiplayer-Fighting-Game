/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ItemService } from './item.service';
import { ItemType } from '@common/enums/item';
import { Party } from '@common/interfaces/party';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { ALL_ITEMS, BASE_TILE_DECIMAL } from '@app/utils/const';

describe('ItemService', () => {
    let itemService: ItemService;
    let party: Party;
    let player: PlayerInfos;

    beforeEach(() => {
        party = {
            game: {
                mapSize: 5,
                gameMap: [
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                ],
            },
            hasDoubleIceBreakEffect: false,
            hasDecreaseLoserWinsEffect: false,
        } as Party;
        player = {
            attack: 4,
            defense: 4,
            items: [],
            hasSwapOpponentLifeEffect: false,
            hasSecondChanceEffect: false,
        } as PlayerInfos;
        itemService = new ItemService();
    });
    afterEach(() => {
        sinon.restore();
    });
    it('should return unused items', () => {
        party.game.gameMap[0][0] = ItemType.BoostAttack;
        party.game.gameMap[1][1] = ItemType.BoostDefense;
        party.game.gameMap[2][2] = ItemType.SwapOpponentLife;
        const unUsedItems = itemService['getUnUsedItems'](party);
        const usedItems = [ItemType.BoostAttack, ItemType.BoostDefense, ItemType.SwapOpponentLife];
        const expectedUnUsedItems = ALL_ITEMS.filter((item) => !usedItems.includes(item));
        expect(unUsedItems).to.have.members(expectedUnUsedItems);
    });
    it('should return an empty array if party is null', () => {
        const unUsedItems = itemService['getUnUsedItems'](null);
        expect(unUsedItems).to.be.an('array').that.is.empty;
    });
    it('should return an empty array if all items are used', () => {
        party.game.gameMap = [
            [ItemType.BoostAttack, ItemType.BoostDefense, ItemType.SwapOpponentLife, ItemType.SecondChance, ItemType.DoubleIceBreak],
            [ItemType.DecreaseLoserWins, ItemType.BoostAttack, ItemType.BoostDefense, ItemType.SwapOpponentLife, ItemType.SecondChance],
            [ItemType.DoubleIceBreak, ItemType.DecreaseLoserWins, ItemType.BoostAttack, ItemType.BoostDefense, ItemType.SwapOpponentLife],
            [ItemType.SecondChance, ItemType.DoubleIceBreak, ItemType.DecreaseLoserWins, ItemType.BoostAttack, ItemType.BoostDefense],
            [ItemType.SwapOpponentLife, ItemType.SecondChance, ItemType.DoubleIceBreak, ItemType.DecreaseLoserWins, ItemType.BoostAttack],
        ];
        const unUsedItems = itemService['getUnUsedItems'](party);
        expect(unUsedItems).to.be.an('array').that.is.empty;
    });
    it('should not remove random items if no party', () => {
        const getUnUsedItemsStub = sinon.stub(itemService as any, 'getUnUsedItems');

        itemService.removeRandomItems(null);

        expect(getUnUsedItemsStub.called).to.be.false;
    });
    it('should remove random items from the party', () => {
        sinon.stub(itemService as any, 'getUnUsedItems').returns([ItemType.BoostAttack, ItemType.BoostDefense]);
        party.game.gameMap[0][0] = ItemType.Random;
        party.game.gameMap[1][1] = ItemType.Random;

        itemService.removeRandomItems(party);

        expect(party.game.gameMap[0][0] % BASE_TILE_DECIMAL).to.equal(ItemType.BoostAttack);
        expect(party.game.gameMap[1][1] % BASE_TILE_DECIMAL).to.equal(ItemType.BoostDefense);
    });
    it('should not  remove random items from the party if no unused items', () => {
        sinon.stub(itemService as any, 'getUnUsedItems').returns([]);
        itemService.removeRandomItems(party);
    });

    it('should apply item effect to player or party', () => {
        itemService.applyItemEffect(party, player, ItemType.BoostAttack);
        expect(player.attack).to.equal(6);

        itemService.applyItemEffect(party, player, ItemType.BoostDefense);
        expect(player.defense).to.equal(6);

        itemService.applyItemEffect(party, player, ItemType.SecondChance);
        expect(player.hasSecondChanceEffect).to.equal(true);

        itemService.applyItemEffect(party, player, ItemType.SwapOpponentLife);
        expect(player.hasSwapOpponentLifeEffect).to.equal(true);

        itemService.applyItemEffect(party, player, ItemType.DoubleIceBreak);
        expect(party.hasDoubleIceBreakEffect).to.equal(true);

        itemService.applyItemEffect(party, player, ItemType.DecreaseLoserWins);
        expect(party.hasDecreaseLoserWinsEffect).to.equal(true);
    });
    it('should remove item effect to player or party', () => {
        itemService.removeItemEffect(party, player, ItemType.BoostAttack);
        expect(player.attack).to.equal(4);

        itemService.removeItemEffect(party, player, ItemType.BoostDefense);
        expect(player.defense).to.equal(4);

        itemService.removeItemEffect(party, player, ItemType.SecondChance);
        expect(player.hasSecondChanceEffect).to.equal(false);

        itemService.removeItemEffect(party, player, ItemType.SwapOpponentLife);
        expect(player.hasSwapOpponentLifeEffect).to.equal(false);

        itemService.removeItemEffect(party, player, ItemType.DoubleIceBreak);
        expect(party.hasDoubleIceBreakEffect).to.equal(false);

        itemService.removeItemEffect(party, player, ItemType.DecreaseLoserWins);
        expect(party.hasDecreaseLoserWinsEffect).to.equal(false);
    });
    it('should remove all item effects from player', () => {
        player.items = [ItemType.BoostAttack, ItemType.BoostDefense];
        itemService.removeAllItemEffect(party, player);
        expect(player.attack).to.equal(4);
        expect(player.defense).to.equal(4);
    });

    it('should not apply item effect if item is not recognized', () => {
        itemService.applyItemEffect(party, player, ItemType.Flag);
        expect(player.attack).to.equal(4);
        expect(player.defense).to.equal(4);
    });
    it('should not remove item effect if item is not recognized', () => {
        itemService.applyItemEffect(party, player, ItemType.Flag);
        expect(player.attack).to.equal(4);
        expect(player.defense).to.equal(4);
    });
});
