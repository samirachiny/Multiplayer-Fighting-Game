/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item/item';
import { ItemCountHelper } from '@app/classes/item-count-helper/item-count-helper';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';
import { Observable } from 'rxjs';
import { ItemService } from './item.service';

describe('ItemService', () => {
    let service: ItemService;
    let mockItem: jasmine.SpyObj<Item>;
    beforeEach(() => {
        mockItem = jasmine.createSpyObj('Item', ['type']);
        TestBed.configureTestingModule({
            providers: [ItemService],
        });
        service = TestBed.inject(ItemService);
        service['itemCounts'] = new Map<Item, number>();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('itemUpdate$', () => {
        it('should return an Observable', () => {
            expect(service.itemUpdate$).toBeTruthy();
            expect(service.itemUpdate$ instanceof Observable).toBeTruthy();
        });
    });

    describe('initializeItemCounts', () => {
        it('should clear itemCounts and update itemCounts based on the provided map', () => {
            const mockItem1 = new Item('Sword', 1, 'Weapon');
            const mockItem2 = new Item('Shield', 2, 'Defense');

            const mockGameMap: GameMapEditor = {
                itemCounts: new Map<Item, number>([
                    [mockItem1, 5],
                    [mockItem2, 3],
                ]),
            } as GameMapEditor;
            const itemUpdateSpy = spyOn(service['itemUpdate'], 'next').and.callThrough();

            service.initializeItemCounts(mockGameMap);

            expect(service['itemCounts'].get(mockItem1)).toBe(5);
            expect(service['itemCounts'].get(mockItem2)).toBe(3);

            expect(itemUpdateSpy).toHaveBeenCalledWith(service['itemCounts']);
        });

        it('should clear existing itemCounts before updating them', () => {
            const mockItem1 = new Item('Sword', 1, 'Weapon');
            const mockItem2 = new Item('Shield', 2, 'Defense');

            const mockGameMap: GameMapEditor = {
                itemCounts: new Map<Item, number>([
                    [mockItem1, 5],
                    [mockItem2, 3],
                ]),
            } as GameMapEditor;

            service['itemCounts'].set(mockItem1, 10);

            const itemUpdateSpy = spyOn(service['itemUpdate'], 'next').and.callThrough();

            service.initializeItemCounts(mockGameMap);

            expect(service['itemCounts'].get(mockItem1)).toBe(5);
            expect(service['itemCounts'].get(mockItem2)).toBe(3);

            expect(itemUpdateSpy).toHaveBeenCalledWith(service['itemCounts']);
        });
    });

    describe('incrementItem', () => {
        it('should call ItemCountHelper.incrementItem', () => {
            spyOn(ItemCountHelper, 'incrementItem');
            service.incrementItem(mockItem);
            expect(ItemCountHelper.incrementItem).toHaveBeenCalledWith(mockItem, jasmine.any(Map));
        });

        it('should emit updated itemCounts', (done) => {
            service.itemUpdate$.subscribe((itemCounts) => {
                expect(itemCounts).toBeTruthy();
                done();
            });

            service.incrementItem(mockItem);
        });
    });

    describe('decrementItem', () => {
        it('should call ItemCountHelper.decrementItem', () => {
            spyOn(ItemCountHelper, 'decrementItem').and.returnValue(false);
            service.decrementItem(mockItem);
            expect(ItemCountHelper.decrementItem).toHaveBeenCalledWith(mockItem, jasmine.any(Map));
        });

        it('should emit updated itemCounts when ItemCountHelper.decrementItem returns false', (done) => {
            spyOn(ItemCountHelper, 'decrementItem').and.returnValue(false);

            service.itemUpdate$.subscribe((itemCounts) => {
                expect(itemCounts).toBeTruthy();
                done();
            });

            service.decrementItem(mockItem);
        });

        it('should not emit updated itemCounts when ItemCountHelper.decrementItem returns true', () => {
            spyOn(ItemCountHelper, 'decrementItem').and.returnValue(true);
            spyOn(service['itemUpdate'], 'next');

            service.decrementItem(mockItem);

            expect(service['itemUpdate'].next).not.toHaveBeenCalled();
        });
    });
});
