/* eslint-disable @typescript-eslint/no-explicit-any */
import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DoorTile } from '@app/classes/door-tile/door-tile';
import { Item } from '@app/classes/item/item';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';
import { Tile } from '@app/classes/tile/tile';
import { ItemType } from '@common/enums/item';
import { TileType } from '@common/enums/tile';
import { Coordinate } from '@app/interfaces/coordinate';
import { DrawService } from '@app/services/draw/draw.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { MAX_COLOR_VALUE } from '@app/constants/consts';

describe('MapEditorService', () => {
    let service: MapEditorService;
    let mockDrawService: jasmine.SpyObj<DrawService>;
    let mockGameMap: jasmine.SpyObj<GameMapEditor>;
    let mockTiles: Tile[][];
    let mockCanvas: ElementRef<HTMLCanvasElement>;

    beforeEach(async () => {
        mockDrawService = jasmine.createSpyObj('DrawService', ['initialize', 'drawGameMap', 'drawTile', 'drawHighlight', 'removeHighlight']);
        mockGameMap = jasmine.createSpyObj('GameMap', ['clone', 'applyTile', 'applyItem', 'removeItem', 'hasItem', 'toData', 'isValidPosition'], {
            size: 10,
            tileSize: 60,
        });
        mockTiles = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => new Tile()));
        Object.defineProperty(mockGameMap, 'tiles', {
            get: () => mockTiles,
        });
        mockCanvas = {
            nativeElement: document.createElement('canvas'),
        } as ElementRef<HTMLCanvasElement>;

        TestBed.configureTestingModule({
            providers: [MapEditorService, { provide: DrawService, useValue: mockDrawService }],
        });
        service = TestBed.inject(MapEditorService);
        service['map'] = mockGameMap;
        service['originalMap'] = mockGameMap;
    });

    describe('initialize', async () => {
        it('should initialize the map service and clone the map', async () => {
            await service.initialize(mockGameMap, mockCanvas);
            expect(service['originalMap']).toEqual(mockGameMap);
            expect(mockGameMap.clone).toHaveBeenCalled();
            expect(mockDrawService.initialize).toHaveBeenCalledWith(mockCanvas, mockGameMap.tileSize);
            expect(mockDrawService.drawGameMap).toHaveBeenCalledWith(mockGameMap);
        });
    });

    describe('applyTile', () => {
        it('should clone and apply the tile to the map', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };
            const tile = new Tile();

            service['applyTile'](coordinate, tile);
            expect(mockGameMap.applyTile).toHaveBeenCalledWith(coordinate, jasmine.any(Tile));
            expect(mockDrawService.drawTile).toHaveBeenCalledWith(coordinate, jasmine.any(Tile));
        });

        it('should handle door tile correctly', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };
            const doorTileMap = new DoorTile(TileType.DoorClosed);

            spyOn(service as any, 'getTile').and.returnValue(doorTileMap);

            const doorTile = new DoorTile(TileType.DoorClosed);
            spyOn(doorTile, 'clone').and.returnValue(doorTile);
            const spyTileMap = spyOn(doorTileMap, 'clone').and.returnValue(doorTile);

            service['applyTile'](coordinate, doorTile);
            expect(doorTile.isDoor).toBeTrue();
            expect(doorTileMap.isDoor).toBeTrue();
            expect(spyTileMap).toHaveBeenCalled();
        });

        it('should return immediately if tileMap is null or undefined', () => {
            const coordinate: Coordinate = { x: 1, y: 1 };
            const mockTile = new Tile();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(service as any, 'getTile').and.returnValue(null);

            service['applyTile'](coordinate, mockTile);

            expect(service['getTile']).toHaveBeenCalledWith(coordinate);
            expect(mockDrawService.drawTile).not.toHaveBeenCalled();
            expect(mockGameMap.applyTile).not.toHaveBeenCalled();
        });

        it('should return if the tile is null', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };
            service['applyTile'](coordinate, null as unknown as Tile);
            expect(mockGameMap.applyTile).not.toHaveBeenCalled();
        });
    });

    describe('applyItem', () => {
        it('should apply the item to the map and draw the tile', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };
            const item = new Item('imag', ItemType.BoostAttack, '');

            mockGameMap.applyItem.and.returnValue(true);
            service.applyItem(coordinate, item);
            expect(mockGameMap.applyItem).toHaveBeenCalledWith(coordinate, item);
            expect(mockDrawService.drawTile).toHaveBeenCalledWith(coordinate, jasmine.any(Tile));
        });

        it('should return false if the item is not applied', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };
            const item = new Item('imag', ItemType.BoostAttack, '');

            mockGameMap.applyItem.and.returnValue(false);
            const result = service.applyItem(coordinate, item);
            expect(result).toBeFalse();
            expect(mockDrawService.drawTile).not.toHaveBeenCalled();
        });
    });

    describe('removeTile', () => {
        it('should remove a tile from the map and draw the base tile', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };

            service['removeTile'](coordinate);
            expect(mockGameMap.applyTile).toHaveBeenCalled();
            expect(mockDrawService.drawTile).toHaveBeenCalledWith(coordinate, jasmine.any(Tile));
        });
    });

    describe('removeItem', () => {
        it('should remove an item from the map and draw the tile', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };

            service.removeItem(coordinate);
            expect(mockGameMap.removeItem).toHaveBeenCalledWith(coordinate);
            expect(mockDrawService.drawTile).toHaveBeenCalledWith(coordinate, jasmine.any(Tile));
        });
    });

    describe('getItem', () => {
        it('should return the item from the specified tile', () => {
            const mockItem: Item = { name: 'Test Item' } as unknown as Item;
            const row = 0;
            const col = 0;

            mockTiles[row][col].setItem(mockItem);
            const result = service.getItem({ x: row, y: col });
            expect(result).toEqual(mockItem);
        });

        it('should return null if there is no item on the specified tile', () => {
            const row = 0;
            const col = 0;

            mockTiles[row][col].setItem(null);

            const result = service.getItem({ x: row, y: col });
            expect(result).toBeNull();
        });
    });

    describe('hasItem', () => {
        it('should return true if the tile has an item', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };

            mockGameMap.hasItem.and.returnValue(true);
            expect(service.hasItem(coordinate)).toBeTrue();
        });

        it('should return false if the tile does not have an item', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };

            mockGameMap.hasItem.and.returnValue(false);
            expect(service.hasItem(coordinate)).toBeFalse();
        });
    });

    describe('hightLightNoAccessTiles', () => {
        it('should highlight tiles that are not accessible', () => {
            const accessPosTiles: Coordinate[] = [{ x: 1, y: 1 }];
            service.hightLightNoAccessTiles(accessPosTiles);
            expect(mockDrawService.drawHighlight).toHaveBeenCalled();
        });

        it('should not highlight if no access tiles are provided', () => {
            service.hightLightNoAccessTiles([]);
            expect(mockDrawService.drawHighlight).not.toHaveBeenCalled();
        });
    });

    describe('hightLightInvalidDoors', () => {
        it('should highlight invalid doors', () => {
            const invalidDoorsPos: Coordinate[] = [{ x: 1, y: 1 }];
            service.hightLightInvalidDoors(invalidDoorsPos);
            expect(mockDrawService.drawHighlight).toHaveBeenCalledWith(invalidDoorsPos[0], { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
        });
    });

    describe('removeHightLightFormTile', () => {
        it('should remove the highlight from tiles', () => {
            service['invalidPositions'] = [{ x: 0, y: 0 }];
            service.removeHightLightFormTile();
            expect(mockDrawService.drawTile).toHaveBeenCalled();
            expect(service['invalidPositions'].length).toBe(0);
        });

        it('should do nothing if there are no invalid positions', () => {
            service.removeHightLightFormTile();
            expect(mockDrawService.drawTile).not.toHaveBeenCalled();
        });
    });

    describe('updateMap', () => {
        it('should return false if coordinate already in updatePositions', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };
            const tile = new Tile();
            service['updatePositions'] = [coordinate];
            mockGameMap.isValidPosition.and.returnValue(true);
            const result = service.updateMap(coordinate, tile, false);
            expect(result).toBeFalse();
        });

        it('should update the map with a new tile', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };
            const tile = new Tile();
            mockGameMap.isValidPosition.and.returnValue(true);
            service.updateMap(coordinate, tile, false);

            expect(mockGameMap.applyTile).toHaveBeenCalledWith(coordinate, jasmine.any(Tile));
        });

        it('should remove the tile if isRemove is true', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };
            mockGameMap.isValidPosition.and.returnValue(true);
            service.updateMap(coordinate, new Tile(), true);

            expect(mockGameMap.applyTile).toHaveBeenCalled();
        });

        it('should call removeHightLightFormTile even if the position is invalid', () => {
            spyOn(service, 'removeHightLightFormTile');
            mockGameMap.isValidPosition.and.returnValue(false);
            const coordinate: Coordinate = { x: 0, y: 0 };
            const tile = new Tile();

            service.updateMap(coordinate, tile, false);

            expect(service.removeHightLightFormTile).toHaveBeenCalled();
        });

        it('should call removeHightLightFormTile even if the position is invalid', () => {
            spyOn(service, 'removeHightLightFormTile');
            mockGameMap.isValidPosition.and.returnValue(false);
            const coordinate: Coordinate = { x: 0, y: 0 };
            const tile = new Tile();

            service.updateMap(coordinate, tile, false);

            expect(service.removeHightLightFormTile).toHaveBeenCalled();
        });

        it('should not call removeTile if the position is invalid, even if isRemove is true', () => {
            spyOn(service as any, 'removeTile');
            mockGameMap.isValidPosition.and.returnValue(false);
            const coordinate: Coordinate = { x: 0, y: 0 };
            const tile = new Tile();

            const result = service.updateMap(coordinate, tile, true);

            expect(result).toBeFalse();
            expect(service['removeTile']).not.toHaveBeenCalled();
        });

        it('should call removeHightLightFormTile even if coordinate is already in updatePositions', () => {
            service['updatePositions'] = [{ x: 1, y: 1 }];
            spyOn(service, 'removeHightLightFormTile');
            const mockCoordinate: Coordinate = { x: 1, y: 1 };
            const mockTile = new Tile();

            service.updateMap(mockCoordinate, mockTile, false);

            expect(service.removeHightLightFormTile).toHaveBeenCalled();
        });

        it('should return false if the position is invalid', () => {
            const coordinate: Coordinate = { x: 0, y: 0 };
            mockGameMap.isValidPosition.and.returnValue(false);
            service['updatePositions'] = [{ x: 1, y: 1 }];

            const result = service.updateMap(coordinate, new Tile(), false);
            expect(result).toBeFalse();
            expect(mockGameMap.applyTile).not.toHaveBeenCalled();
        });

        it('should return false if the coordinate is already in updatePositions', () => {
            const mockCoordinate: Coordinate = { x: 1, y: 1 };
            const mockTile = new Tile();
            spyOn(service as any, 'removeTile');
            spyOn(service as any, 'applyTile');

            service['updatePositions'] = [{ x: 1, y: 1 }];

            let result = service.updateMap(mockCoordinate, mockTile, false);
            expect(result).toBeFalse();
            expect(service['applyTile']).not.toHaveBeenCalled();
            expect(service['removeTile']).not.toHaveBeenCalled();

            result = service.updateMap(mockCoordinate, mockTile, true);
            expect(result).toBeFalse();
            expect(service['applyTile']).not.toHaveBeenCalled();
            expect(service['removeTile']).not.toHaveBeenCalled();
        });

        it('should return true if the coordinate is not in updatePositions and update updatePositions', () => {
            const mockCoordinate: Coordinate = { x: 1, y: 1 };
            service['updatePositions'] = [{ x: 0, y: 1 }];
            const mockTile = new Tile();
            spyOn(service as any, 'removeTile');
            spyOn(service as any, 'applyTile');
            mockGameMap.isValidPosition.and.returnValue(true);
            const result = service.updateMap(mockCoordinate, mockTile, true);
            expect(result).toBeTrue();
            expect(service['updatePositions']).toContain(mockCoordinate);
            expect(service['applyTile']).not.toHaveBeenCalled();
            expect(service['removeTile']).toHaveBeenCalled();
        });

        it('should return true if the coordinate is not in updatePositions and update updatePositions', () => {
            service['updatePositions'] = [{ x: 1, y: 0 }];
            const mockCoordinate: Coordinate = { x: 1, y: 1 };
            const mockTile = new Tile();
            spyOn(service as any, 'removeTile');
            spyOn(service as any, 'applyTile');
            mockGameMap.isValidPosition.and.returnValue(true);
            const result = service.updateMap(mockCoordinate, mockTile, false);
            expect(result).toBeTrue();
            expect(service['updatePositions']).toContain(mockCoordinate);
            expect(service['applyTile']).toHaveBeenCalled();
            expect(service['removeTile']).not.toHaveBeenCalled();
        });

        it('should return true if the coordinate is not in updatePositions and update updatePositions', () => {
            service['updatePositions'] = [];
            const mockCoordinate: Coordinate = { x: 1, y: 1 };
            const mockTile = new Tile();
            spyOn(service as any, 'removeTile');
            spyOn(service as any, 'applyTile');
            mockGameMap.isValidPosition.and.returnValue(true);
            const result = service.updateMap(mockCoordinate, mockTile, false);
            expect(result).toBeTrue();
            expect(service['updatePositions']).toContain(mockCoordinate);
            expect(service['applyTile']).toHaveBeenCalled();
            expect(service['removeTile']).not.toHaveBeenCalled();
        });
    });

    describe('resetMap', () => {
        it('should reset the map to the original state and redraw it', () => {
            mockGameMap.clone.and.returnValue(mockGameMap);
            service.resetMap();
            expect(mockGameMap.clone).toHaveBeenCalled();
            expect(mockDrawService.drawGameMap).toHaveBeenCalledWith(mockGameMap);
        });
    });

    describe('getUpdateMap', () => {
        it('should return the updated map data', () => {
            service.getUpdateMap();
            expect(mockGameMap.toData).toHaveBeenCalled();
        });

        it('should return the map data by calling toData method', () => {
            const mockMapData = [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
            ];
            mockGameMap.toData.and.returnValue(mockMapData);
            const result = service.getUpdateMap();

            expect(mockGameMap.toData).toHaveBeenCalled();
            expect(result).toEqual(mockMapData);
        });
    });

    describe('clearCoordinateToUpdate', () => {
        it('should clear the updatePositions array', () => {
            service['updatePositions'] = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];

            service.clearCoordinateToUpdate();
            expect(service['updatePositions']).toEqual([]);
        });
    });
});
