import { Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CharacterListComponent } from '@app/components/character-list/character-list.component';
import { Character } from '@common/interfaces/character';
import {
    BASE_ATTRIBUTE_VALUE,
    MESSAGE_DIALOG,
    FeedbacksMessages,
    GAME_KEY,
    STAT_BONUS,
    SNACK_BAR_PROPERTIES_SET_UP_ERROR,
} from '@app/constants/consts';
import { HeaderComponent } from '@app/components/header/header.component';
import { FormsModule } from '@angular/forms';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { CHARACTERS } from '@common/constants/character';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Dice } from '@common/enums/dice';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-data';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { UrlPath } from '@app/enums/url-path';
import { MatRipple } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { NgStyle } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { MessageDialogComponent } from '@app/components/message-dialog/message-dialog.component';
import { MessageDialogData } from '@app/interfaces/message-dialog-data';

@Component({
    selector: 'app-create-character',
    standalone: true,
    imports: [
        MatTooltipModule,
        FormsModule,
        MatCardModule,
        CharacterListComponent,
        HeaderComponent,
        MatRipple,
        MatButtonToggleModule,
        MatIconModule,
        NgStyle,
    ],
    templateUrl: './create-character-page.component.html',
    styleUrl: './create-character-page.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class CreateCharacterComponent implements OnDestroy {
    d4 = Dice.D4;
    d6 = Dice.D6;
    player: PlayerInfos;
    characterSelected: Character;
    constructor(
        private router: Router,
        private matDialog: MatDialog,
        private socketService: SocketClientService,
        private navigationCheck: NavigationCheckService,
        private snackBar: MatSnackBar,
    ) {
        this.initProperties();
        if (this.navigationCheck.isNotFromCreateOrJoinParty) {
            this.router.navigate([UrlPath.Home]);
            sessionStorage.removeItem(GAME_KEY);
            return;
        }
        this.configureSocketService();
    }
    get isNotDiceAttributed(): boolean {
        return this.player.diceAssignment.attack === null && this.player.diceAssignment.defense === null;
    }
    get isNotNameFilled(): boolean {
        return this.player.name.trim() === '';
    }
    get isNotLifeOrSpeedIncrease(): boolean {
        return this.player.life === BASE_ATTRIBUTE_VALUE && this.player.speed === BASE_ATTRIBUTE_VALUE;
    }

    get isNotPlayerPersonalized(): boolean {
        return this.isNotDiceAttributed || this.isNotLifeOrSpeedIncrease || this.isNotNameFilled;
    }
    ngOnDestroy(): void {
        this.socketService.off(WsEventClient.GameModified);
        this.socketService.off(WsEventClient.PartyLocked);
        this.socketService.off(WsEventClient.PartyFull);
        this.socketService.off(WsEventClient.PartyEnd);
    }

    onIncreaseAttribute(attribute: 'life' | 'speed'): void {
        if (attribute === 'life') {
            if (this.player.life === BASE_ATTRIBUTE_VALUE + STAT_BONUS) return;
            this.player.life += STAT_BONUS;
            this.player.speed = BASE_ATTRIBUTE_VALUE;
        } else {
            if (this.player.speed === BASE_ATTRIBUTE_VALUE + STAT_BONUS) return;
            this.player.speed += STAT_BONUS;
            this.player.life = BASE_ATTRIBUTE_VALUE;
        }
    }

    onCharacterSelected(character: Character): void {
        this.player.character = character;
        this.characterSelected = character;
    }

    onAssignDice(attribute: 'attack' | 'defense') {
        this.player.diceAssignment[attribute] = Dice.D6;
        const oppositeAttribute = attribute === 'attack' ? 'defense' : 'attack';
        this.player.diceAssignment[oppositeAttribute] = Dice.D4;
    }

    joinParty(): void {
        if (this.isNotPlayerPersonalized) {
            MESSAGE_DIALOG.customAvatarIssues.optionals = this.buildFeedback();
            this.openMessageDialog(MESSAGE_DIALOG.customAvatarIssues);
            return;
        }

        this.player.name = this.player.name.trim();
        this.player.availableMoves = this.player.speed;
        this.socketService.send(WsEventServer.JoinParty, this.player, (isSuccessful: boolean) => {
            if (isSuccessful) {
                this.navigationCheck.setToCreateCharacter();
                this.router.navigate([UrlPath.Waiting]);
                return;
            }
            this.handlePartyFull();
        });
    }

    blockDrop(event: DragEvent): void {
        event.preventDefault();
    }

    onBack(): void {
        this.leaveParty();
        this.router.navigate([this.navigationCheck.isFromCreateParty ? UrlPath.CreateParty : UrlPath.JoinParty]);
    }

    private configureSocketService(): void {
        if (this.navigationCheck.isFromCreateParty) {
            this.socketService.on(WsEventClient.GameModified, (gid: string | null) => this.openDialogIfGameNotAvailable(gid));
        }

        this.socketService.on(WsEventClient.PartyLocked, () => {
            this.leaveParty();
            this.openRetryDialog({
                ...MESSAGE_DIALOG.partyLocked,
                onAgreed: () => this.onBack(),
                onRefused: async () => this.router.navigate([UrlPath.Home]),
            });
        });

        this.socketService.on(WsEventClient.PartyFull, () => this.handlePartyFull());

        this.socketService.on(WsEventClient.PartyEnd, (): void => {
            this.leaveParty();
            this.openInformationDialog(MESSAGE_DIALOG.partyCancelled.body);
            this.router.navigate([UrlPath.Home]);
        });
    }
    private leaveParty() {
        this.socketService.send(WsEventServer.LeaveParty, this.navigationCheck.isFromCreateParty);
    }
    private buildFeedback(): string[] {
        const feedbacks: string[] = [];
        if (this.isNotDiceAttributed) {
            feedbacks.push(FeedbacksMessages.ShouldAssignDice);
        }
        if (this.isNotLifeOrSpeedIncrease) {
            feedbacks.push(FeedbacksMessages.ShouldUpgradeLifeOrSpeed);
        }
        if (this.isNotNameFilled) {
            feedbacks.push(FeedbacksMessages.ShouldAddPlayerName);
        }
        return feedbacks;
    }

    private openDialogIfGameNotAvailable(gid: string | null): void {
        const gameId = sessionStorage.getItem(GAME_KEY);
        if (gid === gameId) {
            this.openInformationDialog(MESSAGE_DIALOG.gameNotAvailable.body);
            sessionStorage.removeItem(GAME_KEY);
            this.router.navigate([UrlPath.Home]);
        }
    }

    private openInformationDialog(message: string): void {
        this.snackBar.openFromComponent(SnackBarComponent, {
            data: { message },
            ...SNACK_BAR_PROPERTIES_SET_UP_ERROR,
        });
    }

    private openMessageDialog(dialogData: MessageDialogData): MatDialogRef<MessageDialogComponent> {
        return this.matDialog.open(MessageDialogComponent, {
            data: dialogData,
        });
    }

    private openRetryDialog(dialogData: ConfirmationDialogData): MatDialogRef<ConfirmationDialogComponent> {
        return this.matDialog.open(ConfirmationDialogComponent, {
            data: dialogData,
        });
    }

    private initProperties(): void {
        this.player = {
            character: CHARACTERS[0],
            name: '',
            life: BASE_ATTRIBUTE_VALUE,
            speed: BASE_ATTRIBUTE_VALUE,
            diceAssignment: { attack: null, defense: null },
            pid: 'unknown',
            isOrganizer: false,
            attack: BASE_ATTRIBUTE_VALUE,
            defense: BASE_ATTRIBUTE_VALUE,
            wins: 0,
            items: [],
            availableMoves: BASE_ATTRIBUTE_VALUE,
            remainingAction: 1,
            isCurrentPlayer: false,
            isGiveUp: false,
            startPosition: null,
            currentPosition: null,
            previousPosition: null,
        };
        this.characterSelected = CHARACTERS[0];
    }

    private handlePartyFull() {
        this.leaveParty();
        this.openInformationDialog(MESSAGE_DIALOG.partyPlayersFull.body);
        this.router.navigate([UrlPath.Home]);
    }
}
