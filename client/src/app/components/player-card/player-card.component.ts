import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { Item } from '@app/classes/item/item';
import { ItemFactory } from '@app/classes/item-factory/item-factory';
import { ItemType } from '@common/enums/item';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'app-player-card',
    standalone: true,
    imports: [CommonModule, MatTooltip],
    templateUrl: './player-card.component.html',
    styleUrl: './player-card.component.scss',
})
export class PlayerCardComponent implements OnDestroy {
    player: PlayerInfos;
    isPlayerInitialized: boolean;
    items: (Item | null)[];

    constructor(private socketClientService: SocketClientService) {
        this.items = [];
        this.isPlayerInitialized = false;
        this.getPlayer();
        this.configureSocketEvents();
    }

    ngOnDestroy(): void {
        this.socketClientService.off(WsEventClient.PlayerMoving);
        this.socketClientService.off(WsEventClient.PlayerEndMoving);
        this.socketClientService.off(WsEventClient.CountdownStart);
        this.socketClientService.off(WsEventClient.AvailableMoveUpdated);
        this.socketClientService.off(WsEventClient.DoorToggled);
        this.socketClientService.off(WsEventClient.FightTerminated);
        this.socketClientService.off(WsEventClient.UpdateItem);
    }

    getPlayer(): void {
        this.socketClientService.send(WsEventServer.GetPlayer, (player: PlayerInfos) => {
            if (player) {
                this.player = player;
                if (!this.isPlayerInitialized) this.isPlayerInitialized = true;
                this.setItems(player.items);
            }
        });
    }
    setItems(items: ItemType[]): void {
        this.items = items.map((item) => ItemFactory.createItem(item));
    }

    private configureSocketEvents(): void {
        this.socketClientService.on(WsEventClient.PlayerMoving, () => this.getPlayer());
        this.socketClientService.on(WsEventClient.PlayerEndMoving, () => this.getPlayer());
        this.socketClientService.on(WsEventClient.CountdownStart, () => this.getPlayer());
        this.socketClientService.on(WsEventClient.AvailableMoveUpdated, () => this.getPlayer());
        this.socketClientService.on(WsEventClient.DoorToggled, () => this.getPlayer());
        this.socketClientService.on(WsEventClient.FightTerminated, () => this.getPlayer());
        this.socketClientService.on(WsEventClient.UpdateItem, () => this.getPlayer());
    }
}
