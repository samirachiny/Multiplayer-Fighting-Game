import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';
import { DATA_ICONS, MESSAGE_DIALOG, ICON_DESCRIPTIONS } from '@app/constants/consts';
import { MatRipple } from '@angular/material/core';
import { INFOS_GAMES_ICONS } from '@app/constants/image';
import { Game } from '@common/interfaces/game';
import { ExportGameService } from '@app/services/export-game/export-game.service';
@Component({
    selector: 'app-game-card',
    standalone: true,
    imports: [DatePipe, MatCardModule, MatButtonModule, MatIconModule, RouterLink, MatTooltip, MatRipple, NgClass],
    templateUrl: './game-card.component.html',
    styleUrl: './game-card.component.scss',
})
export class GameCardComponent {
    @Input() game: Game;
    @Input() isEditable: boolean;
    @Output() deleteGame: EventEmitter<string>;
    @Output() hideGame: EventEmitter<string>;
    @Output() selectGame: EventEmitter<string>;
    iconsOptions: string[];
    dataIcons: { [key: number]: number };
    iconDescriptions: string[];

    constructor(
        private readonly dialog: MatDialog,
        private readonly exportGameService: ExportGameService,
    ) {
        this.deleteGame = new EventEmitter<string>();
        this.hideGame = new EventEmitter<string>();
        this.selectGame = new EventEmitter<string>();
        this.iconsOptions = INFOS_GAMES_ICONS;
        this.dataIcons = DATA_ICONS;
        this.iconDescriptions = ICON_DESCRIPTIONS;
    }

    openDeleteConfirmation(): void {
        this.dialog.open(ConfirmationDialogComponent, {
            data: {
                title: MESSAGE_DIALOG.confirmGameSuppression.title,
                body: MESSAGE_DIALOG.confirmGameSuppression.body + this.game.name,
                onAgreed: () => this.onDeleteGame(),
            },
        });
    }

    onDeleteGame() {
        this.deleteGame.emit(this.game.gid);
    }

    onHideGame() {
        this.hideGame.emit(this.game.gid);
    }

    onSelected() {
        this.selectGame.emit(this.game.gid);
    }

    onExportGame() {
        this.exportGameService.exportGame(this.game);
    }
}
