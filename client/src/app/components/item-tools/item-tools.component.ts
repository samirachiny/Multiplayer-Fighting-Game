import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Item } from '@app/classes/item/item';
import { DRAG_DATA_ENABLED_INDEX } from '@app/constants/consts';
import { DragService } from '@app/services/drag/drag.service';
import { ItemService } from '@app/services/item/item.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-item-tools',
    standalone: true,
    imports: [CommonModule, MatTooltipModule],
    templateUrl: './item-tools.component.html',
    styleUrl: './item-tools.component.scss',
})
export class ItemToolsComponent implements OnDestroy {
    itemMap: Map<Item, number>;
    private itemUpdateSubscription: Subscription;

    constructor(
        private itemService: ItemService,
        private dragService: DragService,
    ) {
        this.itemMap = new Map<Item, number>();
        this.itemUpdateSubscription = this.itemService.itemUpdate$.subscribe((value) => {
            this.itemMap = value;
        });
    }

    ngOnDestroy(): void {
        this.itemUpdateSubscription.unsubscribe();
    }

    onDragStart(event: DragEvent, item: Item, remainValue: number): void {
        if (remainValue === 0) {
            event.preventDefault();
            return;
        }
        event.dataTransfer?.setData(DRAG_DATA_ENABLED_INDEX, JSON.stringify(true));
        this.dragService.draggedItem = item;
    }

    onDragEnd(): void {
        this.dragService.draggedItem = null;
        this.dragService.isDragSuccess = false;
    }
}
