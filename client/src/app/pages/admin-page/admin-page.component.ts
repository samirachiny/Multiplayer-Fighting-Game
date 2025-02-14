import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { GameService } from '@app/services/game/game.service';
import { CreateGameComponent } from '@app/components/create-game/create-game.component';
import { GameCardComponent } from '@app/components/game-card/game-card.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MessageDialogType } from '@app/enums/message-dialog-type';
import { MessageDialogComponent } from '@app/components/message-dialog/message-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { Message } from '@common/interfaces/message';
import { Game } from '@common/interfaces/game';
import { ImportGameComponent } from '@app/components/import-game/import-game.component';

@Component({
    selector: 'app-admin-page',
    standalone: true,
    imports: [GameCardComponent, CreateGameComponent, HeaderComponent, MatProgressSpinnerModule, ImportGameComponent],
    templateUrl: './admin-page.component.html',
    styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent implements OnInit {
    games: Game[];
    isLoading: boolean;

    constructor(
        private readonly dialogRef: MatDialog,
        private readonly gameService: GameService,
        private readonly cdr: ChangeDetectorRef,
        private socketService: SocketClientService,
    ) {
        this.games = [];
        this.isLoading = true;
        this.socketService.on(WsEventClient.GameListUpdated, (updatedGames: Game[]): void => {
            this.games = updatedGames;
            this.cdr.detectChanges();
        });
    }

    ngOnInit(): void {
        this.getGames();
    }

    handleDeleteGame(gid: string): void {
        this.gameService.deleteGame(gid).subscribe({
            next: () => {
                this.games = this.games.filter((game) => game.gid !== gid);
                this.socketService.send(WsEventServer.GameModified);
            },
            error: (result) => {
                this.isLoading = false;
                this.handleServerError(result.error);
            },
        });
    }

    handleHideGame(gid: string): void {
        this.gameService.toggleGameVisibility(gid).subscribe({
            next: () => {
                this.toggleGameVisibility(gid);
                this.socketService.send(WsEventServer.GameModified, gid);
            },
            error: (result) => {
                this.isLoading = false;
                this.handleServerError(result.error);
            },
        });
    }

    private toggleGameVisibility(gid: string): void {
        this.games = this.games.map((game) => {
            if (game.gid === gid) {
                game.isVisible = !game.isVisible;
            }
            return game;
        });
    }

    private handleServerError(error: Message): void {
        this.dialogRef.open(MessageDialogComponent, {
            data: {
                type: MessageDialogType.Error,
                title: error.title,
                body: error.body,
                optionals: '',
            },
        });
    }
    private getGames(): void {
        this.gameService.getGames().subscribe({
            next: (data) => {
                this.games = data as Game[];
            },
            error: (result) => {
                this.isLoading = false;
                this.handleServerError(result.error);
            },
            complete: () => {
                this.isLoading = false;
            },
        });
    }
}
