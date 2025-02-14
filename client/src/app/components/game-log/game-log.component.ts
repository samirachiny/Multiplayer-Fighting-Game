import { DatePipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { GameLogs } from '@common/interfaces/game-logs';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { LOG_IMAGES } from '@app/constants/image';

@Component({
    selector: 'app-game-log',
    standalone: true,
    imports: [DatePipe, FormsModule],
    templateUrl: './game-log.component.html',
    styleUrl: './game-log.component.scss',
})
export class GameLogComponent implements OnInit, OnDestroy {
    @Input() playerId: string;
    filteredLogs: GameLogs[];
    filterMine: boolean;
    private logs: GameLogs[];

    constructor(private socketClientService: SocketClientService) {
        this.filteredLogs = [];
        this.filterMine = false;
        this.logs = [];
    }

    ngOnInit(): void {
        this.socketClientService.send(WsEventServer.GetLogGames, (logs: GameLogs[]) => {
            this.logs = logs;
            this.applyFilter();
        });
        this.socketClientService.on(WsEventClient.NewPartyLog, (log: GameLogs) => {
            this.logs.push(log);
            this.applyFilter();
        });
    }

    ngOnDestroy(): void {
        this.socketClientService.off(WsEventClient.NewPartyLog);
    }

    applyFilter(): void {
        this.filteredLogs = this.filterMine ? this.logs.filter((log) => log.playerIds?.some((id) => id === this.playerId)) : this.logs;
    }

    getImage(log: GameLogs) {
        return LOG_IMAGES[log.type];
    }
}
