/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanvasHelper } from '@app/classes/canvas-helper/canvas-helper';
import { DoorTile } from '@app/classes/door-tile/door-tile';
import { Item } from '@app/classes/item/item';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';
import { Tile } from '@app/classes/tile/tile';
import { DRAG_DATA_ENABLED_INDEX, MAP_HEIGHT, MAP_WIDTH } from '@app/constants/consts';
import { ItemType } from '@common/enums/item';
import { TileType } from '@common/enums/tile';
import { DragService } from '@app/services/drag/drag.service';
import { ItemService } from '@app/services/item/item.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { Coordinate } from '@common/interfaces/coordinate';
import { GameMode } from '@common/enums/game-infos';
import { Subject } from 'rxjs';
import { MapEditorComponent } from './map-editor.component';
import { IceTile } from '@app/classes/ice-tile/ice-tile';

describe('MapEditorComponent', () => {
    let component: MapEditorComponent;
    let fixture: ComponentFixture<MapEditorComponent>;
    let mockMapService: jasmine.SpyObj<MapEditorService>;
    let mockItemService: jasmine.SpyObj<ItemService>;
    let mockDragService: jasmine.SpyObj<DragService>;

    const mockCanvasElement = document.createElement('canvas');
    const mockCanvasRef: ElementRef<HTMLCanvasElement> = new ElementRef(mockCanvasElement);
    const mockGameMap: GameMapEditor = new GameMapEditor(10, GameMode.Classic, MAP_WIDTH, MAP_HEIGHT);
    const mockTile: Tile = new Tile();
    const mockItem = new Item('test', 1, '');

    beforeEach(async () => {
        mockMapService = jasmine.createSpyObj('MapService', [
            'initialize',
            'hasItem',
            'getItem',
            'removeItem',
            'updateMap',
            'clearCoordinateToUpdate',
            'resetMap',
            'getUpdateMap',
        ]);
        mockItemService = jasmine.createSpyObj('ItemService', ['initializeItemCounts', 'incrementItem', 'itemUpdate$']);
        const itemUpdateSubject = new Subject<Map<Item, number>>();
        (mockItemService as any).itemUpdate$ = itemUpdateSubject.asObservable();
        mockDragService = jasmine.createSpyObj('DragService', [
            'setDivItemImage',
            'handleDropFromItemTools',
            'handleDropFromTile',
            'showDraggedItem',
            'startDrag',
            'isStartDragFromTile',
            'hideDraggedItem',
        ]);

        await TestBed.configureTestingModule({
            imports: [MapEditorComponent],
            providers: [
                { provide: MapEditorService, useValue: mockMapService },
                { provide: ItemService, useValue: mockItemService },
                { provide: DragService, useValue: mockDragService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(MapEditorComponent);
        component = fixture.componentInstance;
        component.canvas = mockCanvasRef;
        component.gameMapEditor = mockGameMap;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('ngAfterViewInit', () => {
        it('should initialize services and configure window events', async () => {
            component.ngAfterViewInit();
            expect(mockItemService.initializeItemCounts).toHaveBeenCalledWith(mockGameMap);
            expect(mockMapService.initialize).toHaveBeenCalledWith(jasmine.any(GameMapEditor), jasmine.any(ElementRef));
        });
    });

    describe('onMouseDown', () => {
        it('should start dragging an item if the tile has an item and is not right-clicked', () => {
            const mockCoordinate = { x: 1, y: 1 };
            mockMapService.hasItem.and.returnValue(true);
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);
            spyOn(CanvasHelper, 'getItemPositionInCanvas').and.returnValue([10, 10]);

            component.onMouseDown(new MouseEvent('mousedown', { button: 0 }));

            expect(mockMapService.hasItem).toHaveBeenCalledWith(mockCoordinate);
            expect(mockDragService.setDivItemImage).toHaveBeenCalledWith(mockCoordinate);
        });

        it('should return immediately if no tile is selected and right click is not pressed', () => {
            const mockEvent = new MouseEvent('mousedown', { button: 0 });
            (component as any)['selectedTile'] = null;
            component['isRightClick'] = false;

            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue({ x: 0, y: 0 });

            component.onMouseDown(mockEvent);
            expect(mockMapService.updateMap).not.toHaveBeenCalled();
        });

        it("should not remove item if map don't have item at this position", () => {
            const mockEvent = new MouseEvent('mousedown', { button: 0 });
            const mockCoordinate: Coordinate = { x: 0, y: 0 };
            component['selectedTile'] = { isDoor: false, isWall: false } as unknown as Tile;

            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);
            mockMapService.hasItem.and.returnValue(false);
            component.onMouseDown(mockEvent);

            expect(mockItemService.incrementItem).not.toHaveBeenCalled();
            expect(mockMapService.removeItem).not.toHaveBeenCalled();
        });

        it('should remove item if map have item at this position and no right click and the selectedTile is door', () => {
            const mockEvent = new MouseEvent('mousedown', { button: 2 });
            const mockCoordinate: Coordinate = { x: 0, y: 0 };
            component['selectedTile'] = { isDoor: true, isWall: false } as unknown as Tile;
            mockMapService.getItem.and.returnValue(mockItem);
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);
            mockMapService.hasItem.and.returnValue(true);
            component.onMouseDown(mockEvent);

            expect(mockItemService.incrementItem).toHaveBeenCalledWith(mockItem);
            expect(mockMapService.removeItem).toHaveBeenCalledWith(mockCoordinate);
            expect(component['isMousePressed']).toBeTrue();
        });

        it('should call updateMap when no item is found and tile is selected', () => {
            const mockEvent = new MouseEvent('mousedown', { button: 0 });
            const mockCoordinate: Coordinate = { x: 0, y: 0 };
            component['selectedTile'] = new IceTile();

            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);
            mockMapService.hasItem.and.returnValue(false);

            component.onMouseDown(mockEvent);

            expect(mockMapService.updateMap).toHaveBeenCalledWith(mockCoordinate, component['selectedTile'], false);
        });
    });

    describe('onMouseMove', () => {
        const mockEvent = new MouseEvent('mousemove');
        it('should update the map when the mouse is moved with a tile selected', () => {
            const mockCoordinate = { x: 1, y: 1 };
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);
            spyOn(CanvasHelper, 'isMouseInsideCanvas').and.returnValue(true);
            component['isMousePressed'] = true;
            component['selectedTile'] = mockTile;

            component.onMouseMove(new MouseEvent('mousemove'));

            expect(mockMapService.updateMap).toHaveBeenCalledWith(mockCoordinate, mockTile, false);
        });

        it('should increment item if the tile is a wall/door and right-click is not pressed', () => {
            const mockCoordinate: Coordinate = { x: 1, y: 1 };
            const mockRemovedItem = { name: 'Test Item' } as any;

            mockMapService.hasItem.and.returnValue(true);
            mockMapService.getItem.and.returnValue(mockRemovedItem);

            component['selectedTile'] = { isWall: true, isDoor: false } as any;
            component['isRightClick'] = false;
            component['isMousePressed'] = true;

            spyOn(CanvasHelper, 'isMouseInsideCanvas').and.returnValue(true);
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);

            component.onMouseMove(mockEvent);

            expect(mockMapService.hasItem).toHaveBeenCalledWith(mockCoordinate);
            expect(mockMapService.getItem).toHaveBeenCalledWith(mockCoordinate);
            expect(mockItemService.incrementItem).toHaveBeenCalledWith(mockRemovedItem);
        });

        it('should prevent default and return if mouse is not inside canvas', () => {
            spyOn(mockEvent, 'preventDefault');
            spyOn(CanvasHelper, 'isMouseInsideCanvas').and.returnValue(false);

            component.onMouseMove(mockEvent);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(CanvasHelper.isMouseInsideCanvas).toHaveBeenCalled();
        });

        it('should return if mouse is not pressed', () => {
            spyOn(CanvasHelper, 'isMouseInsideCanvas').and.returnValue(true);
            component['isMousePressed'] = false;

            component.onMouseMove(mockEvent);

            expect(CanvasHelper.isMouseInsideCanvas).toHaveBeenCalled();
        });

        it('should increment item count if mapService has item, not right click, and selected tile is door', () => {
            const mockCoordinate: Coordinate = { x: 0, y: 0 };
            component['isMousePressed'] = true;
            component['isRightClick'] = false;
            component['selectedTile'] = new DoorTile(TileType.DoorClosed);
            mockMapService.hasItem.and.returnValue(true);

            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);
            spyOn(CanvasHelper, 'isMouseInsideCanvas').and.returnValue(true);

            component.onMouseMove(mockEvent);

            expect(mockItemService.incrementItem).toHaveBeenCalled();
            expect(mockMapService.updateMap).toHaveBeenCalledWith(mockCoordinate, component['selectedTile'], false);
        });

        it('should update map if mouse is pressed and inside canvas', () => {
            const mockCoordinate: Coordinate = { x: 0, y: 0 };
            component['isMousePressed'] = true;
            component['isRightClick'] = false;

            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);
            spyOn(CanvasHelper, 'isMouseInsideCanvas').and.returnValue(true);

            component.onMouseMove(mockEvent);

            expect(mockMapService.updateMap).toHaveBeenCalledWith(mockCoordinate, component['selectedTile'], false);
        });
    });

    describe('disabledContextMenu', () => {
        it('should call preventDefault on the event', () => {
            const mockEvent = new MouseEvent('contextmenu');
            spyOn(mockEvent, 'preventDefault');

            component.disabledContextMenu(mockEvent);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('onMouseUp', () => {
        it('should reset mouse states and emit the updated map', () => {
            const emitSpy = spyOn(component.mapChanged, 'emit');
            component.onMouseUp(new MouseEvent('mouseup'));

            expect(component['isRightClick']).toBeFalse();
            expect(component['isMousePressed']).toBeFalse();
            expect(mockMapService.clearCoordinateToUpdate).toHaveBeenCalled();
            expect(component.isShowDraggableDiv).toBeFalse();
            expect(emitSpy).toHaveBeenCalledWith(mockMapService.getUpdateMap());
        });
    });

    describe('onDrop', () => {
        it('should not handle tile drop when not item is being dragged', () => {
            component.onDrop(new DragEvent('drop'));
            expect(mockDragService.handleDropFromTile).not.toHaveBeenCalled();
            expect(mockDragService.handleDropFromItemTools).not.toHaveBeenCalled();
        });
        it('should handle item drop when draggedItem is set', () => {
            const mockCoordinate = { x: 1, y: 1 };
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);
            spyOn(CanvasHelper, 'isMouseInsideCanvas').and.returnValue(true);
            mockDragService.draggedItem = new Item('', ItemType.BoostAttack, '');
            const event = new DragEvent('drop', { dataTransfer: new DataTransfer() });
            event.dataTransfer?.setData(DRAG_DATA_ENABLED_INDEX, JSON.stringify(true));
            component.onDrop(event);

            expect(mockDragService.handleDropFromItemTools).toHaveBeenCalledWith(mockCoordinate);
        });

        it('should handle tile drop when a tile is being dragged', () => {
            const mockCoordinate = { x: 1, y: 1 };
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(mockCoordinate);
            spyOn(CanvasHelper, 'isMouseInsideCanvas').and.returnValue(true);
            mockDragService.isStartDragFromTile.and.returnValue(true);
            const event = new DragEvent('drop', { dataTransfer: new DataTransfer() });
            event.dataTransfer?.setData(DRAG_DATA_ENABLED_INDEX, JSON.stringify(true));
            component.onDrop(event);

            expect(mockDragService.handleDropFromTile).toHaveBeenCalledWith(true, mockCoordinate);
        });
    });

    describe('onRestetMap', () => {
        it('should reset the map and emit the updated map', () => {
            const emitSpy = spyOn(component.mapReset, 'emit');
            component.onResetMap();
            expect(mockMapService.resetMap).toHaveBeenCalled();
            expect(mockItemService.initializeItemCounts).toHaveBeenCalledWith(mockGameMap);
            expect(emitSpy).toHaveBeenCalledWith(mockMapService.getUpdateMap());
        });
    });

    describe('onDragOver', () => {
        it('should set isMousePressed to false and call preventDefault on the event', () => {
            const mockEvent = new DragEvent('dragover');
            spyOn(mockEvent, 'preventDefault');

            component.onDragOver(mockEvent);

            expect(component['isMousePressed']).toBeFalse();
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('onSelectedTile', () => {
        it('should clone the tile and set it to selectedTile', () => {
            spyOn(mockTile, 'clone').and.returnValue(mockTile);

            component.onSelectedTile(mockTile);

            expect(mockTile.clone).toHaveBeenCalled();
            expect(component['selectedTile']).toEqual(mockTile.clone());
        });
    });

    describe('getCanvas', () => {
        it('should return the canvas ElementRef', () => {
            const mockCanvasRef1 = {
                nativeElement: document.createElement('canvas'),
            } as ElementRef<HTMLCanvasElement>;

            component.canvas = mockCanvasRef1;

            const result = component.getCanvas();

            expect(result).toBe(mockCanvasRef1);
        });
    });
    describe('onDragStart', () => {
        it('should not set DRAG_DATA_ENABLED_INDEX if no dataTransfer exists', () => {
            const event = new DragEvent('dragstart');
            component.onDragStart(event);
            expect(event.dataTransfer?.getData(DRAG_DATA_ENABLED_INDEX)).toBeUndefined();
        });

        it('should set DRAG_DATA_ENABLED_INDEX to true if dataTransfer exists', () => {
            const event = new DragEvent('dragstart', { dataTransfer: new DataTransfer() });
            component.onDragStart(event);
            expect(event.dataTransfer?.getData(DRAG_DATA_ENABLED_INDEX)).toBeTruthy();
        });
    });
    describe('handleDropFromItemTools', () => {
        it('should emit mapChanged event if isMouseInsideCanvas is true and handleDropFromItemTools returns true', () => {
            const mockCoordinate: Coordinate = { x: 1, y: 1 };
            const emitSpy = spyOn(component.mapChanged, 'emit');
            mockDragService.handleDropFromItemTools.and.returnValue(true);
            const mockUpdatedMap = [
                [0, 1],
                [1, 0],
            ];
            mockMapService.getUpdateMap.and.returnValue(mockUpdatedMap);

            component.handleDropFromItemTools(true, mockCoordinate);

            expect(mockDragService.handleDropFromItemTools).toHaveBeenCalledWith(mockCoordinate);
            expect(mockMapService.getUpdateMap).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledWith(mockUpdatedMap);
        });

        it('should not emit mapChanged event if isMouseInsideCanvas is false', () => {
            const mockCoordinate: Coordinate = { x: 1, y: 1 };
            const emitSpy = spyOn(component.mapChanged, 'emit');

            component.handleDropFromItemTools(false, mockCoordinate);

            expect(mockDragService.handleDropFromItemTools).not.toHaveBeenCalled();
            expect(emitSpy).not.toHaveBeenCalled();
        });

        it('should not emit mapChanged event if handleDropFromItemTools returns false', () => {
            const mockCoordinate: Coordinate = { x: 1, y: 1 };
            const emitSpy = spyOn(component.mapChanged, 'emit');
            mockDragService.handleDropFromItemTools.and.returnValue(false);

            component.handleDropFromItemTools(true, mockCoordinate);

            expect(mockDragService.handleDropFromItemTools).toHaveBeenCalledWith(mockCoordinate);
            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('handleDropFromTile', () => {
        it('should call handleDropFromTile on dragService and emit updated map', () => {
            const mockCoord: Coordinate = { x: 0, y: 0 };
            const isMouseInsideCanvas = true;
            const emitSpy = spyOn(component.mapChanged, 'emit');

            mockMapService.getUpdateMap.and.returnValue([
                [1, 0],
                [0, 1],
            ]);

            component.handleDropFromTile(isMouseInsideCanvas, mockCoord);

            expect(mockDragService.handleDropFromTile).toHaveBeenCalledWith(isMouseInsideCanvas, mockCoord);
            expect(mockMapService.getUpdateMap).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledWith([
                [1, 0],
                [0, 1],
            ]);
        });
    });
});
