import { NgStyle } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { CanvasHelper } from '@app/classes/canvas-helper/canvas-helper';
import { GameMap } from '@app/classes/game-map/game-map';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { ResponseToggleDoor } from '@common/interfaces/toggle-door-response';
import { Coordinate } from '@common/interfaces/coordinate';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { Tile } from '@app/classes/tile/tile';
import { MAP_HEIGHT, MAP_WIDTH, MAX_COLOR_VALUE, RIGHT_CLICK } from '@app/constants/consts';
import { PartyInfos } from '@common/interfaces/party';
import { ItemType } from '@common/enums/item';

@Component({
    selector: 'app-game-map',
    standalone: true,
    imports: [NgStyle],
    templateUrl: './game-map.component.html',
    styleUrl: './game-map.component.scss',
})
export class GameMapComponent implements AfterViewInit, OnDestroy {
    @Input() mapGame: GameMap;
    @ViewChild('map') canvas: ElementRef<HTMLCanvasElement>;
    isShowInfo: boolean;
    leftPositionDiv: number;
    topPositionDiv: number;
    tileInfo: Tile | null;
    playerInfo: PlayerInfos | null;
    private player: PlayerInfos;
    private isAccessibleTilesHighlight: boolean;
    private lastEndPosition: Coordinate;
    private hasMoved: boolean;

    constructor(
        private socketClientService: SocketClientService,
        private gameMapService: GameMapService,
    ) {
        this.isShowInfo = false;
        this.isAccessibleTilesHighlight = false;
        this.hasMoved = false;
        this.configureSocketEvents();
    }

    get isMapInteractionEnabled() {
        return this.gameMapService.isMapInteractionEnabled;
    }

    get isCurrentPlayer() {
        return this.player && this.player.isCurrentPlayer;
    }

    async ngAfterViewInit() {
        await this.initializeGameMap();
        this.gameMapService.initialize(this.mapGame, this.canvas);
    }

    ngOnDestroy(): void {
        this.socketClientService.off(WsEventClient.CountdownEnd);
        this.socketClientService.off(WsEventClient.PlayerEndMoving);
        this.socketClientService.off(WsEventClient.PlayerMoving);
        this.socketClientService.off(WsEventClient.PlayerGiveUp);
        this.socketClientService.off(WsEventClient.IceBroken);
        this.socketClientService.off(WsEventClient.ReplacePlayerAfterIceBroken);
        this.socketClientService.off(WsEventClient.DoorToggled);
        this.socketClientService.off(WsEventClient.ActionFinished);
        this.socketClientService.off(WsEventClient.CountdownStart);
        this.socketClientService.off(WsEventClient.FightTerminated);
        this.socketClientService.off(WsEventClient.RemoveItem);
        this.socketClientService.off(WsEventClient.ReplaceItem);
    }

    disabledContextMenu(event: MouseEvent) {
        event.preventDefault();
    }

    onMouseMove(event: MouseEvent): void {
        this.isShowInfo = false;
        if (this.shouldIgnoreMouseMove()) return;
        const endPosition = this.getEndPosition(event);
        if (this.isPositionUnchangedOrNoMoves(endPosition)) return;
        if (this.isInvalidOrCurrentPosition(endPosition)) return this.handleInvalidPosition(endPosition);
        this.updatePath(endPosition);
    }

    onMouseDown(event: MouseEvent): void {
        this.disabledContextMenu(event);
        const position: Coordinate = CanvasHelper.getCanvasPosition(event, this.canvas, this.mapGame.tileSize);
        if (this.isRightClick(event)) {
            this.socketClientService.send(WsEventServer.GetPartyDebugMode, (isDebugMode: boolean) => {
                if (isDebugMode) {
                    this.teleportTo(position);
                    return;
                }
                this.showPopUpInfos(position);
            });
            return;
        }
        if (this.isCurrentPosition(position) || this.shouldDisableMapInteraction(position)) return;
        if (this.isAccessiblePosition({ x: position.y, y: position.x })) this.handlePlayerMovement(position);
    }

    private async initializeGameMap(): Promise<void> {
        return new Promise((resolve) => {
            this.socketClientService.send(WsEventServer.GetPartyInfos, (partyInfos: PartyInfos) => {
                if (partyInfos) {
                    this.mapGame = new GameMap(partyInfos.game.mapSize, MAP_WIDTH, MAP_HEIGHT, partyInfos.game.gameMap, partyInfos.players);
                }
                resolve();
            });
        });
    }
    private isRightClick(event: MouseEvent): boolean {
        return event.button === RIGHT_CLICK;
    }
    private shouldDisableMapInteraction(position: Coordinate): boolean {
        if (!this.isMapInteractionEnabled) return false;
        this.socketClientService.send(WsEventServer.StartAction, { x: position.y, y: position.x });
        this.gameMapService.isMapInteractionEnabled = false;
        this.isAccessibleTilesHighlight = false;
        return true;
    }

    private handlePlayerMovement(position: Coordinate): void {
        this.gameMapService.removeHightLightFormTile();
        this.socketClientService.send(WsEventServer.PlayerStartMoving, { x: position.y, y: position.x });
        this.isAccessibleTilesHighlight = false;
        this.hasMoved = true;
    }

    private configureSocketEvents() {
        this.configurePlayerMovementEvents();
        this.socketClientService.on(WsEventClient.CountdownEnd, () => this.handleCountdownEnd());
        this.socketClientService.on(WsEventClient.CountdownStart, () => (this.isShowInfo = false));
        this.socketClientService.on(WsEventClient.PlayerGiveUp, (player: PlayerInfos) => this.gameMapService.removePlayer(player));
        this.socketClientService.on(WsEventClient.DoorToggled, (data: ResponseToggleDoor) => {
            this.gameMapService.toggleDoor(data.doorPosition, data.doorState);
            this.showAvailablePosition();
        });
        this.socketClientService.on(WsEventClient.RemoveItem, (pos: Coordinate) => this.gameMapService.removeItem(pos));
        this.socketClientService.on(WsEventClient.ReplaceItem, (data: { position: Coordinate; item: ItemType }) => {
            this.gameMapService.replaceItem(data.position, data.item);
            this.isAccessibleTilesHighlight = false;
            this.showAvailablePosition();
        });
        this.socketClientService.on(WsEventClient.ActionFinished, () => this.showAvailablePosition());
        this.socketClientService.on(WsEventClient.FightTerminated, () => this.showAvailablePosition());
        this.socketClientService.on<PlayerInfos[]>(WsEventClient.PlayerListUpdated, (players: PlayerInfos[]) =>
            this.gameMapService.setPlayers(players),
        );
    }
    private configurePlayerMovementEvents() {
        this.socketClientService.on(WsEventClient.PlayerMoving, (player: PlayerInfos) => this.gameMapService.movePlayer(player));
        this.socketClientService.on(WsEventClient.PlayerEndMoving, (newPlayers: PlayerInfos[]) => this.handleMovementEnd(newPlayers));
        this.socketClientService.on(WsEventClient.IceBroken, (pos: Coordinate) => this.gameMapService.showIceBreak(pos));
        this.socketClientService.on(WsEventClient.ReplacePlayerAfterIceBroken, (player: PlayerInfos) => this.gameMapService.replacePlayer(player));
    }
    private handleMovementEnd(newPlayers: PlayerInfos[]) {
        this.isAccessibleTilesHighlight = false;
        this.gameMapService.resetPath();
        this.gameMapService.setPlayers(newPlayers);
        this.socketClientService.send(WsEventServer.GetPlayer, (player: PlayerInfos) => {
            if (player) this.player = player;
            this.showAvailablePosition();
        });
        this.hasMoved = false;
    }

    private handleCountdownEnd(): void {
        this.gameMapService.isMapInteractionEnabled = false;
        this.isAccessibleTilesHighlight = false;
        if (this.mapGame) this.gameMapService.removeHightLightFormTile();
        this.socketClientService.send(WsEventServer.GetPlayer, (player: PlayerInfos) => {
            if (player) this.player = player;
            this.showAvailablePosition();
        });
    }

    private shouldIgnoreMouseMove(): boolean {
        return this.isMapInteractionEnabled || this.hasMoved || !this.isCurrentPlayer || !this.isAccessibleTilesHighlight;
    }

    private getEndPosition(event: MouseEvent): Coordinate {
        return CanvasHelper.getCanvasPosition(event, this.canvas, this.mapGame.tileSize);
    }

    private isPositionUnchangedOrNoMoves(endPosition: Coordinate): boolean {
        return this.isSameLastEndPosition(endPosition) || this.player.availableMoves === 0;
    }

    private isInvalidOrCurrentPosition(endPosition: Coordinate): boolean {
        return !this.isAccessiblePosition({ x: endPosition.y, y: endPosition.x }) || this.isCurrentPosition(endPosition);
    }

    private handleInvalidPosition(endPosition: Coordinate): void {
        this.gameMapService.erasePath();
        this.lastEndPosition = endPosition;
    }

    private updatePath(endPosition: Coordinate): void {
        this.socketClientService.send(WsEventServer.GetPath, { x: endPosition.y, y: endPosition.x }, (path: Coordinate[]) => {
            this.gameMapService.showPath(path);
        });
        this.lastEndPosition = endPosition;
    }

    private shouldIgnoreTeleportTo(pos: Coordinate): boolean {
        return !(this.isCurrentPlayer && !this.isCurrentPosition(pos) && this.gameMapService.shouldTeleportTo(pos));
    }

    private teleportTo(pos: Coordinate) {
        if (this.shouldIgnoreTeleportTo(pos)) return;
        this.socketClientService.send(WsEventServer.TeleportPlayer, pos);
    }

    private showPopUpInfos(pos: Coordinate): void {
        const info = this.gameMapService.getTileInfos(pos);
        if (!info) return;
        this.updateInfo(info);
        this.updatePopupPosition(pos);
        this.isShowInfo = true;
    }

    private updateInfo(info: Tile | PlayerInfos): void {
        if (info instanceof Tile) {
            this.tileInfo = info;
            this.playerInfo = null;
        } else {
            this.playerInfo = info;
            this.tileInfo = null;
        }
    }

    private updatePopupPosition(pos: Coordinate): void {
        [this.leftPositionDiv, this.topPositionDiv] = CanvasHelper.getItemPositionInCanvas(this.canvas, pos, this.mapGame.tileSize);
    }

    private showAvailablePosition() {
        if (!this.player.isCurrentPlayer || this.isAccessibleTilesHighlight || this.player.availableMoves === 0) return;
        this.socketClientService.send(WsEventServer.GetAvailablePositions, (accessiblePositions: Coordinate[]) => {
            this.gameMapService.hightLightTiles(accessiblePositions, { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
            this.isAccessibleTilesHighlight = true;
        });
    }

    private isCurrentPosition(position: Coordinate): boolean {
        return this.player.currentPosition?.x === position.x && this.player.currentPosition?.y === position.y;
    }

    private isAccessiblePosition(position: Coordinate): boolean {
        return this.gameMapService.isAccessiblePosition(position);
    }

    private isSameLastEndPosition(position: Coordinate): boolean {
        return this.lastEndPosition && this.lastEndPosition.x === position.x && this.lastEndPosition.y === position.y;
    }
}
