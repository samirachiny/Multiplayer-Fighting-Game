/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { GameMapService } from './game-map.service';
import { DrawService } from '@app/services/draw/draw.service';
import { GameMap } from '@app/classes/game-map/game-map';
import { Coordinate } from '@common/interfaces/coordinate';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { Tile } from '@app/classes/tile/tile';
import { TILE_IMAGES } from '@app/constants/image';
import { DoorState } from '@common/enums/tile';
import { MAX_COLOR_VALUE } from '@app/constants/consts';
import { ItemFactory } from '@app/classes/item-factory/item-factory';
import { ItemType } from '@common/enums/item';
import { Color } from '@app/interfaces/color';

describe('GameMapService', () => {
    let service: GameMapService;
    let drawService: jasmine.SpyObj<DrawService>;
    let map: jasmine.SpyObj<GameMap>;
    let canvas: ElementRef<HTMLCanvasElement>;
    const tile: Tile = new Tile();

    beforeEach(() => {
        const drawServiceSpy = jasmine.createSpyObj('DrawService', [
            'initialize',
            'drawGameMap',
            'drawTile',
            'drawPlayer',
            'drawImage',
            'drawHighlight',
            'drawCircle',
        ]);

        TestBed.configureTestingModule({
            providers: [GameMapService, { provide: DrawService, useValue: drawServiceSpy }],
        });
        service = TestBed.inject(GameMapService);
        drawService = TestBed.inject(DrawService) as jasmine.SpyObj<DrawService>;
        map = jasmine.createSpyObj(
            'GameMap',
            [
                'removeItem',
                'toggleDoor',
                'isValidPosition',
                'getPlayer',
                'hasPlayer',
                'hasStartPoint',
                'hasItem',
                'hasWall',
                'hasClosedDoor',
                'applyItem',
            ],
            {
                tiles: [
                    [null, null],
                    [null, tile],
                ],
            },
        );
        service['map'] = map;
        canvas = new ElementRef(document.createElement('canvas'));
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize the game map', async () => {
        await service.initialize(map, canvas);
        expect(drawService.initialize).toHaveBeenCalledWith(canvas, map.tileSize);
        expect(drawService.drawGameMap).toHaveBeenCalledWith(map);
    });

    it('should set players', () => {
        const players = [{ pid: '1', name: 'Player 1', isGiveUp: false }] as any as PlayerInfos[];
        service.setPlayers(players);
        expect(map.players).toEqual(players);
    });

    it('should toggle door', () => {
        const pos: Coordinate = { x: 1, y: 1 };
        const doorState: DoorState = DoorState.Open;
        service.toggleDoor(pos, doorState);
        expect(map.toggleDoor).toHaveBeenCalledWith(pos, doorState);
        expect(drawService.drawTile).toHaveBeenCalledWith(pos, service['getTile'](pos));
    });
    describe('movePlayer', () => {
        it('should move player', () => {
            const player = { pid: '1', name: 'Player 1', previousPosition: { x: 1, y: 1 } };
            spyOn(service as any, 'getTile');
            service.movePlayer(player as any);
            expect(drawService.drawTile).toHaveBeenCalledWith(player.previousPosition, service['getTile'](player.previousPosition));
            expect(drawService.drawPlayer).toHaveBeenCalledWith(player as any);
        });
        it('should not move player if its previous position is null', () => {
            const player = { pid: '1', name: 'Player 1', previousPosition: null };
            spyOn(service as any, 'getTile');
            service.movePlayer(player as any);
            expect(drawService.drawTile).not.toHaveBeenCalled();
            expect(drawService.drawPlayer).not.toHaveBeenCalled();
        });
    });
    describe('erasePath', () => {
        it('should erase path', () => {
            const path: Coordinate[] = [{ x: 1, y: 1 }];
            service['rememberPath'] = path;
            spyOn(service as any, 'hasPlayer').and.returnValue(false);
            spyOn(service as any, 'getTile');
            service.erasePath();
            expect(drawService.drawTile).toHaveBeenCalledWith({ x: path[0].y, y: path[0].x }, service['getTile']({ x: path[0].y, y: path[0].x }));
            expect(drawService.drawHighlight).toHaveBeenCalledWith(path[0], { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
        });
        it('should not erase path if pos has player', () => {
            const path: Coordinate[] = [{ x: 1, y: 1 }];
            service['rememberPath'] = path;
            spyOn(service as any, 'hasPlayer').and.returnValue(true);
            spyOn(service as any, 'getTile');
            service.erasePath();
            expect(drawService.drawTile).not.toHaveBeenCalled();
            expect(drawService.drawHighlight).not.toHaveBeenCalled();
        });
    });
    describe('removeHightLightFormTile', () => {
        it('should remove highlight from tile', () => {
            const accessiblePositions: Coordinate[] = [{ x: 1, y: 1 }];
            service['hightLightPositions'] = accessiblePositions;
            spyOn(service as any, 'redrawPlayer');
            spyOn(service as any, 'getTile');
            service.removeHightLightFormTile();
            expect(drawService.drawTile).toHaveBeenCalledWith(
                { x: accessiblePositions[0].y, y: accessiblePositions[0].x },
                service['getTile']({ x: accessiblePositions[0].y, y: accessiblePositions[0].x }),
            );
            expect(service['redrawPlayer']).toHaveBeenCalledWith({ x: accessiblePositions[0].y, y: accessiblePositions[0].x });
        });
        it('should not remove highlight from tile if there is no tile', () => {
            service['hightLightPositions'] = [];
            spyOn(service as any, 'redrawPlayer');
            service.removeHightLightFormTile();
            expect(drawService.drawTile).not.toHaveBeenCalled();
            expect(service['redrawPlayer']).not.toHaveBeenCalled();
        });
    });
    describe('removePlayer', () => {
        it('should remove player', () => {
            const player = { pid: '1', name: 'Player 1', startPosition: { x: 1, y: 1 }, currentPosition: { x: 2, y: 2 } };
            spyOn(service as any, 'getTile');
            service.removePlayer(player as any);
            expect(map.removeItem).toHaveBeenCalledWith(player.startPosition);
            expect(drawService.drawTile).toHaveBeenCalledWith(player.startPosition, service['getTile'](player.startPosition));
            expect(drawService.drawTile).toHaveBeenCalledWith(player.currentPosition, service['getTile'](player.currentPosition));
        });
        it('should not remove player if there is no player', () => {
            service.removePlayer({ startPosition: null, currentPosition: null } as any);
            expect(map.removeItem).not.toHaveBeenCalled();
            expect(drawService.drawTile).not.toHaveBeenCalled();
        });
    });
    describe('replacePlayer', () => {
        it('should replace player', () => {
            const player = { pid: '1', name: 'Player 1', currentPosition: { x: 1, y: 1 } } as any;
            spyOn(service as any, 'getTile');
            service.replacePlayer(player as any);
            expect(drawService.drawTile).toHaveBeenCalledWith(player.currentPosition, service['getTile'](player.currentPosition));
            expect(drawService.drawPlayer).toHaveBeenCalledWith(player);
        });
        it("should not replace player if player doesn't have a current position ", () => {
            service.replacePlayer({ startPosition: null, currentPosition: null } as any);
            expect(map.removeItem).not.toHaveBeenCalled();
            expect(drawService.drawTile).not.toHaveBeenCalled();
            expect(drawService.drawPlayer).not.toHaveBeenCalled();
        });
    });
    describe('getTileInfos', () => {
        it('should get tile infos', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            map.isValidPosition.and.returnValue(true);
            spyOn(service as any, 'hasPlayer').and.returnValue(false);
            expect(service.getTileInfos(pos)).toEqual(service['getTile'](pos));
        });
        it('should not get tile infos if pos is not valid', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            map.isValidPosition.and.returnValue(false);
            spyOn(service as any, 'hasPlayer').and.returnValue(false);
            expect(service.getTileInfos(pos)).toBeNull();
        });
        it('should get tile infos if player is on the tile', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            map.isValidPosition.and.returnValue(true);
            spyOn(service as any, 'hasPlayer').and.returnValue(true);
            service.getTileInfos(pos);
            expect(map.getPlayer).toHaveBeenCalledWith(pos);
        });
    });
    describe('redrawPlayer', () => {
        it('should redraw player', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            const player = { id: '1', name: 'Player 1' } as any;
            spyOn(service as any, 'hasPlayer').and.returnValue(true);
            spyOn(service as any, 'getPlayer').and.returnValue(player);
            service['redrawPlayer'](pos);
            expect(drawService.drawPlayer).toHaveBeenCalledWith(player);
        });
        it('should not redraw player if there is no player', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            spyOn(service as any, 'hasPlayer').and.returnValue(false);
            service['redrawPlayer'](pos);
            expect(drawService.drawPlayer).not.toHaveBeenCalled();
        });
    });
    it('should show ice break', () => {
        const pos: Coordinate = { x: 1, y: 1 };
        service.showIceBreak(pos);
        expect(drawService.drawImage).toHaveBeenCalledWith({ x: pos.y, y: pos.x }, TILE_IMAGES.iceBreak);
    });

    it('should highlight tiles', () => {
        const accessiblePositions: Coordinate[] = [{ x: 1, y: 1 }];
        const color: Color = { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 };
        service.hightLightTiles(accessiblePositions, color);
        expect(drawService.drawHighlight).toHaveBeenCalledWith(accessiblePositions[0], color);
    });

    it('should check if position is accessible', () => {
        const pos: Coordinate = { x: 1, y: 1 };
        service['hightLightPositions'] = [pos];
        expect(service.isAccessiblePosition(pos)).toBeTrue();
    });

    it('should show path', () => {
        const path: Coordinate[] = [{ x: 1, y: 1 }];
        service.showPath(path);
        expect(drawService.drawCircle).toHaveBeenCalledWith(path[0]);
    });

    it('should reset path', () => {
        service['rememberPath'] = [{ x: 1, y: 1 }];
        service.resetPath();
        expect(service['rememberPath']).toEqual([]);
    });

    it('should check if position has player', () => {
        const pos: Coordinate = { x: 1, y: 1 };
        map.hasPlayer.and.returnValue(true);
        expect(service['hasPlayer'](pos)).toBeTrue();
    });

    it('should get player', () => {
        const pos: Coordinate = { x: 1, y: 1 };
        const player = { id: '1', name: 'Player 1' } as any;
        map.getPlayer.and.returnValue(player as any);
        expect(service['getPlayer'](pos)).toEqual(player);
    });

    it('should get tile', () => {
        const pos: Coordinate = { x: 1, y: 1 };
        expect(service['getTile'](pos)).toEqual(tile);
    });

    describe('shouldTeleportTo', () => {
        it('should return false if position is not valid', () => {
            const pos = { x: 1, y: 1 };
            map.isValidPosition.and.returnValue(false);
            expect(service.shouldTeleportTo(pos)).toBeFalse();
        });

        it('should return false if position has player', () => {
            const pos = { x: 1, y: 1 };
            map.isValidPosition.and.returnValue(true);
            map.hasPlayer.and.returnValue(true);
            expect(service.shouldTeleportTo(pos)).toBeFalse();
        });

        it('should return false if position has item and no start point', () => {
            const pos = { x: 1, y: 1 };
            map.isValidPosition.and.returnValue(true);
            map.hasPlayer.and.returnValue(false);
            map.hasItem.and.returnValue(true);
            map.hasStartPoint.and.returnValue(false);
            expect(service.shouldTeleportTo(pos)).toBeFalse();
        });

        it('should return false if position has wall', () => {
            const pos = { x: 1, y: 1 };
            map.isValidPosition.and.returnValue(true);
            map.hasPlayer.and.returnValue(false);
            map.hasItem.and.returnValue(false);
            map.hasWall.and.returnValue(true);
            expect(service.shouldTeleportTo(pos)).toBeFalse();
        });

        it('should return false if position has closed door', () => {
            const pos = { x: 1, y: 1 };
            map.isValidPosition.and.returnValue(true);
            map.hasPlayer.and.returnValue(false);
            map.hasItem.and.returnValue(false);
            map.hasWall.and.returnValue(false);
            map.hasClosedDoor.and.returnValue(true);
            expect(service.shouldTeleportTo(pos)).toBeFalse();
        });

        it('should return true if position is valid and has no player, item without start point, wall, or closed door', () => {
            const pos = { x: 1, y: 1 };
            map.isValidPosition.and.returnValue(true);
            map.hasPlayer.and.returnValue(false);
            map.hasItem.and.returnValue(false);
            map.hasWall.and.returnValue(false);
            map.hasClosedDoor.and.returnValue(false);
            expect(service.shouldTeleportTo(pos)).toBeTrue();
        });
    });
    it('should remove item, redraw tile, and redraw player', () => {
        const pos: Coordinate = { x: 1, y: 1 };

        spyOn(service as any, 'getTile').and.returnValue(tile);
        spyOn(service as any, 'redrawPlayer');

        service.removeItem(pos);

        expect(map.removeItem).toHaveBeenCalledWith({ x: pos.y, y: pos.x });
        expect(drawService.drawTile).toHaveBeenCalledWith({ x: pos.y, y: pos.x }, tile);
        expect(service['redrawPlayer']).toHaveBeenCalledWith({ x: pos.y, y: pos.x });
    });

    describe('replaceItem', () => {
        it('should replace item and redraw tile', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            const itemNumber: ItemType = ItemType.BoostAttack;

            const item = { id: itemNumber }; // Mock item
            spyOn(ItemFactory, 'createItem').and.returnValue(item as any);
            spyOn(service as any, 'getTile').and.returnValue(tile);
            spyOn(service as any, 'redrawPlayer');
            spyOn(service as any, 'isAccessiblePosition').and.returnValue(true);

            service.replaceItem(pos, itemNumber);

            expect(map.applyItem).toHaveBeenCalledWith(pos, item as any);
            expect(drawService.drawTile).toHaveBeenCalledWith(pos, tile);
            expect(service['redrawPlayer']).toHaveBeenCalledWith(pos);
            expect(service['isAccessiblePosition']).toHaveBeenCalledWith(pos);
            expect(drawService.drawHighlight).toHaveBeenCalledWith(pos, { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
        });

        it('should not replace item if ItemFactory.createItem returns null', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            const itemNumber: ItemType = ItemType.BoostAttack;

            spyOn(ItemFactory, 'createItem').and.returnValue(null);
            spyOn(service as any, 'getTile');
            spyOn(service as any, 'redrawPlayer');
            spyOn(service as any, 'isAccessiblePosition');

            service.replaceItem(pos, itemNumber);

            expect(map.applyItem).not.toHaveBeenCalled();
            expect(drawService.drawTile).not.toHaveBeenCalled();
            expect(service['redrawPlayer']).not.toHaveBeenCalled();
            expect(service['isAccessiblePosition']).not.toHaveBeenCalled();
            expect(drawService.drawHighlight).not.toHaveBeenCalled();
        });

        it('should not call drawHighlight if the position is not accessible', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            const itemNumber: ItemType = ItemType.BoostAttack;

            const item = { id: itemNumber }; // Mock item
            spyOn(ItemFactory, 'createItem').and.returnValue(item as any);
            spyOn(service as any, 'getTile').and.returnValue(tile);
            spyOn(service as any, 'redrawPlayer');
            spyOn(service as any, 'isAccessiblePosition').and.returnValue(false);

            service.replaceItem(pos, itemNumber);

            expect(map.applyItem).toHaveBeenCalledWith(pos, item as any);
            expect(drawService.drawTile).toHaveBeenCalledWith(pos, tile);
            expect(service['redrawPlayer']).toHaveBeenCalledWith(pos);
            expect(service['isAccessiblePosition']).toHaveBeenCalledWith(pos);
            expect(drawService.drawHighlight).not.toHaveBeenCalled();
        });
    });
});
