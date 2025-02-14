import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { MapEditorComponent } from '@app/components/map-editor/map-editor.component';
import { MessageDialogComponent } from '@app/components/message-dialog/message-dialog.component';
import {
    BASE_ERROR_TITLE,
    CONFIRMATION_CANCELLATION_DETAILS,
    CREATE_GAME_PAGE_OPTION,
    CREATE_GAME_PARAMS,
    GAME_ID_KEY_NAME,
    GAME_IMPORTATION_ERROR_HEADER,
    GAME_LOAD_ERROR_HEADER,
    GAME_MODE_OPTIONS,
    GAME_REGISTRATION_SUCCESSFUL_MESSAGE,
    IMG_QUALITY,
    IMG_TYPE,
    MAP_HEIGHT,
    MAP_SIZE_OPTIONS,
    MAP_WIDTH,
    NEW_GAME_INVALID_ERROR_HEADER,
    SNACK_BAR_PROPERTIES_SET_UP_SUCCESS,
} from '@app/constants/consts';
import { MessageDialogType } from '@app/enums/message-dialog-type';
import { CreateGameParams } from '@app/interfaces/create-game-params';
import { MessageDialogData } from '@app/interfaces/message-dialog-data';
import { GameService } from '@app/services/game/game.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { Game } from '@common/interfaces/game';
import { GameMode } from '@common/enums/game-infos';
import { ValidationResponse } from '@common/interfaces/response-infos';
import { WsEventServer } from '@common/enums/web-socket-event';
import { MatRipple } from '@angular/material/core';
import { UrlPath } from '@app/enums/url-path';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImageService } from '@app/services/image/image.service';

@Component({
    selector: 'app-edit-create-game-page',
    standalone: true,
    imports: [HeaderComponent, FormsModule, MapEditorComponent, MatProgressSpinnerModule, CommonModule, MatRipple],
    templateUrl: './edit-create-game-page.component.html',
    styleUrl: './edit-create-game-page.component.scss',
})
export class EditCreateGamePageComponent implements OnInit {
    @ViewChild(MapEditorComponent) mapEditor: MapEditorComponent;
    name: string;
    description: string;
    isLoading: boolean = true;
    isGameSubmitted: boolean = false;
    gameMapEditor: GameMapEditor;
    private game: Game;
    private isNewGame: boolean;
    private socketService = inject(SocketClientService);
    private snackBar = inject(MatSnackBar);
    private oldName: string;
    private oldDescription: string;
    private imageService: ImageService = inject(ImageService);
    private dialog: MatDialog = inject(MatDialog);
    private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
    private gameService: GameService = inject(GameService);
    private mapEditorService: MapEditorService = inject(MapEditorService);
    private router: Router = inject(Router);

    async ngOnInit(): Promise<void> {
        await this.imageService.preloadImages();
        this.init();
    }

    init(): void {
        this.activatedRoute.paramMap.subscribe((params) => {
            const id: string | null = params.get(GAME_ID_KEY_NAME);
            this.isNewGame = id !== null && id === CREATE_GAME_PAGE_OPTION;
            if (this.isNewGame) {
                this.handleNewGame();
            } else if (id) {
                this.loadExistingGame(id);
            }
        });
    }

    onDropInput(event: DragEvent) {
        event?.preventDefault();
    }

    onMapChanged(newMap: number[][]) {
        this.game.gameMap = newMap;
    }

    onMapReset(map: number[][]) {
        this.game.gameMap = map;
        this.name = this.isNewGame ? '' : this.oldName;
        this.description = this.isNewGame ? '' : this.oldDescription;
    }

    handleError(response: ValidationResponse<Game>) {
        if (!(response.feedbacks && response.feedbacks.mapFeedback)) return;
        this.openErrorDialog(GAME_IMPORTATION_ERROR_HEADER, response);
        this.mapEditorService.hightLightNoAccessTiles(response.feedbacks.mapFeedback.blockedSection);
        this.mapEditorService.hightLightInvalidDoors(response.feedbacks.mapFeedback.invalidDoors);
    }

    handleCreateGame(): void {
        this.gameService.addGame(this.game).subscribe({
            next: () => this.openSuccessDialog(),
            error: (response) => this.handleError(response.error),
        });
    }

    handleUpdateGame(): void {
        this.gameService.editGame(this.game).subscribe({
            next: () => {
                this.openSuccessDialog();
                this.socketService.send(WsEventServer.GameModified, this.game.gid);
            },
            error: (response) => this.handleError(response.error),
        });
    }

    handleSaveGame(form: NgForm): void {
        if (!form.valid) return;
        this.mapEditorService.removeHightLightFormTile();
        this.isGameSubmitted = true;
        this.game.imageBase64 = this.mapEditor.getCanvas().nativeElement.toDataURL(IMG_TYPE, IMG_QUALITY);
        this.game.name = this.name;
        this.game.description = this.description;
        if (this.isNewGame) {
            this.handleCreateGame();
        } else {
            this.handleUpdateGame();
        }
    }

    onBack(): void {
        this.router.navigate([UrlPath.Admin]);
    }

    onOpenCancelConfirmation(): void {
        this.dialog.open(ConfirmationDialogComponent, {
            data: {
                ...CONFIRMATION_CANCELLATION_DETAILS,
                onAgreed: () => this.onBack(),
            },
        });
    }

    private initializeGame(game: Game): void {
        this.game = game;
        const gameMode: GameMode = GameMode[this.game.mode as keyof typeof GameMode];
        this.gameMapEditor = new GameMapEditor(this.game.mapSize, gameMode, MAP_WIDTH, MAP_HEIGHT, this.game.gameMap);
        this.isLoading = false;
    }

    private validateSessionStorageData(dataString: string | null): boolean {
        if (!dataString) return false;
        const data: CreateGameParams = JSON.parse(dataString);
        const { mode, size } = data;
        return mode && size && GAME_MODE_OPTIONS.includes(mode) && MAP_SIZE_OPTIONS.includes(size);
    }

    private handleNewGame(): void {
        const dataString = sessionStorage.getItem(CREATE_GAME_PARAMS);
        if (!this.validateSessionStorageData(dataString)) {
            this.openErrorDialog(NEW_GAME_INVALID_ERROR_HEADER, null);
            return;
        }
        const data = JSON.parse(dataString as string);
        this.initializeGame({
            gid: '',
            name: '',
            mode: data.mode,
            mapSize: data.size,
            description: '',
            lastEditDate: new Date(),
            creationDate: new Date(),
            imageBase64: '',
            isVisible: false,
            gameMap: [],
        });
    }

    private loadExistingGame(id: string): void {
        this.gameService.getGameById(id).subscribe({
            next: (game) => {
                this.initializeGame(game);
                this.name = game.name;
                this.oldName = game.name;
                this.description = game.description;
                this.oldDescription = game.description;
            },
            error: (res) => this.openErrorDialog(GAME_LOAD_ERROR_HEADER, res.error),
            complete: () => (this.isLoading = false),
        });
    }

    private openSuccessDialog(): void {
        this.snackBar.openFromComponent(SnackBarComponent, {
            data: {
                message: GAME_REGISTRATION_SUCCESSFUL_MESSAGE,
            },
            ...SNACK_BAR_PROPERTIES_SET_UP_SUCCESS,
        });
        this.router.navigate([UrlPath.Admin]);
    }

    private openErrorDialog(message: string, response: ValidationResponse<Game> | null): void {
        const dialogMessage: MessageDialogData = {
            title: BASE_ERROR_TITLE,
            type: MessageDialogType.Error,
            body: message,
            optionals: [],
        };
        if (response && response.feedbacks) dialogMessage.optionals = response.feedbacks.errors;
        this.openInformationDialog(dialogMessage);
    }

    private openInformationDialog(dialogMessage: MessageDialogData): void {
        this.dialog
            .open(MessageDialogComponent, {
                data: dialogMessage,
            })
            .afterClosed()
            .subscribe(() => (this.isGameSubmitted = false));
    }
}
