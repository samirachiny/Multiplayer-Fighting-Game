import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { MatIconModule } from '@angular/material/icon';
import { BOT_PROFILES_IMAGES } from '@app/constants/image';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'app-list-player',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatTooltip],
    templateUrl: './list-player.component.html',
    styleUrls: ['./list-player.component.scss'],
})
export class ListPlayerComponent implements OnDestroy {
    @Input() playerId: string;
    players: PlayerInfos[];
    isLoading: boolean;

    constructor(private socketClientService: SocketClientService) {
        this.isLoading = true;
        this.initializePlayerList();
        this.configureSocketEvents();
    }

    get botImages() {
        return BOT_PROFILES_IMAGES;
    }

    ngOnDestroy(): void {
        this.socketClientService.off(WsEventClient.PlayerListUpdated);
    }

    private initializePlayerList(): void {
        this.socketClientService.send(WsEventServer.GetAllPlayers, (players: PlayerInfos[]) => {
            this.players = players;
            this.isLoading = false;
        });
    }

    private configureSocketEvents(): void {
        this.socketClientService.on(WsEventClient.PlayerListUpdated, (players: PlayerInfos[]) => {
            this.players = players;
        });
    }
}
