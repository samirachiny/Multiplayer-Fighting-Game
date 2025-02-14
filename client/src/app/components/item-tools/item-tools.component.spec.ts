import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ItemToolsComponent } from './item-tools.component';
import { DragService } from '@app/services/drag/drag.service';
import { ItemService } from '@app/services/item/item.service';
import { of } from 'rxjs';
import { RandomItem } from '@app/classes/random-item/random-item';
import { StartingPointItem } from '@app/classes/start-position-item/start-position-item';

describe('ItemToolsComponent', () => {
    let component: ItemToolsComponent;
    let fixture: ComponentFixture<ItemToolsComponent>;
    let mockItemService: Partial<ItemService>;
    let mockDragService: Partial<DragService>;

    beforeEach(async () => {
        mockItemService = {
            itemUpdate$: of(new Map()),
        };
        mockDragService = {
            draggedItem: null,
            isDragSuccess: false,
        };

        await TestBed.configureTestingModule({
            imports: [CommonModule, MatTooltipModule, ItemToolsComponent],
            providers: [
                { provide: ItemService, useValue: mockItemService },
                { provide: DragService, useValue: mockDragService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ItemToolsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should update itemMap when itemService emits', () => {
        expect(component.itemMap.size).toEqual(0);
    });

    it('should prevent default action if remaining value is 0 on drag start', () => {
        const event = new DragEvent('dragstart');
        spyOn(event, 'preventDefault');
        component.onDragStart(event, new RandomItem(), 0);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should set draggedItem on drag start if remaining value is more than 0', () => {
        const item = new StartingPointItem();
        const event = new DragEvent('dragstart');
        component.onDragStart(event, item, 1);
        expect(mockDragService.draggedItem).toEqual(item);
    });

    it('should reset dragService properties on drag end when drag is successful', () => {
        mockDragService.isDragSuccess = true;
        component.onDragEnd();
        expect(mockDragService.draggedItem).toBeNull();
        expect(mockDragService.isDragSuccess).toBeFalse();
    });
});
