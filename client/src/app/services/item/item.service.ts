import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item/item';
import { ItemCountHelper } from '@app/classes/item-count-helper/item-count-helper';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';
import { Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ItemService {
    private itemUpdate: Subject<Map<Item, number>>;
    private _itemUpdate$: Observable<Map<Item, number>>;
    private itemCounts: Map<Item, number>;
    constructor() {
        this.itemUpdate = new Subject<Map<Item, number>>();
        this._itemUpdate$ = this.itemUpdate.asObservable();
        this.itemCounts = new Map<Item, number>();
    }

    get itemUpdate$(): Observable<Map<Item, number>> {
        return this._itemUpdate$;
    }

    initializeItemCounts(map: GameMapEditor): void {
        this.itemCounts.clear();
        this.itemCounts = new Map<Item, number>(map.itemCounts);
        this.itemUpdate.next(this.itemCounts);
    }

    incrementItem(item: Item | null): void {
        ItemCountHelper.incrementItem(item, this.itemCounts);
        this.itemUpdate.next(this.itemCounts);
    }

    decrementItem(item: Item | null): void {
        if (ItemCountHelper.decrementItem(item, this.itemCounts)) return;
        this.itemUpdate.next(this.itemCounts);
    }
}
