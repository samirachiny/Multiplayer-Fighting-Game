import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ItemFactory } from '@app/classes/item-factory/item-factory';
import { Item } from '@app/classes/item/item';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventServer } from '@common/enums/web-socket-event';
import { ItemType } from '@common/enums/item';

@Component({
    selector: 'app-items-choice-dialog',
    standalone: true,
    imports: [FormsModule, MatChipsModule, MatButtonModule, MatTooltipModule, NgClass],
    templateUrl: './items-choice-dialog.component.html',
    styleUrl: './items-choice-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsChoiceDialogComponent {
    itemTypeSelected: ItemType;
    items: (Item | null)[];

    constructor(
        private socketClientService: SocketClientService,
        private dialogRef: MatDialogRef<ItemsChoiceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private readonly data: ItemType[],
    ) {
        this.items = this.data.map((item) => ItemFactory.createItem(item));
    }

    onSelectedItem(item: Item | null) {
        if (!item) return;
        this.itemTypeSelected = item.type;
    }

    onChoiceDone() {
        if (!this.itemTypeSelected) return;
        this.socketClientService.send(WsEventServer.RemoveItemChosen, this.itemTypeSelected);
        this.dialogRef.close();
    }
}
