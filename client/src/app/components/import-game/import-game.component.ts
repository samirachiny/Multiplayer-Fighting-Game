import { Component, ElementRef, inject, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MessageDialogType } from '@app/enums/message-dialog-type';
import { GameService } from '@app/services/game/game.service';
import { MessageDialogComponent } from '@app/components/message-dialog/message-dialog.component';
import {
    GAME_IMPORTATION_ERROR_HEADER,
    GAME_IMPORTATION_ERROR_TITLE,
    GAME_REGISTRATION_ERROR_HEADER,
    GAME_REGISTRATION_ERROR_TITLE,
    GAME_REGISTRATION_SUCCESSFUL_MESSAGE,
    IMAGE_LOAD_DELAY,
    IMG_QUALITY,
    IMG_TYPE,
    MAP_IMPORT_DIMENSION,
    SNACK_BAR_PROPERTIES_SET_UP_SUCCESS,
} from '@app/constants/consts';
import { Game } from '@common/interfaces/game';
import { MessageDialogData } from '@app/interfaces/message-dialog-data';
import { ValidationResponse } from '@common/interfaces/response-infos';
import { CommonModule } from '@angular/common';
import { GameMapEditor } from '@app/classes/game-map-editor/game-map-editor';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { GameMode } from '@common/enums/game-infos';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventServer } from '@common/enums/web-socket-event';
import { MatIconModule } from '@angular/material/icon';
import { GameFileValidatorService } from '@app/services/game-file-validator/game-file-validator.service';
import { MatRippleModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-import-game',
    standalone: true,
    imports: [FormsModule, CommonModule, MatIconModule, MatRippleModule, MatCardModule, MatDividerModule],
    templateUrl: './import-game.component.html',
    styleUrls: ['./import-game.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class ImportGameComponent {
    @ViewChild('map') canvas: ElementRef<HTMLCanvasElement>;
    @ViewChild('importGameDialog') private readonly importGameDialogRef: TemplateRef<HTMLDivElement>;
    file: string;
    game: Game | null = null;
    private mapGame: GameMapEditor;
    private fileContent: string | ArrayBuffer | null = null;
    private matDialogRef: MatDialogRef<HTMLDivElement>;
    private snackBar = inject(MatSnackBar);
    private gameService: GameService = inject(GameService);
    private matDialog: MatDialog = inject(MatDialog);
    private mapEditorService: MapEditorService = inject(MapEditorService);
    private socketService: SocketClientService = inject(SocketClientService);
    private fileValidatorService: GameFileValidatorService = inject(GameFileValidatorService);

    openDialog(): void {
        this.resetDialogState();
        this.matDialogRef = this.matDialog.open(this.importGameDialogRef);
    }

    onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!(input.files && input.files.length > 0)) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            this.fileContent = (e.target as FileReader).result;
            this.initializeGame();
        };
        reader.readAsText(file);
    }

    onImportGame(form: NgForm): void {
        if (!(form.valid && this.file)) return;
        if (!this.game) return;
        this.game.imageBase64 = this.canvas.nativeElement.toDataURL(IMG_TYPE, IMG_QUALITY);
        this.gameService.addGame(this.game).subscribe({
            next: () => this.handleSuccess(),
            error: (response) => this.handleError(response.error),
        });
    }

    private async initializeGame(): Promise<void> {
        if (!this.fileValidatorService.validateGameFile(this.fileContent as string)) {
            this.showErrorDialog(GAME_IMPORTATION_ERROR_TITLE, GAME_IMPORTATION_ERROR_HEADER, this.fileValidatorService.getErrors());
            this.matDialogRef.close();
            return;
        }
        this.game = this.parseGameFile(this.fileContent as string);
        if (!this.game) return;
        await new Promise((resolve) => setTimeout(resolve, IMAGE_LOAD_DELAY));
        this.mapGame = new GameMapEditor(
            this.game.mapSize,
            this.game.mode as GameMode,
            MAP_IMPORT_DIMENSION,
            MAP_IMPORT_DIMENSION,
            this.game.gameMap,
        );
        this.mapEditorService.initialize(this.mapGame, this.canvas);
    }

    private parseGameFile(fileContent: string): Game {
        try {
            const game = JSON.parse(fileContent);
            return {
                gid: '',
                creationDate: new Date(),
                lastEditDate: new Date(),
                isVisible: false,
                mode: game.mode as GameMode,
                name: game.name,
                description: game.description,
                gameMap: game.gameMap,
                mapSize: game.gameMap.length,
                imageBase64: '',
            } as Game;
        } catch (error) {
            return {} as Game;
        }
    }

    private handleError(response: ValidationResponse<Game>): void {
        if (!(response.feedbacks && response.feedbacks.mapFeedback)) return;
        this.showErrorDialog(GAME_REGISTRATION_ERROR_TITLE, GAME_REGISTRATION_ERROR_HEADER, response.feedbacks.errors);
        this.mapEditorService.hightLightNoAccessTiles(response.feedbacks.mapFeedback.blockedSection);
        this.mapEditorService.hightLightInvalidDoors(response.feedbacks.mapFeedback.invalidDoors);
    }

    private handleSuccess(): void {
        this.socketService.send(WsEventServer.GameModified, this.game?.gid);
        this.showSuccessDialog();
        this.matDialogRef.close();
    }

    private showErrorDialog(title: string, message: string, errors: string[]): void {
        const dialogMessage: MessageDialogData = {
            title,
            type: MessageDialogType.Error,
            body: message,
            optionals: errors,
        };
        this.matDialog.open(MessageDialogComponent, { data: dialogMessage });
    }

    private showSuccessDialog(): void {
        this.snackBar.openFromComponent(SnackBarComponent, {
            data: {
                message: GAME_REGISTRATION_SUCCESSFUL_MESSAGE,
            },
            ...SNACK_BAR_PROPERTIES_SET_UP_SUCCESS,
        });
    }

    private resetDialogState(): void {
        this.file = '';
        this.fileContent = '';
        this.game = null;
    }
}
