import { Component } from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { RouterLink } from '@angular/router';
import { GAME_KEY, MEMBERS, TITLE } from '@app/constants/consts';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';

@Component({
    selector: 'app-home-page',
    standalone: true,
    imports: [RouterLink, MatRipple],
    templateUrl: './home-page.component.html',
    styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
    readonly title: string;
    members: string[];
    constructor(
        private socketService: SocketClientService,
        private navigationCheckService: NavigationCheckService,
    ) {
        this.title = TITLE;
        this.members = MEMBERS;
        if (!this.navigationCheckService.isNotFromHome) return;
        this.socketService.disconnect();
        this.socketService.connect();
        this.navigationCheckService.setToHome();
        sessionStorage.removeItem(GAME_KEY);
    }
}
