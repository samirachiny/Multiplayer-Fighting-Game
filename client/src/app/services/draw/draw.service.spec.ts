/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DrawService } from '@app/services/draw/draw.service';
import { Tile } from '@app/classes/tile/tile';
import { RandomItem } from '@app/classes/random-item/random-item';
import { Coordinate } from '@common/interfaces/coordinate';
import { GameMap } from '@app/classes/game-map/game-map';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';

describe('DrawService', () => {
    let service: DrawService;
    let mockCanvas: any;
    let mockContext: any;
    let mockImageService: any;

    beforeEach(async () => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(DrawService);

        mockContext = jasmine.createSpyObj('CanvasRenderingContext2D', [
            'drawImage',
            'strokeRect',
            'fillStyle',
            'arc',
            'fill',
            'fillRect',
            'beginPath',
        ]);
        mockCanvas = {
            nativeElement: {
                getContext: jasmine.createSpy().and.returnValue(mockContext),
            },
        };
        mockImageService = jasmine.createSpyObj('ImageService', ['preloadImages', 'getImage']);
        service['imageService'] = mockImageService;
        service.initialize(mockCanvas as ElementRef<HTMLCanvasElement>, 100);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initializes context and tileSize correctly', () => {
        expect(service['canvas']).toBe(mockCanvas);
        expect(service['tileSize']).toEqual(100);
        expect(mockCanvas.nativeElement.getContext).toHaveBeenCalledWith('2d');
    });

    describe('drawImage', () => {
        it('should draw an image on the canvas', () => {
            const mockCoordinate: Coordinate = { x: 2, y: 3 };
            spyOn(service as any, 'getImage').and.returnValue(mockImageService);
            const imagePath = 'path/to/image.png';
            service.drawImage(mockCoordinate, imagePath);
            expect(mockContext.drawImage).toHaveBeenCalledWith(
                mockImageService,
                mockCoordinate.x * service['tileSize'],
                mockCoordinate.y * service['tileSize'],
                service['tileSize'],
                service['tileSize'],
            );
        });
        it('should not draw an image on the canvas if no image', () => {
            const mockCoordinate: Coordinate = { x: 2, y: 3 };
            spyOn(service as any, 'getImage').and.returnValue(undefined);
            const imagePath = 'path/to/image.png';
            service.drawImage(mockCoordinate, imagePath);
            expect(mockContext.drawImage).not.toHaveBeenCalled();
        });

        it('should not draw an image if no canvas', () => {
            const mockCoordinate: Coordinate = { x: 2, y: 3 };
            spyOn(service as any, 'getImage').and.returnValue(undefined);
            const imagePath = 'path/to/image.png';
            service['context'] = null;
            service.drawImage(mockCoordinate, imagePath);
            expect(mockContext.drawImage).not.toHaveBeenCalled();
        });
    });
    describe('drawCircle', () => {
        it('should draw a circle on the canvas', () => {
            const mockCoordinate: Coordinate = { x: 2, y: 3 };
            service.drawCircle(mockCoordinate);
            expect(mockContext.beginPath).toHaveBeenCalled();
            expect(mockContext.arc).toHaveBeenCalled();
            expect(mockContext.fill).toHaveBeenCalled();
        });

        it('should not draw a circle on the canvas if no context', () => {
            const mockCoordinate: Coordinate = { x: 2, y: 3 };
            service['context'] = null;
            service.drawCircle(mockCoordinate);
            expect(mockContext.beginPath).not.toHaveBeenCalled();
            expect(mockContext.arc).not.toHaveBeenCalled();
            expect(mockContext.fill).not.toHaveBeenCalled();
        });
    });
    describe('drawPlayers', () => {
        it('should draw players', () => {
            spyOn(service, 'drawPlayer');
            const players = [
                { name: 'player1', color: 'red', score: 1, position: { x: 0, y: 0 } },
                { name: 'player2', color: 'blue', score: 2, position: { x: 1, y: 1 } },
            ];
            service.drawPlayers(players as any);
            expect(service.drawPlayer).toHaveBeenCalledTimes(players.length);
        });
    });
    describe('drawPlayer', () => {
        it('should draw player', () => {
            spyOn(service, 'drawImage');
            const player = { character: { imagePath: 'path/to/image.png' }, currentPosition: { x: 0, y: 0 } };
            service.drawPlayer(player as any);
            expect(service.drawImage).toHaveBeenCalledWith(player.currentPosition, player.character.imagePath);
        });
        it('should not draw player if no currentPosition', () => {
            spyOn(service, 'drawImage');
            const player = { character: { imagePath: 'path/to/image.png' }, currentPosition: null };
            service.drawPlayer(player as any);
            expect(service.drawImage).not.toHaveBeenCalled();
        });
    });
    describe('drawTile', () => {
        it('should handle drawTile without item', () => {
            const drawImageSpy = spyOn(service, 'drawImage');
            const coord = { x: 0, y: 2 };
            const tile = new Tile();
            service.drawTile(coord, tile);
            expect(drawImageSpy).toHaveBeenCalledWith(coord, tile.image);
        });

        it('should handle drawTile with item', () => {
            const drawImageSpy = spyOn(service, 'drawImage');
            const coord = { x: 0, y: 2 };
            const tile = new Tile();
            tile['_item'] = new RandomItem();
            service.drawTile(coord, tile);
            expect(drawImageSpy).toHaveBeenCalledWith(coord, tile.image);
            expect(drawImageSpy).toHaveBeenCalledWith(coord, (tile['item'] as any).image);
        });
    });
    describe('drawGameMap', () => {
        it('should call drawTile for each tile and drawPlayers', () => {
            spyOn(service, 'drawPlayers');
            spyOn(service, 'drawTile');
            const map = {
                size: 2,
                tiles: [
                    [{ image: 'path/to/tile1.png' } as any, { image: 'path/to/tile2.png' } as any],
                    [{ image: 'path/to/tile3.png' } as any, { image: 'path/to/tile4.png' } as any],
                ],
                players: [{ position: { x: 1, y: 2 } } as any],
            } as any as GameMap;
            Object.setPrototypeOf(map, GameMap.prototype);
            service.drawGameMap(map);
            expect(service.drawTile).toHaveBeenCalledTimes(4);
            expect(service.drawPlayers).toHaveBeenCalled();
        });
        it('should call drawTile for each tile and not drawPlayers if map is GameMapEditor', () => {
            spyOn(service, 'drawPlayers');
            spyOn(service, 'drawTile');
            const map = {
                size: 2,
                tiles: [
                    [{ image: 'path/to/tile1.png' }, { image: 'path/to/tile2.png' }],
                    [{ image: 'path/to/tile3.png' }, { image: 'path/to/tile4.png' }],
                ],
            } as any as GameMapEditor;
            service.drawGameMap(map);
            expect(service.drawTile).toHaveBeenCalledTimes(map.tiles.length * map.tiles[0].length);
            expect(service.drawPlayers).not.toHaveBeenCalled();
        });
    });
    describe('drawHighlight', () => {
        it('should do nothing when context is null', () => {
            const coordinate = { x: 1, y: 1 };
            service['context'] = null;

            service.drawHighlight(coordinate, { red: 255, green: 0, blue: 0 });
            expect(mockContext.strokeRect).not.toHaveBeenCalled();
        });

        it('should stroke rectangle with correct parameters', () => {
            const coordinate = { x: 3, y: 2 };

            service.drawHighlight(coordinate, { red: 255, green: 0, blue: 0 });
            expect(mockContext.fillStyle).toEqual('rgba(255, 0, 0, 0.2)');
            expect(mockContext.fillRect).toHaveBeenCalledWith(200, 300, 100, 100);
        });
    });

    describe('getImage', () => {
        it('should return image', () => {
            const mockHTMLImage = jasmine.createSpyObj(HTMLImageElement, ['anyFunc']);
            mockImageService.getImage.and.returnValue(mockHTMLImage);
            const path = 'path/to/image.png';
            const image = service['getImage'](path);
            expect(image).toEqual(mockHTMLImage);
        });
    });
});
