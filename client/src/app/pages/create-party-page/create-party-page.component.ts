import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { GameCardComponent } from '@app/components/game-card/game-card.component';
import { GameService } from '@app/services/game/game.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MessageDialogComponent } from '@app/components/message-dialog/message-dialog.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { Router } from '@angular/router';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { UrlPath } from '@app/enums/url-path';
import { GAME_KEY, MESSAGE_DIALOG, WAITING_TIME } from '@app/constants/consts';
import { Game } from '@common/interfaces/game';

@Component({
    imports: [
        MatDialogModule,
        CommonModule,
        MatIconModule,
        MatCardModule,
        MatButtonModule,
        GameCardComponent,
        MatProgressSpinnerModule,
        HeaderComponent,
    ],
    standalone: true,
    selector: 'app-create-party-page',
    templateUrl: './create-party-page.component.html',
    styleUrls: ['./create-party-page.component.scss'],
})
export class CreatePartyPageComponent implements OnInit {
    visibleGames: Game[];
    isLoading: boolean;

    constructor(
        private gameService: GameService,
        private socketService: SocketClientService,
        private navigationCheck: NavigationCheckService,
        private readonly dialogRef: MatDialog,
        private readonly router: Router,
    ) {
        this.visibleGames = [];
        this.isLoading = true;
        this.socketService.on(WsEventClient.GameListUpdated, (updatedGames: Game[]) => {
            this.visibleGames = updatedGames.filter((game) => game.isVisible);
        });
        if (!this.navigationCheck.isNotFromCreateCharacter) {
            this.socketService.send(WsEventServer.LeaveParty);
        }
    }

    ngOnInit(): void {
        this.getVisibleGames();
    }

    getVisibleGames(): void {
        this.gameService.getGames().subscribe({
            next: (games) => {
                this.visibleGames = games.filter((game) => game.isVisible) as Game[];
            },
            error: (result) => {
                this.isLoading = false;
                this.handleServerError(result.error);
            },
            complete: () => {
                setTimeout(() => {
                    this.isLoading = false;
                }, WAITING_TIME);
            },
        });
    }

    handleSelectionGame(gid: string): void {
        this.socketService.send(WsEventServer.CreateParty, gid, this.callbackCreateParty.bind(this));
    }

    private callbackCreateParty(isSuccessful: boolean, response: string[]): void {
        if (!isSuccessful) {
            this.handleServerError(response);
            return;
        }
        sessionStorage.setItem(GAME_KEY, response[0]);
        this.navigationCheck.setToCreateParty();
        this.router.navigate([UrlPath.CreateCharacter]);
    }

    private handleServerError(error: string[]): void {
        this.dialogRef.open(MessageDialogComponent, {
            data: {
                ...MESSAGE_DIALOG.gameSelectedNotAvailable,
                optionals: error,
            },
        });
    }
}
