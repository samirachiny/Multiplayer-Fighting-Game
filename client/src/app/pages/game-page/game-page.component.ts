import { Component, HostListener, inject, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { ChronometerComponent } from '@app/components/chronometer/chronometer.component';
import { GameMapComponent } from '@app/components/game-map/game-map.component';
import { ListPlayerComponent } from '@app/components/list-player/list-player.component';
import { PlayerCardComponent } from '@app/components/player-card/player-card.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { Game } from '@common/interfaces/game';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { PartyInfos } from '@common/interfaces/party';
import { ChatComponent } from '@app/components/chat/chat.component';
import { Router } from '@angular/router';
import {
    CONFIRMATION_HEADER,
    DEBUG_MODE_ACTIVATED,
    DEBUG_MODE_DEACTIVATED,
    END_GAME_DELAY,
    GIVE_UP_CONFIRMATION,
    MAX_COLOR_VALUE,
    MESSAGE_DIALOG,
    SNACK_BAR_PROPERTIES_SET_UP,
} from '@app/constants/consts';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-data';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { NgClass, NgStyle } from '@angular/common';
import { GameLogComponent } from '@app/components/game-log/game-log.component';
import { GameMapService } from '@app/services/game-map/game-map.service';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { UrlPath } from '@app/enums/url-path';
import { FightViewComponent } from '@app/components/fight-view/fight-view.component';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { MatRipple } from '@angular/material/core';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Coordinate } from '@common/interfaces/coordinate';
import { ItemsChoiceDialogComponent } from '@app/components/items-choice-dialog/items-choice-dialog.component';

@Component({
    selector: 'app-game-page',
    standalone: true,
    imports: [
        GameMapComponent,
        ListPlayerComponent,
        MatIconModule,
        ChronometerComponent,
        PlayerCardComponent,
        MatTabsModule,
        ChatComponent,
        NgClass,
        NgStyle,
        GameLogComponent,
        FightViewComponent,
        MatRipple,
    ],
    templateUrl: './game-page.component.html',
    styleUrl: './game-page.component.scss',
})
export class GamePageComponent implements OnDestroy {
    isPartyInitialized: boolean = false;
    isFighting: boolean = false;
    isBeginning: boolean = false;
    currentPlayerName: string = '';
    isCountDownStarting: boolean = false;
    isDebugMode: boolean = false;
    timeBeforeStart: number = 0;
    isShowMessages = true;
    players: PlayerInfos[];
    game: Game;
    player: PlayerInfos;
    winner: PlayerInfos;
    isPartyEnded: boolean = false;
    private snackBar = inject(MatSnackBar);
    private socketClientService: SocketClientService = inject(SocketClientService);
    private router: Router = inject(Router);
    private matDialog: MatDialog = inject(MatDialog);
    private gameMapService: GameMapService = inject(GameMapService);
    private navigationCheck: NavigationCheckService = inject(NavigationCheckService);

    constructor() {
        if (this.navigationCheck.isNotFromWaiting) {
            this.router.navigate([UrlPath.Home]);
            return;
        }

        this.initializeParty();
        this.configureSocketEvents();
    }

    @HostListener('document:keydown.d', ['$event'])
    togglePartyMode() {
        if (!this.player?.isOrganizer) return;
        this.socketClientService.send(WsEventServer.TogglePartyDebugMode);
    }

    ngOnDestroy(): void {
        this.removeSocketListeners();
    }

    onGiveUp() {
        this.openConfirmationDialog({
            title: CONFIRMATION_HEADER,
            body: GIVE_UP_CONFIRMATION,
            onAgreed: () => {
                this.socketClientService.send(WsEventServer.GiveUp);
                this.router.navigate([UrlPath.Home]);
            },
        });
    }

    onEndRound(): void {
        if (this.player.isCurrentPlayer) {
            this.socketClientService.send(WsEventServer.EndRound);
        }
    }

    onEnabledInteractionWithMap() {
        this.gameMapService.isMapInteractionEnabled = !this.gameMapService.isMapInteractionEnabled;
        if (this.gameMapService.isMapInteractionEnabled) {
            this.socketClientService.send(WsEventServer.GetInteractivePositions, (interactivePositions: Coordinate[]) => {
                this.gameMapService.hightLightTiles(interactivePositions, { red: 0, green: 0, blue: MAX_COLOR_VALUE });
            });
            return;
        }
        this.socketClientService.send(WsEventServer.GetAvailablePositions, (accessiblePositions: Coordinate[]) => {
            this.gameMapService.hightLightTiles(accessiblePositions, { red: MAX_COLOR_VALUE, green: MAX_COLOR_VALUE, blue: 0 });
        });
    }

    toggleTab(isMessagesTab: boolean): void {
        this.isShowMessages = isMessagesTab;
    }

    private initializeParty(): void {
        this.socketClientService.send(WsEventServer.GetPartyInfos, (partyInfos: PartyInfos) => {
            if (partyInfos) {
                this.game = partyInfos.game;
                this.players = partyInfos.players;
                this.currentPlayerName = this.players.find((player) => player.isCurrentPlayer)?.name || '';
                this.updatePlayer();
                this.isPartyInitialized = true;
                this.isBeginning = true;
            }
        });
    }

    private configureSocketEvents(): void {
        this.socketClientService.on(WsEventClient.CountdownStart, (currentPlayerName: string) => this.handleCountdownStart(currentPlayerName));
        this.socketClientService.on(WsEventClient.CountdownEnd, () => this.handleCountdownEnd());
        this.socketClientService.on(WsEventClient.ActionFinished, () => this.updatePlayer());
        this.socketClientService.on(WsEventClient.DoorToggled, () => this.updatePlayer());
        this.socketClientService.on<number>(WsEventClient.CountdownUpdate, (timeBeforeStart: number) => this.updateCountdown(timeBeforeStart));
        this.socketClientService.on<PlayerInfos[]>(WsEventClient.PlayerListUpdated, (players: PlayerInfos[]) => this.updatePlayerList(players));
        this.socketClientService.on(WsEventClient.AllPlayersGaveUp, () => this.handleAllPlayerGiveUp());
        this.socketClientService.on(WsEventClient.FightInit, (data: FightParticipants) => this.handleFightInit(data));
        this.socketClientService.on(WsEventClient.FightTerminated, () => this.handleFightTerminated());
        this.socketClientService.on(WsEventClient.GameEnd, (winner: PlayerInfos) => this.handleEndGame(winner));
        this.socketClientService.on(WsEventClient.PartyModeToggled, (isDebugMode: boolean) => this.handlePartyModeToggled(isDebugMode));
        this.socketClientService.on(WsEventClient.ChooseItemToRemove, () => this.openChoiceItemToRemove());
    }

    private removeSocketListeners(): void {
        this.socketClientService.off(WsEventClient.PlayerListUpdated);
        this.socketClientService.off(WsEventClient.CountdownStart);
        this.socketClientService.off(WsEventClient.CountdownEnd);
        this.socketClientService.off(WsEventClient.CountdownUpdate);
        this.socketClientService.off(WsEventClient.AllPlayersGaveUp);
        this.socketClientService.off(WsEventClient.ActionFinished);
        this.socketClientService.off(WsEventClient.DoorToggled);
        this.socketClientService.off(WsEventClient.FightInit);
        this.socketClientService.off(WsEventClient.FightTerminated);
        this.socketClientService.off(WsEventClient.GameEnd);
        this.socketClientService.off(WsEventClient.PartyModeToggled);
        this.socketClientService.off(WsEventClient.UpdateItem);
        this.socketClientService.off(WsEventClient.ChooseItemToRemove);
    }

    private updatePlayer(): void {
        this.socketClientService.send(WsEventServer.GetPlayer, (player: PlayerInfos) => {
            if (!player) return;
            this.player = player;
        });
    }

    private handleEndGame(winner: PlayerInfos): void {
        this.isFighting = false;
        this.isPartyEnded = true;
        this.winner = winner;
        setTimeout(() => this.navigateToEndGame(), END_GAME_DELAY);
    }

    private navigateToEndGame(): void {
        this.navigationCheck.setToGame();
        this.router.navigate([UrlPath.EndGame]);
    }

    private handleCountdownStart(currentPlayerName: string): void {
        this.currentPlayerName = currentPlayerName;
        this.isCountDownStarting = true;
    }

    private handleCountdownEnd(): void {
        if (this.isBeginning) {
            this.isBeginning = false;
        }
        this.isCountDownStarting = false;
        this.updatePlayer();
    }

    private updateCountdown(timeBeforeStart: number): void {
        this.timeBeforeStart = timeBeforeStart;
    }

    private updatePlayerList(players: PlayerInfos[]): void {
        this.players = players;
        this.currentPlayerName = this.players.find((player) => player.isCurrentPlayer)?.name || '';
    }

    private handleAllPlayerGiveUp(): void {
        this.openInformationDialog(MESSAGE_DIALOG.allPlayerGiveUp.body);
        this.socketClientService.send(WsEventServer.DeleteParty);
        this.router.navigate([UrlPath.Home]);
    }

    private handleFightInit(data: FightParticipants): void {
        this.isFighting = data.attacker.pid === this.player.pid || data.defender.pid === this.player.pid;
    }

    private handleFightTerminated(): void {
        this.isFighting = false;
    }

    private handlePartyModeToggled(isDebugMode: boolean) {
        this.isDebugMode = isDebugMode;
        const message = this.isDebugMode ? DEBUG_MODE_ACTIVATED : DEBUG_MODE_DEACTIVATED;
        this.openInformationDialog(message);
    }

    private openConfirmationDialog(dialogData: ConfirmationDialogData): MatDialogRef<ConfirmationDialogComponent> {
        return this.matDialog.open(ConfirmationDialogComponent, {
            data: dialogData,
        });
    }

    private openInformationDialog(message: string): void {
        this.snackBar.openFromComponent(SnackBarComponent, {
            data: { message },
            ...SNACK_BAR_PROPERTIES_SET_UP,
        });
    }

    private openChoiceItemToRemove(): void {
        this.socketClientService.send(WsEventServer.GetPlayer, (player: PlayerInfos) => {
            if (!player) return;
            this.player = player;
            this.matDialog.open(ItemsChoiceDialogComponent, {
                disableClose: true,
                data: this.player.items,
            });
        });
    }
}
