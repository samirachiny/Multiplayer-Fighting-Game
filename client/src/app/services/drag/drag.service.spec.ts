import { TestBed } from '@angular/core/testing';
import { Item } from '@app/classes/item/item';
import { ItemType } from '@common/enums/item';
import { Coordinate } from '@app/interfaces/coordinate';
import { ItemService } from '@app/services/item/item.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { DragService } from './drag.service';

describe('DragService', () => {
    let service: DragService;
    let mockMapEditorService: jasmine.SpyObj<MapEditorService>;
    let mockItemService: jasmine.SpyObj<ItemService>;
    let mockItem: Item;

    beforeEach(() => {
        mockMapEditorService = jasmine.createSpyObj('MapEditorService', ['getItem', 'applyItem', 'removeItem', 'removeHightLightFormTile']);
        mockItemService = jasmine.createSpyObj('ItemService', ['decrementItem', 'incrementItem']);
        mockItem = new Item('image', ItemType.BoostAttack, '');

        TestBed.configureTestingModule({
            providers: [
                DragService,
                { provide: MapEditorService, useValue: mockMapEditorService },
                { provide: ItemService, useValue: mockItemService },
            ],
        });

        service = TestBed.inject(DragService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should handle item drop correctly from item tools', () => {
        const coordinate: Coordinate = { x: 2, y: 2 };
        service.draggedItem = mockItem;
        mockMapEditorService.applyItem.and.returnValue(true);

        const result = service.handleDropFromItemTools(coordinate);

        expect(result).toBeTrue();
        expect(mockMapEditorService.applyItem).toHaveBeenCalledWith(coordinate, mockItem);
        expect(mockItemService.decrementItem).toHaveBeenCalledWith(mockItem);
    });
    it('should return divItemImage', () => {
        const itemImage = 'imageItem';
        service['_divItemImage'] = itemImage;
        expect(service.divItemImage).toEqual(service['_divItemImage']);
    });
    it('isStartDragFromTile return _startDragCoordinate', () => {
        let isStartDragFromTile: boolean = service.isStartDragFromTile();
        expect(isStartDragFromTile).toBeFalse();
        service['_startDragCoordinate'] = { x: 0, y: 0 };
        isStartDragFromTile = service.isStartDragFromTile();
        expect(isStartDragFromTile).toBeTrue();
    });
    it('should set Div Item Image', () => {
        const coords = { x: 0, y: 1 };
        service['_startDragCoordinate'] = coords;
        mockMapEditorService.getItem.and.returnValue(mockItem);
        service.setDivItemImage(coords);
        expect(service['_startDragCoordinate']).toEqual(coords);
        expect(service['_divItemImage']).toEqual(mockItem.image);
        expect(mockMapEditorService.getItem).toHaveBeenCalledWith(coords);
    });
    it('should not set Div Item Image if no item', () => {
        const coords = { x: 0, y: 1 };
        service['_startDragCoordinate'] = coords;
        mockMapEditorService.getItem.and.returnValue(null);
        service.setDivItemImage(coords);
        expect(service['_startDragCoordinate']).toEqual(coords);
        expect(service['_divItemImage']).toBeUndefined();
        expect(mockMapEditorService.getItem).toHaveBeenCalledWith(coords);
    });

    it('should handle item drop correctly from tile', () => {
        const startDragCoordinate = { x: 0, y: 0 };
        service['_startDragCoordinate'] = startDragCoordinate;
        const coordinate: Coordinate = { x: 3, y: 3 };
        mockMapEditorService.getItem.and.returnValue(mockItem);
        mockMapEditorService.applyItem.and.returnValue(true);

        service.handleDropFromTile(true, coordinate);

        expect(mockMapEditorService.removeItem).toHaveBeenCalledWith(startDragCoordinate);
        expect(mockItemService.incrementItem).not.toHaveBeenCalled();
        expect(service['_startDragCoordinate']).toBeNull();
    });

    it('should item return to item tools when outside the map', () => {
        const startDragCoordinate = { x: 0, y: 0 };
        service['_startDragCoordinate'] = startDragCoordinate;
        const coordinate: Coordinate = { x: 3, y: 3 };
        mockMapEditorService.getItem.and.returnValue(mockItem);
        mockMapEditorService.applyItem.and.returnValue(true);

        service.handleDropFromTile(false, coordinate);

        expect(mockMapEditorService.removeHightLightFormTile).toHaveBeenCalled();
        expect(mockMapEditorService.removeItem).toHaveBeenCalledWith(startDragCoordinate);
        expect(mockItemService.incrementItem).toHaveBeenCalledWith(mockItem);
    });

    it('should handleDropFromTile do nothing if startDragCoordinate is null', () => {
        const coordinate: Coordinate = { x: 3, y: 3 };
        service.handleDropFromTile(false, coordinate);
        expect(mockMapEditorService.removeItem).not.toHaveBeenCalled();
        expect(mockItemService.incrementItem).not.toHaveBeenCalled();
    });

    it('should return false if mouse is not inside canvas', () => {
        const testCoordinate: Coordinate = { x: 3, y: 3 };
        const result = service.handleDropFromItemTools(testCoordinate);
        expect(result).toBeFalse();
    });

    it('should return false if no item is being dragged', () => {
        const testCoordinate: Coordinate = { x: 3, y: 3 };
        service.draggedItem = null;
        const result = service.handleDropFromItemTools(testCoordinate);
        expect(result).toBeFalse();
    });

    it('should return false if item cannot be applied', () => {
        const testCoordinate: Coordinate = { x: 3, y: 3 };
        mockMapEditorService.applyItem.and.returnValue(false);
        const result = service.handleDropFromItemTools(testCoordinate);
        expect(result).toBeFalse();
    });

    it('should decrement item count if item is successfully applied', () => {
        const testCoordinate: Coordinate = { x: 3, y: 3 };
        mockMapEditorService.applyItem.and.returnValue(true);
        service.draggedItem = mockItem;
        const result = service.handleDropFromItemTools(testCoordinate);
        expect(result).toBeTrue();
        expect(mockMapEditorService.applyItem).toHaveBeenCalledWith(testCoordinate, mockItem);
        expect(mockItemService.decrementItem).toHaveBeenCalledWith(mockItem);
    });

    it('should not decrement item count if item is not applied', () => {
        const testCoordinate: Coordinate = { x: 3, y: 3 };
        mockMapEditorService.applyItem.and.returnValue(false);
        service.handleDropFromItemTools(testCoordinate);
        expect(mockItemService.decrementItem).not.toHaveBeenCalled();
    });
});
