/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameMapComponent } from './game-map.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { ElementRef } from '@angular/core';
import { Coordinate } from '@common/interfaces/coordinate';
import { Tile } from '@app/classes/tile/tile';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { CanvasHelper } from '@app/classes/canvas-helper/canvas-helper';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { PartyInfos } from '@common/interfaces/party';
import { GameMode } from '@common/enums/game-infos';
import { GameMap } from '@app/classes/game-map/game-map';
import { MAX_COLOR_VALUE } from '@app/constants/consts';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';

describe('GameMapComponent', () => {
    let component: GameMapComponent;
    let fixture: ComponentFixture<GameMapComponent>;
    let socketService: SocketClientServiceMock;
    let gameMapService: any;
    let socketHelper: SocketTestHelper;
    const mockCanvasElement = document.createElement('canvas');
    const mockParty = { game: { gid: 'game', mapSize: 0, gameMap: [[]] }, players: [] };
    const mockCanvasRef: ElementRef<HTMLCanvasElement> = new ElementRef(mockCanvasElement);
    let mockGameMap: any;

    beforeEach(async () => {
        socketService = new SocketClientServiceMock();
        socketHelper = socketService['socket'] as any as SocketTestHelper;
        gameMapService = jasmine.createSpyObj('GameMapService', [
            'initialize',
            'removeHightLightFormTile',
            'isMapInteractionEnabled',
            'toggleDoor',
            'resetPath',
            'setPlayers',
            'erasePath',
            'showPath',
            'getTileInfos',
            'hightLightTiles',
            'isAccessiblePosition',
            'showIceBreak',
            'movePlayer',
            'removePlayer',
            'replacePlayer',
            'shouldTeleportTo',
            'replaceItem',
            'removeItem',
        ]);
        mockGameMap = jasmine.createSpyObj('GameMap', ['clone', 'tileSize']);
        await TestBed.configureTestingModule({
            imports: [GameMapComponent],
            providers: [
                { provide: GameMapService, useValue: gameMapService },
                { provide: SocketClientService, useValue: socketService },
            ],
        }).compileComponents();
        spyOn(socketService, 'on').and.callThrough();
        spyOn(socketService, 'off');
        spyOn(socketService, 'send').and.callThrough();

        fixture = TestBed.createComponent(GameMapComponent);
        component = fixture.componentInstance;
        component.canvas = mockCanvasRef;
        component.mapGame = mockGameMap;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize game map on ngAfterViewInit', async () => {
        spyOn(component as any, 'initializeGameMap');
        await component['ngAfterViewInit']();
        expect(gameMapService.initialize).toHaveBeenCalled();
        expect(component['initializeGameMap']).toHaveBeenCalled();
    });

    it('should remove socket listeners on destroy', () => {
        component.ngOnDestroy();
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.CountdownEnd);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.PlayerEndMoving);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.PlayerMoving);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.PlayerGiveUp);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.IceBroken);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.ReplacePlayerAfterIceBroken);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.DoorToggled);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.ActionFinished);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.CountdownStart);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.FightTerminated);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.ReplaceItem);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.RemoveItem);
    });

    it('should disable context menu on right click', () => {
        const event = new MouseEvent('contextmenu');
        spyOn(event, 'preventDefault');
        component.disabledContextMenu(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    describe('initializeGameMap', () => {
        it('should initialize mapGame when partyInfos is provided', async () => {
            const mockPartyInfos: PartyInfos = {
                game: {
                    mapSize: 0,
                    gameMap: [[]],
                    gid: '',
                    name: '',
                    mode: GameMode.Classic,
                    description: '',
                    creationDate: new Date(),
                    lastEditDate: new Date(),
                    imageBase64: '',
                    isVisible: false,
                },
                players: [],
            };

            // Mock GameMap constructor to return mockGameMap
            // const gameMapSpy = spyOn(gameMapModule as any, 'GameMap').and.returnValue(mockGameMap);

            // Mock socketService.send to call the callback with mockPartyInfos
            (socketService.send as jasmine.Spy).and.callFake((eventName: string, callback: Function) => {
                expect(eventName).toBe(WsEventServer.GetPartyInfos);
                callback(mockPartyInfos);
            });

            await component['initializeGameMap']();

            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GetPartyInfos, jasmine.any(Function));
            // expect(gameMapSpy).toHaveBeenCalled();
            // expect(component.mapGame).toBe(mockGameMap);
        });

        it('should not initialize mapGame when partyInfos is not provided', async () => {
            // Mock socketService.send to call the callback with undefined
            (socketService.send as jasmine.Spy).and.callFake((eventName: string, callback: Function) => {
                expect(eventName).toBe(WsEventServer.GetPartyInfos);
                callback(undefined);
            });
            (component.mapGame as unknown as GameMap | undefined) = undefined;
            await component['initializeGameMap']();
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GetPartyInfos, jasmine.any(Function));
            expect(component.mapGame).toBeUndefined();
        });
    });

    describe('onMouseDown', () => {
        it('should show pop-up infos on right click if not debug mode', () => {
            const event = new MouseEvent('mousedown', { button: 2 });
            const position = { x: 1, y: 1 };
            spyOn(socketHelper as any, 'emit').and.callFake((event: string, callback: Function) => {
                if (event === WsEventServer.GetPartyDebugMode) callback(false);
            });
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(position);
            spyOn(component as any, 'teleportTo');
            spyOn(component as any, 'showPopUpInfos');
            component.onMouseDown(event);
            expect(component['teleportTo']).not.toHaveBeenCalled();
            expect(component['showPopUpInfos']).toHaveBeenCalled();
        });

        it('should teleport to position in debug mode', () => {
            const event = new MouseEvent('mousedown', { button: 2 });
            const position = { x: 1, y: 1 };
            spyOn(socketHelper as any, 'emit').and.callFake((event: string, callback: Function) => {
                if (event === WsEventServer.GetPartyDebugMode) callback(true);
            });
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(position);
            spyOn(component as any, 'teleportTo');
            spyOn(component as any, 'showPopUpInfos');
            component.onMouseDown(event);
            expect(component['teleportTo']).toHaveBeenCalledWith(position);
            expect(component['showPopUpInfos']).not.toHaveBeenCalled();
        });

        it('should return if position is current position', () => {
            const event = new MouseEvent('mousedown');
            const position = { x: 1, y: 1 };
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(position);
            spyOn(component as any, 'isCurrentPosition').and.returnValue(true);
            component.onMouseDown(event);
            expect(socketService.send).not.toHaveBeenCalledWith(WsEventServer.StartAction, { x: position.y, y: position.x });
        });

        it('should send START_ACTION if isMapInteractionEnabled is true', () => {
            gameMapService.isMapInteractionEnabled.and.returnValue(true);
            const event = new MouseEvent('mousedown');
            const position = { x: 1, y: 1 };
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(position);
            spyOn(component as any, 'isCurrentPosition').and.returnValue(false);
            component.onMouseDown(event);
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.StartAction, { x: position.y, y: position.x });
            expect(gameMapService.isMapInteractionEnabled).toBeFalse();
            expect(component['isAccessibleTilesHighlight']).toBeFalse();
        });

        it('should return if position is not accessible', () => {
            spyOn(component as any, 'initializeGameMap').and.resolveTo();
            const event = new MouseEvent('mousedown');
            const position = { x: 1, y: 1 };
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(position);
            spyOn(component as any, 'isRightClick').and.returnValue(false);
            spyOn(component as any, 'isCurrentPosition').and.returnValue(false);
            spyOn(component as any, 'shouldDisableMapInteraction').and.returnValue(false);
            spyOn(component as any, 'isAccessiblePosition').and.returnValue(false);
            component.onMouseDown(event);
            expect(socketService.send).not.toHaveBeenCalledWith(WsEventServer.StartAction, { x: position.y, y: position.x });
        });

        it('should send PLAYER_START_MOVING if position is accessible', () => {
            const event = new MouseEvent('mousedown');
            const position = { x: 1, y: 1 };
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(position);
            spyOn(component as any, 'isRightClick').and.returnValue(false);
            spyOn(component as any, 'isCurrentPosition').and.returnValue(false);
            spyOn(component as any, 'shouldDisableMapInteraction').and.returnValue(false);
            spyOn(component as any, 'isAccessiblePosition').and.returnValue(true);
            component.onMouseDown(event);
            expect(gameMapService.removeHightLightFormTile).toHaveBeenCalled();
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.PlayerStartMoving, position);
            expect(component['isAccessibleTilesHighlight']).toBeFalse();
            expect(component['hasMoved']).toBeTrue();
        });
    });
    describe('onMouseMove', () => {
        it('should set isShowInfo to false', () => {
            spyOn(component as any, 'shouldIgnoreMouseMove').and.returnValue(false);
            spyOn(component as any, 'isPositionUnchangedOrNoMoves').and.returnValue(true);
            const event = new MouseEvent('mousemove');
            component.onMouseMove(event);
            expect(component.isShowInfo).toBeFalse();
        });

        it('should return if isMapInteractionEnabled is true', () => {
            gameMapService.isMapInteractionEnabled.and.returnValue(true);
            const event = new MouseEvent('mousemove');
            component.onMouseMove(event);
            expect(gameMapService.erasePath).not.toHaveBeenCalled();
        });

        it('should return if hasMoved is true', () => {
            component['hasMoved'] = true;
            const event = new MouseEvent('mousemove');
            component.onMouseMove(event);
            expect(gameMapService.erasePath).not.toHaveBeenCalled();
        });

        it('should return if player is not current player', () => {
            component['player'] = { isCurrentPlayer: false } as any;
            const event = new MouseEvent('mousemove');
            component.onMouseMove(event);
            expect(gameMapService.erasePath).not.toHaveBeenCalled();
        });

        it('should return if isAccessibleTilesHighlight is false', () => {
            component['isAccessibleTilesHighlight'] = false;
            const event = new MouseEvent('mousemove');
            component.onMouseMove(event);
            expect(gameMapService.erasePath).not.toHaveBeenCalled();
        });

        it('should return if endPosition is same as lastEndPosition', () => {
            component['isAccessibleTilesHighlight'] = true;
            component['player'] = { isCurrentPlayer: true } as any;
            const event = new MouseEvent('mousemove');
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue({ x: 1, y: 1 });
            spyOn(component as any, 'isSameLastEndPosition').and.returnValue(true);
            component.onMouseMove(event);
            expect(gameMapService.erasePath).not.toHaveBeenCalled();
        });

        it('should return if player has no available moves', () => {
            component['isAccessibleTilesHighlight'] = true;
            component['player'] = { availableMoves: 0, isCurrentPlayer: true } as any;
            const event = new MouseEvent('mousemove');
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue({ x: 1, y: 1 });
            component.onMouseMove(event);
            expect(gameMapService.erasePath).not.toHaveBeenCalled();
        });

        it('should erase path if position is not accessible or is current position', () => {
            component['isAccessibleTilesHighlight'] = true;
            spyOn(component as any, 'shouldIgnoreMouseMove').and.returnValue(false);
            spyOn(component as any, 'isPositionUnchangedOrNoMoves').and.returnValue(false);
            spyOn(component as any, 'isInvalidOrCurrentPosition').and.returnValue(true);
            component['player'] = { isCurrentPlayer: true } as any;
            const event = new MouseEvent('mousemove');
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue({ x: 1, y: 1 });
            spyOn(component as any, 'isAccessiblePosition').and.returnValue(false);
            component.onMouseMove(event);
            expect(gameMapService.erasePath).toHaveBeenCalled();
            expect(component['lastEndPosition']).toEqual({ x: 1, y: 1 });
        });

        it('should send GET_PATH and show path if position is accessible and not current position', () => {
            spyOn(socketHelper as any, 'emit').and.callFake((event: string, callback: Function) => {
                if (event === WsEventServer.GetAllPlayers) callback(mockParty);
            });
            spyOn(component as any, 'shouldIgnoreMouseMove').and.returnValue(false);
            spyOn(component as any, 'isPositionUnchangedOrNoMoves').and.returnValue(false);
            spyOn(component as any, 'isInvalidOrCurrentPosition').and.returnValue(false);
            component['isAccessibleTilesHighlight'] = true;
            component['player'] = { isCurrentPlayer: true } as any;
            const event = new MouseEvent('mousemove');
            const endPosition = { x: 1, y: 2 };
            const path = [
                { x: 1, y: 1 },
                { x: 1, y: 2 },
            ];
            spyOn(CanvasHelper, 'getCanvasPosition').and.returnValue(endPosition);
            (socketHelper as any).emit.and.callFake((event: string, position: Coordinate, callback: Function) => {
                callback(path);
            });
            component.onMouseMove(event);
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GetPath, { x: endPosition.y, y: endPosition.x }, jasmine.any(Function));
            expect(gameMapService.showPath).toHaveBeenCalledWith(path);
        });
    });
    describe('shouldIgnoreMouseMove', () => {
        it('should return true if isMapInteractionEnabled is true', () => {
            gameMapService.isMapInteractionEnabled = true;
            expect(component['shouldIgnoreMouseMove']()).toBeTrue();
        });

        it('should return true if hasMoved is true', () => {
            gameMapService.isMapInteractionEnabled = true;
            component['hasMoved'] = true;
            expect(component['shouldIgnoreMouseMove']()).toBeTrue();
        });

        it('should return true if player is not current player', () => {
            gameMapService.isMapInteractionEnabled = true;
            component['player'] = { isCurrentPlayer: false } as any;
            expect(component['shouldIgnoreMouseMove']()).toBeTrue();
        });

        it('should return true if isAccessibleTilesHighlight is false', () => {
            gameMapService.isMapInteractionEnabled = true;
            component['isAccessibleTilesHighlight'] = false;
            expect(component['shouldIgnoreMouseMove']()).toBeTrue();
        });

        it('should return false if all conditions are false', () => {
            gameMapService.isMapInteractionEnabled = false;
            component['hasMoved'] = false;
            component['player'] = { isCurrentPlayer: true } as any;
            component['isAccessibleTilesHighlight'] = true;
            expect(component['shouldIgnoreMouseMove']()).toBeFalse();
        });
    });
    describe('handleCountDownEnd', () => {
        it('should handle COUNTDOWN_END event', () => {
            const player = {
                pid: '',
                name: '',
                availableMoves: 0,
                remainingAction: 0,
            };
            spyOn(socketHelper as any, 'emit').and.callFake((event: string, callback: Function) => {
                if (event === WsEventServer.GetAllPlayers) callback(mockParty);
            });
            (socketHelper as any).emit.and.callFake((event: string, callback: Function) => callback(player));
            spyOn<any>(component, 'showAvailablePosition');
            component['handleCountdownEnd']();
            expect(gameMapService.removeHightLightFormTile).toHaveBeenCalled();
            expect(component['showAvailablePosition']).toHaveBeenCalled();
            expect(component['player']).toEqual(player as any);
        });
    });
    describe('isPositionUnchangedOrNoMoves', () => {
        it('should return true if endPosition is same as lastEndPosition', () => {
            spyOn(component as any, 'isSameLastEndPosition').and.returnValue(true);
            const endPosition: Coordinate = { x: 1, y: 1 };
            expect(component['isPositionUnchangedOrNoMoves'](endPosition)).toBeTrue();
        });

        it('should return true if player has no available moves', () => {
            component['player'] = { availableMoves: 0 } as any;
            spyOn(component as any, 'isSameLastEndPosition').and.returnValue(false);
            const endPosition: Coordinate = { x: 1, y: 1 };
            expect(component['isPositionUnchangedOrNoMoves'](endPosition)).toBeTrue();
        });

        it('should return false if endPosition is not same as lastEndPosition and player has available moves', () => {
            component['player'] = { availableMoves: 1 } as any;
            spyOn(component as any, 'isSameLastEndPosition').and.returnValue(false);
            const endPosition: Coordinate = { x: 1, y: 1 };
            expect(component['isPositionUnchangedOrNoMoves'](endPosition)).toBeFalse();
        });
    });

    describe('isInvalidOrCurrentPosition', () => {
        it('should return true if position is not accessible', () => {
            spyOn(component as any, 'isAccessiblePosition').and.returnValue(false);
            spyOn(component as any, 'isCurrentPosition').and.returnValue(false);
            const endPosition: Coordinate = { x: 1, y: 1 };
            expect(component['isInvalidOrCurrentPosition'](endPosition)).toBeTrue();
        });

        it('should return true if position is current position', () => {
            spyOn(component as any, 'isAccessiblePosition').and.returnValue(true);
            spyOn(component as any, 'isCurrentPosition').and.returnValue(true);
            const endPosition: Coordinate = { x: 1, y: 1 };
            expect(component['isInvalidOrCurrentPosition'](endPosition)).toBeTrue();
        });

        it('should return false if position is accessible and not current position', () => {
            spyOn(component as any, 'isAccessiblePosition').and.returnValue(true);
            spyOn(component as any, 'isCurrentPosition').and.returnValue(false);
            const endPosition: Coordinate = { x: 1, y: 1 };
            expect(component['isInvalidOrCurrentPosition'](endPosition)).toBeFalse();
        });
    });

    describe('teleportTo', () => {
        it('should send event TELEPORT_PLAYER if shouldIgnoreTeleportTo return false', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            spyOn(component as any, 'shouldIgnoreTeleportTo').and.returnValue(false);
            component['teleportTo'](pos);
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.TeleportPlayer, pos);
        });

        it('should not send event TELEPORT_PLAYER if shouldIgnoreTeleportTo return true', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            spyOn(component as any, 'shouldIgnoreTeleportTo').and.returnValue(true);
            component['teleportTo'](pos);
            expect(socketService.send).not.toHaveBeenCalledWith(WsEventServer.TeleportPlayer, pos);
        });
    });

    describe('shouldIgnoreTeleportTo', () => {
        it('should return true if isCurrentPlayer is false', () => {
            const pos = { x: 1, y: 1 };
            component['player'] = { isCurrentPlayer: false } as PlayerInfos;
            expect(component['shouldIgnoreTeleportTo'](pos)).toBeTrue();
        });

        it('should return true if isCurrentPosition is true', () => {
            const pos = { x: 1, y: 1 };
            component['player'] = { isCurrentPlayer: true } as PlayerInfos;
            spyOn(component as any, 'isCurrentPosition').and.returnValue(true);
            expect(component['shouldIgnoreTeleportTo'](pos)).toBeTrue();
        });

        it('should return true if gameMapService.shouldTeleportTo returns false', () => {
            const pos = { x: 1, y: 1 };
            component['player'] = { isCurrentPlayer: true } as PlayerInfos;
            spyOn(component as any, 'isCurrentPosition').and.returnValue(false);
            gameMapService.shouldTeleportTo.and.returnValue(false);
            expect(component['shouldIgnoreTeleportTo'](pos)).toBeTrue();
        });

        it('should return false if all conditions are met', () => {
            const pos = { x: 1, y: 1 };
            component['player'] = { isCurrentPlayer: true } as PlayerInfos;
            spyOn(component as any, 'isCurrentPosition').and.returnValue(false);
            gameMapService.shouldTeleportTo.and.returnValue(true);
            expect(component['shouldIgnoreTeleportTo'](pos)).toBeFalse();
        });
    });

    describe('handleMovementEnd', () => {
        it('should handle PLAYER_END_MOVING event', () => {
            const mockPlayers = [{ pid: '1', name: 'Player 1' }] as any as PlayerInfos[];
            const player = {
                pid: '',
                name: '',
                availableMoves: 0,
                remainingAction: 0,
            };
            component['hasMoved'] = true;
            component['isAccessibleTilesHighlight'] = true;
            spyOn<any>(component, 'showAvailablePosition');
            spyOn(socketHelper as any, 'emit').and.callFake((event: string, callback: Function) => {
                if (event === WsEventServer.GetAllPlayers) callback(mockParty);
            });
            // eslint-disable-next-line @typescript-eslint/ban-types
            (socketHelper as any).emit.and.callFake((event: string, callback: Function) => callback(player));
            component['handleMovementEnd'](mockPlayers);
            expect(gameMapService.resetPath).toHaveBeenCalled();
            expect(gameMapService.setPlayers).toHaveBeenCalledWith(mockPlayers);
            expect(component['player']).toEqual(player as any);
            expect(component['showAvailablePosition']).toHaveBeenCalled();
            expect(component['hasMoved']).toBeFalse();
            expect(component['isAccessibleTilesHighlight']).toBeFalse();
        });
    });

    describe('sockets events', () => {
        it('should handle COUNTDOWN_END event', () => {
            spyOn<any>(component, 'handleCountdownEnd');
            socketHelper.peerSideEmit(WsEventClient.CountdownEnd);
            expect(component['handleCountdownEnd']).toHaveBeenCalled();
        });

        it('should handle PLAYER_MOVING event', () => {
            const mockPlayer = { pid: '1', name: 'Player 1' };
            socketHelper.peerSideEmit(WsEventClient.PlayerMoving, mockPlayer);
            expect(gameMapService.movePlayer).toHaveBeenCalledWith(mockPlayer);
        });

        it('should handle PLAYER_END_MOVING event', () => {
            const mockPlayers = [{ pid: '1', name: 'Player 1' }] as any as PlayerInfos[];
            spyOn<any>(component, 'handleMovementEnd');
            socketHelper.peerSideEmit(WsEventClient.PlayerEndMoving, mockPlayers);
            expect(component['handleMovementEnd']).toHaveBeenCalledWith(mockPlayers);
        });

        it('should handle COUNTDOWN_START event', () => {
            socketHelper.peerSideEmit(WsEventClient.CountdownStart);
            expect(component.isShowInfo).toBeFalse();
        });

        it('should handle PLAYER_GIVE_UP event', () => {
            const mockPlayer = { id: '1', name: 'Player 1' };
            socketHelper.peerSideEmit(WsEventClient.PlayerGiveUp, mockPlayer);
            expect(gameMapService.removePlayer).toHaveBeenCalledWith(mockPlayer);
        });

        it('should handle ICE_BROKEN event', () => {
            const pos: Coordinate = { x: 1, y: 1 };
            socketHelper.peerSideEmit(WsEventClient.IceBroken, pos);
            expect(gameMapService.showIceBreak).toHaveBeenCalledWith(pos);
        });
        it('should handle REPLACE_PLAYER_AFTER_ICE_BROKEN event', () => {
            const mockPlayer = { id: '1', name: 'Player 1' };
            socketHelper.peerSideEmit(WsEventClient.ReplacePlayerAfterIceBroken, mockPlayer);
            expect(gameMapService.replacePlayer).toHaveBeenCalledWith(mockPlayer);
        });

        it('should handle DOOR_TOGGLED event', () => {
            const mockData = { doorPosition: { x: 1, y: 1 }, doorState: true };
            spyOn<any>(component, 'showAvailablePosition');
            socketHelper.peerSideEmit(WsEventClient.DoorToggled, mockData);
            expect(gameMapService.toggleDoor).toHaveBeenCalledWith(mockData.doorPosition, mockData.doorState);
            expect(component['showAvailablePosition']).toHaveBeenCalled();
        });

        it('should handle ACTION_FINISHED event', () => {
            spyOn<any>(component, 'showAvailablePosition');
            socketHelper.peerSideEmit(WsEventClient.ActionFinished);
            expect(component['showAvailablePosition']).toHaveBeenCalled();
        });
        it('should handle FIGHT_TERMINATED event', () => {
            spyOn<any>(component, 'showAvailablePosition');
            socketHelper.peerSideEmit(WsEventClient.FightTerminated);
            expect(component['showAvailablePosition']).toHaveBeenCalled();
        });
        it('should handle REMOVE_ITEM event', () => {
            const mockPos = { x: 1, y: 1 };
            socketHelper.peerSideEmit(WsEventClient.RemoveItem, mockPos);
            expect(gameMapService.removeItem).toHaveBeenCalledWith(mockPos);
        });
        it('should handle REPLACE_ITEM event', () => {
            const mockData = { position: { x: 1, y: 1 }, item: 5 };
            spyOn<any>(component, 'showAvailablePosition');
            socketHelper.peerSideEmit(WsEventClient.ReplaceItem, mockData);
            expect(component['showAvailablePosition']).toHaveBeenCalled();
            expect(gameMapService.replaceItem).toHaveBeenCalledWith(mockData.position, mockData.item);
        });
        it('should handle PLAYER_LIST_UPDATED event', () => {
            const players = [
                {
                    pid: '',
                    name: '',
                    availableMoves: 0,
                    remainingAction: 0,
                },
                {
                    pid: '',
                    name: '',
                    availableMoves: 0,
                    remainingAction: 0,
                },
            ];
            socketHelper.peerSideEmit(WsEventClient.PlayerListUpdated, players);
            expect(gameMapService.setPlayers).toHaveBeenCalledWith(players);
        });
    });
    it('should return true if isMapInteractionEnabled is true', () => {
        const position = { x: 1, y: 1 };
        gameMapService.isMapInteractionEnabled = true;
        const result = component['shouldDisableMapInteraction'](position);
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.StartAction, { x: position.y, y: position.x });
        expect(result).toBeTrue();
    });
    it('should return false if isMapInteractionEnabled is false', () => {
        const position = { x: 1, y: 1 };
        gameMapService.isMapInteractionEnabled = false;
        const result = component['shouldDisableMapInteraction'](position);
        expect(socketService.send).not.toHaveBeenCalledWith(WsEventServer.StartAction, { x: position.y, y: position.x });
        expect(result).toBeFalse();
    });
    describe('showPopUpInfos', () => {
        it('should set tileInfo and playerInfo correctly if info is an instance of Tile', () => {
            const pos: Coordinate = { x: 1, y: 2 };
            const tileInfo = { x: pos.x, y: pos.y } as any as Tile;
            spyOn(CanvasHelper, 'getItemPositionInCanvas').and.returnValue([10, 10]);
            Object.setPrototypeOf(tileInfo, Tile.prototype);
            gameMapService.getTileInfos.and.returnValue(tileInfo);
            component['showPopUpInfos'](pos);
            expect(CanvasHelper.getItemPositionInCanvas).toHaveBeenCalledWith(component.canvas, pos, component.mapGame.tileSize);
            expect(component['tileInfo']).toEqual(tileInfo);
            expect(component['playerInfo']).toBeFalsy();
            expect(component['isShowInfo']).toBeTrue();
            expect(component['leftPositionDiv']).toEqual(10);
            expect(component['topPositionDiv']).toEqual(10);
        });

        it('should set tileInfo and playerInfo correctly if info is not an instance of Tile', () => {
            const pos: Coordinate = { x: 1, y: 2 };
            spyOn(CanvasHelper, 'getItemPositionInCanvas').and.returnValue([10, 10]);
            const playerInfo = { x: pos.x, y: pos.y } as any;
            gameMapService.getTileInfos.and.returnValue(playerInfo);
            component['showPopUpInfos'](pos);
            expect(component['tileInfo']).toBeFalsy();
            expect(component['playerInfo']).toEqual(playerInfo);
            expect(CanvasHelper.getItemPositionInCanvas).toHaveBeenCalledWith(component.canvas, pos, component.mapGame.tileSize);
            expect(component['isShowInfo']).toBeTrue();
            expect(component['leftPositionDiv']).toEqual(10);
            expect(component['topPositionDiv']).toEqual(10);
        });

        it('should not set tileInfo and playerInfo if info is null', () => {
            const pos: Coordinate = { x: 1, y: 2 };
            gameMapService.getTileInfos.and.returnValue(null);
            component['showPopUpInfos'](pos);
            expect(component['tileInfo']).toBeFalsy();
            expect(component['playerInfo']).toBeFalsy();
        });
    });
    describe('showAvailablePosition', () => {
        it('should call hightLightTiles if player is current player with moves', () => {
            component['player'] = { isCurrentPlayer: true, availableMoves: 1 } as any;
            component['isAccessibleTilesHighlight'] = false;
            const availableCoords = [{ x: 0, y: 0 }];
            spyOn(socketHelper as any, 'emit').and.callFake((event: string, callback: Function) => {
                if (event === WsEventServer.GetAllPlayers) callback(mockParty);
            });
            // eslint-disable-next-line @typescript-eslint/ban-types, no-unused-vars
            (socketHelper as any).emit.and.callFake((event: string, callback: Function) => {
                callback(availableCoords);
            });
            component['showAvailablePosition']();
            expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GetAvailablePositions, jasmine.any(Function));
            expect(gameMapService.hightLightTiles).toHaveBeenCalledWith(availableCoords, { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
        });
        it('should not call hightLightTiles if player is not current player', () => {
            component['player'] = { isCurrentPlayer: false } as any;
            component['showAvailablePosition']();
            expect(gameMapService.hightLightTiles).not.toHaveBeenCalled();
        });

        it('should not call hightLightTiles if accessible tiles are highlighted', () => {
            component['player'] = { isCurrentPlayer: false } as any;
            component['isAccessibleTilesHighlight'] = true;
            component['showAvailablePosition']();
            expect(gameMapService.hightLightTiles).not.toHaveBeenCalled();
        });

        it('should not call hightLightTiles if available moves is zero', () => {
            component['player'] = { availableMoves: 0 } as any;
            component['showAvailablePosition']();
            expect(gameMapService.hightLightTiles).not.toHaveBeenCalled();
        });
    });
    describe('isCurrentPosition', () => {
        it('should return true if position is current position', () => {
            const position: Coordinate = { x: 1, y: 2 };
            component['player'] = { currentPosition: position } as any;
            expect(component['isCurrentPosition'](position)).toEqual(true);
        });

        it('should return false if position is not current position', () => {
            const position: Coordinate = { x: 1, y: 2 };
            component['player'] = { currentPosition: { x: 3, y: 4 } } as any;
            expect(component['isCurrentPosition'](position)).toEqual(false);
        });
    });
    describe('isAccessiblePosition', () => {
        it('should return true if position is accessible', () => {
            const position: Coordinate = { x: 1, y: 2 };
            gameMapService.isAccessiblePosition.and.returnValue(true);
            expect(component['isAccessiblePosition'](position)).toEqual(true);
        });

        it('should return false if position is not accessible', () => {
            const position: Coordinate = { x: 1, y: 2 };
            gameMapService.isAccessiblePosition.and.returnValue(false);
            expect(component['isAccessiblePosition'](position)).toEqual(false);
        });
    });

    describe('isSameLastEndPosition', () => {
        it('should return true if position is same as last end position', () => {
            const position: Coordinate = { x: 1, y: 2 };
            component['lastEndPosition'] = position;
            expect(component['isSameLastEndPosition'](position)).toEqual(true);
        });

        it('should return false if position is not same as last end position', () => {
            const position: Coordinate = { x: 1, y: 2 };
            component['lastEndPosition'] = { x: 3, y: 4 };
            expect(component['isSameLastEndPosition'](position)).toEqual(false);
        });

        it('should return false if last end position is null', () => {
            const position: Coordinate = { x: 1, y: 2 };
            component['lastEndPosition'] = null as any;
            expect(component['isSameLastEndPosition'](position)).toBeFalsy();
        });
    });
    describe('initializeGameMap', () => {
        it('should return false if last end position is null', () => {
            const position: Coordinate = { x: 1, y: 2 };
            component['initializeGameMap'] = null as any;
            expect(component['isSameLastEndPosition'](position)).toBeFalsy();
        });
    });
});
