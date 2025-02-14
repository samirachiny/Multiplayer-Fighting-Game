/* eslint-disable @typescript-eslint/no-magic-numbers */
import { GameMap } from './game-map';
import { ItemFactory } from '@app/classes/item-factory/item-factory';
import { TileFactory } from '@app/classes/tile-factory/tile-factory';
import { Coordinate } from '@common/interfaces/coordinate';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { DoorState, TileType } from '@common/enums/tile';
import { DoorTile } from '@app/classes/door-tile/door-tile';
import { Tile } from '@app/classes/tile/tile';
import { ItemType } from '@common/enums/item';

describe('GameMap', () => {
    let gameMap: GameMap;
    let size: number;
    let width: number;
    let height: number;
    let data: number[][];
    let players: PlayerInfos[];

    beforeEach(() => {
        size = 10;
        width = 10;
        height = 10;
        data = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        players = [{ pid: '1', name: 'Player 1', startPosition: { x: 0, y: 0 }, currentPosition: { x: 0, y: 0 } } as any as PlayerInfos];
        gameMap = new GameMap(size, width, height, data, players);
    });

    it('should create an instance of GameMap', () => {
        expect(gameMap).toBeTruthy();
    });
    it('should create an instance of GameMap with empty players', () => {
        gameMap = new GameMap(size, width, height, data);
        expect(gameMap).toBeTruthy();
    });
    it('should set item if item type is StartingPoint and player is at position', () => {
        const mockTile = new Tile();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockItem = { type: ItemType.StartingPoint } as any;
        spyOn(TileFactory, 'createTile').and.returnValue(mockTile);
        spyOn(ItemFactory, 'createItem').and.returnValue(mockItem);
        spyOn(mockTile, 'setItem');
        gameMap['initializeMap'](data);
        expect(mockTile.setItem).toHaveBeenCalledWith(mockItem);
    });
    it('should initialize the map with tiles', () => {
        spyOn(TileFactory, 'createTile').and.callThrough();
        spyOn(ItemFactory, 'createItem').and.returnValue(null);
        gameMap['initializeMap'](data);
        expect(TileFactory.createTile).toHaveBeenCalled();
        expect(ItemFactory.createItem).toHaveBeenCalled();
    });

    it('should set a tile with a door open', () => {
        const pos: Coordinate = { x: 1, y: 1 };
        gameMap.toggleDoor(pos, DoorState.Open);
        expect(gameMap['_tiles'][pos.x][pos.y]).toBeInstanceOf(DoorTile);
        expect(gameMap['_tiles'][pos.x][pos.y].type).toBe(TileType.DoorOpen);
    });
    it('should set a tile with a door closed', () => {
        const pos: Coordinate = { x: 1, y: 1 };
        gameMap.toggleDoor(pos, DoorState.Closed);
        expect(gameMap['_tiles'][pos.x][pos.y]).toBeInstanceOf(DoorTile);
        expect(gameMap['_tiles'][pos.x][pos.y].type).toBe(TileType.DoorClosed);
    });

    it('should check if a position has a player', () => {
        const pos: Coordinate = { x: 0, y: 0 };
        expect(gameMap.hasPlayer(pos)).toBeTrue();
    });

    it('should return false if a position is invalid', () => {
        const pos: Coordinate = { x: -1, y: -1 };
        expect(gameMap.hasPlayer(pos)).toBeFalse();
    });

    it('should get a player at a position', () => {
        const pos: Coordinate = { x: 0, y: 0 };
        expect(gameMap.getPlayer(pos)).toEqual(players[0]);
    });

    it('should return null if no player is at a position', () => {
        const pos: Coordinate = { x: 1, y: 1 };
        expect(gameMap.getPlayer(pos)).toBeNull();
    });

    describe('hasStartPoint', () => {
        it('should return true if the position has start point', () => {
            const pos: Coordinate = { x: 0, y: 0 };
            gameMap['_tiles'] = [[{ item: { type: ItemType.StartingPoint } } as unknown as Tile]];
            expect(gameMap.hasStartPoint(pos)).toBeTrue();
        });

        it('should return false if the position has no start point', () => {
            const pos: Coordinate = { x: 0, y: 0 };
            gameMap['_tiles'] = [[{ item: { type: ItemType.Random } } as unknown as Tile]];
            expect(gameMap.hasStartPoint(pos)).toBeFalse();
        });

        it('should return false for an invalid position', () => {
            const pos: Coordinate = { x: -1, y: -1 };
            expect(gameMap.hasStartPoint(pos)).toBeFalse();
        });
    });
});
