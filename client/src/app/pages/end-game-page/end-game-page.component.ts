import { Component, OnInit } from '@angular/core';
import { ChatComponent } from '@app/components/chat/chat.component';
import { UrlPath } from '@app/enums/url-path';
import { Router } from '@angular/router';
import { HeaderComponent } from '@app/components/header/header.component';
import { MatRipple } from '@angular/material/core';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventServer } from '@common/enums/web-socket-event';
import { PlayerStatisticsComponent } from '@app/components/player-statistics/player-statistics.component';
import { PartyStatistic } from '@common/interfaces/party-statistics';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { DecimalPipe } from '@angular/common';

@Component({
    selector: 'app-end-game-page',
    standalone: true,
    imports: [ChatComponent, HeaderComponent, PlayerStatisticsComponent, MatRipple, DecimalPipe],
    templateUrl: './end-game-page.component.html',
    styleUrls: ['./end-game-page.component.scss'],
})
export class EndGamePageComponent implements OnInit {
    isDataLoaded: boolean;
    partyStatistic: PartyStatistic | null;

    constructor(
        private router: Router,
        private socketClientService: SocketClientService,
        private navigationCheckService: NavigationCheckService,
    ) {
        this.isDataLoaded = false;
        if (this.navigationCheckService.isNotFromGame) {
            this.router.navigate([UrlPath.Home]);
        }
    }

    ngOnInit(): void {
        this.getPartyStatistics();
    }

    navigateToHome(): void {
        this.socketClientService.send(WsEventServer.DeleteParty);
        this.router.navigate([UrlPath.Home]);
    }

    private getPartyStatistics(): void {
        this.socketClientService.send(WsEventServer.GetPartyStatistics, (partyStatistic: PartyStatistic | null) => {
            this.partyStatistic = partyStatistic;
            this.isDataLoaded = false;
        });
    }
}
