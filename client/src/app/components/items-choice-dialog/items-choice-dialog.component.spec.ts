/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemsChoiceDialogComponent } from './items-choice-dialog.component';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventServer } from '@common/enums/web-socket-event';
import { Item } from '@app/classes/item/item';
import { ItemFactory } from '@app/classes/item-factory/item-factory';
import { ItemType } from '@common/enums/item';

class SocketClientServiceMock extends SocketClientService {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override connect() {}
}

describe('ItemsChoiceDialogComponent', () => {
    let component: ItemsChoiceDialogComponent;
    let fixture: ComponentFixture<ItemsChoiceDialogComponent>;
    let mockData: ItemType[];
    let socketService: SocketClientServiceMock;

    const mockItems: Item[] = [
        new Item('image1.png', ItemType.BoostDefense, 'Boosts defense'),
        new Item('image2.png', ItemType.SwapOpponentLife, 'Swaps opponent life'),
        new Item('image3.png', ItemType.Flag, 'Capture the flag'),
    ];

    beforeEach(async () => {
        socketService = new SocketClientServiceMock();
        spyOn(socketService, 'send');

        // Mock data for MAT_DIALOG_DATA
        mockData = [ItemType.BoostDefense, ItemType.SwapOpponentLife, ItemType.Flag];

        // Mock ItemFactory.createItem to return items from the mockItems array
        spyOn(ItemFactory, 'createItem').and.callFake((itemType: ItemType): Item | null => mockItems.find((item) => item.type === itemType) || null);

        await TestBed.configureTestingModule({
            imports: [ItemsChoiceDialogComponent, MatDialogClose],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: mockData },
                { provide: SocketClientService, useValue: socketService },
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                { provide: MatDialogRef, useValue: { close: () => {} } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemsChoiceDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize items based on MAT_DIALOG_DATA', () => {
        expect(component.items).toEqual(mockItems);
    });

    it('should emit the selected item to the server', () => {
        component.itemTypeSelected = ItemType.SwapOpponentLife;
        component.onChoiceDone();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.RemoveItemChosen, ItemType.SwapOpponentLife);
    });

    it('should not emit the selected item to the server if no item is selected', () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        component.itemTypeSelected = undefined!;
        component.onChoiceDone();
        expect(socketService.send).not.toHaveBeenCalled();
    });

    it('should set itemTypeSelected when a valid item is selected', () => {
        const mockItem = new Item('image1.png', ItemType.BoostDefense, 'Boosts defense');
        component.onSelectedItem(mockItem);
        expect(component.itemTypeSelected).toBe(mockItem.type);
    });

    it('should not set itemTypeSelected when a null item is selected', () => {
        component.onSelectedItem(null);
        expect(component.itemTypeSelected).toBeUndefined();
    });
});
