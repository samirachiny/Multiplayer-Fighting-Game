import { Component, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatRipple } from '@angular/material/core';
import { MatDialog, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import {
    GAME_MODE_OPTIONS,
    ITEMS_PER_MAP_SIZE_OPTIONS,
    MAP_SIZE_OPTIONS,
    PLAYERS_PER_MAP_SIZE_OPTIONS,
    CREATE_GAME_PARAMS,
    CREATE_GAME_PAGE_OPTION,
} from '@app/constants/consts';
import { GameMapSize, GameMode, ItemsPerMapSize, PlayersPerMapSize } from '@common/enums/game-infos';
import { UrlPath } from '@app/enums/url-path';

@Component({
    selector: 'app-create-game',
    standalone: true,
    imports: [FormsModule, MatCardModule, MatIconModule, MatDialogActions, MatDialogClose, MatRipple],
    templateUrl: './create-game.component.html',
    styleUrl: './create-game.component.scss',
})
export class CreateGameComponent {
    @ViewChild('createGameDetailDialog')
    private readonly createGameDetailDialogRef: TemplateRef<HTMLElement>;
    readonly selectedMode;
    readonly selectedSize;

    constructor(
        private router: Router,
        private readonly matDialog: MatDialog,
    ) {
        this.selectedMode = GameMode.Classic;
        this.selectedSize = GameMapSize.Medium;
    }
    get itemsOptions(): ItemsPerMapSize[] {
        return ITEMS_PER_MAP_SIZE_OPTIONS;
    }

    get playersOptions(): PlayersPerMapSize[] {
        return PLAYERS_PER_MAP_SIZE_OPTIONS;
    }
    get mapSizeOptions(): GameMapSize[] {
        return MAP_SIZE_OPTIONS;
    }

    get gameModeOptions(): GameMode[] {
        return GAME_MODE_OPTIONS;
    }
    openDialog(): void {
        this.matDialog.open(this.createGameDetailDialogRef);
    }

    onConfirm(): void {
        this.router.navigate([UrlPath.EditGame, CREATE_GAME_PAGE_OPTION]);
        sessionStorage.setItem(CREATE_GAME_PARAMS, JSON.stringify({ mode: this.selectedMode, size: this.selectedSize }));
    }
}
