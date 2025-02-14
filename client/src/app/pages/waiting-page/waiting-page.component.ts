import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { HeaderComponent } from '@app/components/header/header.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { SetUpPartyParams } from '@common/interfaces/set-up-party-params';
import { ChatComponent } from '@app/components/chat/chat.component';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
    CONFIRMATION_EJECT_PLAYER,
    CONFIRMATION_HEADER,
    CONFIRMATION_LEAVE_PARTY,
    GAME_KEY,
    MESSAGE_DIALOG,
    SNACK_BAR_PROPERTIES_SET_UP_ERROR,
} from '@app/constants/consts';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule, DatePipe } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-data';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { UrlPath } from '@app/enums/url-path';
import { MatRipple } from '@angular/material/core';
import { Game } from '@common/interfaces/game';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BotProfileChoiceDialogComponent } from '@app/components/bot-profile-choice-dialog/bot-profile-choice-dialog.component';
import { BOT_PROFILES_IMAGES } from '@app/constants/image';
@Component({
    selector: 'app-waiting-page',
    standalone: true,
    imports: [HeaderComponent, MatIconModule, MatListModule, MatTooltipModule, CommonModule, ChatComponent, MatRipple, DatePipe, ClipboardModule],
    templateUrl: './waiting-page.component.html',
    styleUrl: './waiting-page.component.scss',
})
export class WaitingPageComponent implements OnInit, OnDestroy {
    players: PlayerInfos[];
    player: PlayerInfos;
    game: Game;
    accessCode: number;
    isLocked: boolean;
    maxPlayers: number;

    constructor(
        private snackBar: MatSnackBar,
        private socketService: SocketClientService,
        private router: Router,
        private matDialog: MatDialog,
        private navigationCheck: NavigationCheckService,
    ) {}

    get isOrganizer(): boolean {
        return this.player?.isOrganizer;
    }

    get playersNumber(): number {
        return this.players?.length;
    }

    get botImages() {
        return BOT_PROFILES_IMAGES;
    }

    ngOnInit(): void {
        if (this.navigationCheck.isNotFromCreateCharacter) {
            this.router.navigate([UrlPath.Home]);
            return;
        }
        this.setUpWaitingPageInfos();
        this.configureSocketService();
    }

    ngOnDestroy(): void {
        this.socketService.off(WsEventClient.AllPlayers);
        this.socketService.off(WsEventClient.LeftParty);
        this.socketService.off(WsEventClient.EjectPlayer);
        this.socketService.off(WsEventClient.PartyEnd);
        this.socketService.off(WsEventClient.PartyFull);
        this.socketService.off(WsEventClient.StartGame);
    }

    onToggleLockParty() {
        if (this.players.length === this.maxPlayers) return;
        this.socketService.send(WsEventServer.ToggleLockParty, (isLocked: boolean) => {
            this.isLocked = isLocked;
        });
    }

    onStartGame() {
        if (!this.isLocked) return;
        this.socketService.send(WsEventServer.StartGame);
    }

    openChoiceBotProfile(): void {
        this.matDialog.open(BotProfileChoiceDialogComponent);
    }

    onEjectPlayer(pid: string) {
        this.openConfirmationDialog({
            title: CONFIRMATION_HEADER,
            body: CONFIRMATION_EJECT_PLAYER,
            onAgreed: () => this.socketService.send(WsEventServer.EjectPlayer, pid),
        });
    }

    onLeaveParty() {
        this.openConfirmationDialog({
            title: CONFIRMATION_HEADER,
            body: CONFIRMATION_LEAVE_PARTY,
            onAgreed: () => {
                this.router.navigate([UrlPath.Home]);
            },
        });
    }

    private setUpWaitingPageInfos(): void {
        this.socketService.send(WsEventServer.SetUpParty, (data: SetUpPartyParams) => {
            this.players = data.players;
            this.player = data.player;
            this.game = data.game;
            this.accessCode = data.accessCode;
            this.isLocked = data.isLocked;
            this.maxPlayers = data.maxPlayers;
        });
    }
    private configureSocketService(): void {
        this.handleLeftParty();
        this.handleEjectPlayer();
        this.handlePartyEnd();
        this.handleAllPlayers();
        this.handlePartyFull();
        this.handleStartGame();
    }

    private handleLeftParty(): void {
        this.socketService.on(WsEventClient.LeftParty, (playerName: string): void => {
            if (playerName !== this.player?.name) {
                this.openInformationDialog(playerName + MESSAGE_DIALOG.playerLeftParty.body);
            }
        });
    }

    private handleEjectPlayer(): void {
        this.socketService.on(WsEventClient.EjectPlayer, (playerName: string): void => {
            if (playerName !== this.player?.name) {
                this.showPlayerEjectedDialog(playerName);
            } else {
                this.showYouEjectedDialog();
            }
        });
    }

    private showPlayerEjectedDialog(playerName: string): void {
        this.openInformationDialog(playerName + MESSAGE_DIALOG.playerEjected.body);
    }

    private showYouEjectedDialog(): void {
        this.openInformationDialog(MESSAGE_DIALOG.youEjectedFromParty.body);
        this.router.navigate([UrlPath.Home]);
    }

    private handlePartyEnd(): void {
        this.socketService.on(WsEventClient.PartyEnd, (): void => {
            this.openInformationDialog(MESSAGE_DIALOG.partyCancelled.body);
            this.router.navigate([UrlPath.Home]);
        });
    }

    private handleAllPlayers(): void {
        this.socketService.on(WsEventClient.AllPlayers, (players: PlayerInfos[]): void => {
            this.players = players;
        });
    }

    private handlePartyFull(): void {
        this.socketService.on(WsEventClient.PartyFull, (isFull: boolean) => {
            this.isLocked = isFull;
        });
    }

    private handleStartGame(): void {
        this.socketService.on(WsEventClient.StartGame, () => {
            this.navigationCheck.setToWaiting();
            sessionStorage.removeItem(GAME_KEY);
            this.router.navigate([UrlPath.Game]);
        });
    }

    private openInformationDialog(message: string): void {
        this.snackBar.openFromComponent(SnackBarComponent, {
            data: { message },
            ...SNACK_BAR_PROPERTIES_SET_UP_ERROR,
        });
    }

    private openConfirmationDialog(dialogData: ConfirmationDialogData): MatDialogRef<ConfirmationDialogComponent> {
        return this.matDialog.open(ConfirmationDialogComponent, {
            data: dialogData,
        });
    }
}
