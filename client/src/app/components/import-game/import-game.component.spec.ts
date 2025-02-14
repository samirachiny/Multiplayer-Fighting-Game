/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportGameComponent } from './import-game.component';
import { GameService } from '@app/services/game/game.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { Game } from '@common/interfaces/game';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { GameFileValidatorService } from '@app/services/game-file-validator/game-file-validator.service';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventServer } from '@common/enums/web-socket-event';
import { MessageDialogComponent } from '@app/components/message-dialog/message-dialog.component';
import { MessageDialogType } from '@app/enums/message-dialog-type';
import { ValidationResponse } from '@common/interfaces/response-infos';
import { NgForm } from '@angular/forms';
import { GameMode } from '@common/enums/game-infos';
import { ElementRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import {
    GAME_IMPORTATION_ERROR_HEADER,
    GAME_IMPORTATION_ERROR_TITLE,
    GAME_REGISTRATION_ERROR_HEADER,
    GAME_REGISTRATION_ERROR_TITLE,
    GAME_REGISTRATION_SUCCESSFUL_MESSAGE,
    SNACK_BAR_PROPERTIES_SET_UP_SUCCESS,
} from '@app/constants/consts';

describe('ImportGameComponent', () => {
    let component: ImportGameComponent;
    let fixture: ComponentFixture<ImportGameComponent>;
    let gameService: jasmine.SpyObj<GameService>;
    let matDialog: jasmine.SpyObj<MatDialog>;
    let mapEditorService: jasmine.SpyObj<MapEditorService>;
    let fileValidatorService: jasmine.SpyObj<GameFileValidatorService>;
    let socketService: jasmine.SpyObj<SocketClientService>;
    let matDialogRef: jasmine.SpyObj<MatDialogRef<HTMLDivElement>>;
    let mockMatSnackBar: jasmine.SpyObj<MatSnackBar>;
    const mockCanvasElement = document.createElement('canvas');
    const mockCanvasRef: ElementRef<HTMLCanvasElement> = new ElementRef(mockCanvasElement);

    beforeEach(async () => {
        gameService = jasmine.createSpyObj('GameService', ['addGame']);
        matDialog = jasmine.createSpyObj('MatDialog', ['open']);
        mapEditorService = jasmine.createSpyObj('MapEditorService', ['initialize', 'hightLightNoAccessTiles', 'hightLightInvalidDoors']);
        fileValidatorService = jasmine.createSpyObj('GameFileValidatorService', ['validateGameFile', 'getErrors']);
        socketService = jasmine.createSpyObj('SocketClientService', ['send']);
        mockMatSnackBar = jasmine.createSpyObj('MatSnackBar', ['openFromComponent']);

        await TestBed.configureTestingModule({
            imports: [ImportGameComponent],
            providers: [
                { provide: GameService, useValue: gameService },
                { provide: MatDialog, useValue: matDialog },
                { provide: MapEditorService, useValue: mapEditorService },
                { provide: GameFileValidatorService, useValue: fileValidatorService },
                { provide: SocketClientService, useValue: socketService },
                { provide: MatSnackBar, useValue: mockMatSnackBar },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ImportGameComponent);
        component = fixture.componentInstance;
        matDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        component.canvas = mockCanvasRef;
        component['matDialogRef'] = matDialogRef;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should open dialog and reset state', () => {
        component.openDialog();
        expect(component.file).toBe('');
        expect(component['fileContent']).toBe('');
        expect(component.game).toBeNull();
        expect(matDialog.open).toHaveBeenCalled();
    });
    describe('onFileChange', () => {
        it('should read the file and initialize the game', () => {
            const mockFileReader = {
                onload: null,
                readAsText: jasmine.createSpy('readAsText'),
            };
            spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);
            const mockEvent = {
                target: {
                    files: [new Blob(['file content'], { type: 'text/plain' })],
                },
            } as unknown as Event;
            spyOn(component as any, 'initializeGame');
            component.onFileChange(mockEvent);
            (mockFileReader as any).onload({
                target: {
                    result: 'file content',
                },
            });
            expect(component['fileContent']).toBe('file content');
            expect(component['initializeGame']).toHaveBeenCalled();
        });
        it('should not read file and initialize the game if no file', () => {
            const mockFileReader = {
                onload: null,
                readAsText: jasmine.createSpy('readAsText'),
            };
            spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);
            const mockEvent = {
                target: {
                    files: undefined,
                },
            } as unknown as Event;
            spyOn(component as any, 'initializeGame');
            component.onFileChange(mockEvent);
            expect(component['initializeGame']).not.toHaveBeenCalled();
        });
    });

    it('should initializeGame initialize the canvas and game', async () => {
        const mockGame: Game = {
            gid: '1',
            name: 'Test Game',
            mode: GameMode.Classic,
            mapSize: 10,
            description: '',
            imageBase64: '',
            isVisible: false,
            lastEditDate: new Date(),
            creationDate: new Date(),
            gameMap: [],
        };
        fileValidatorService.validateGameFile.and.returnValue(true);

        fileValidatorService.getErrors.and.returnValue(['Invalid file format']);
        spyOn(component as any, 'parseGameFile').and.returnValue(mockGame);

        await component['initializeGame']();

        expect(fileValidatorService.validateGameFile).toHaveBeenCalled();
        expect(component['parseGameFile']).toHaveBeenCalled();
        expect(mapEditorService.initialize).toHaveBeenCalledWith((component as any).mapGame, component['canvas']);
    });
    it('should initializeGame not initialize the canvas and game if no game', async () => {
        fileValidatorService.validateGameFile.and.returnValue(true);

        fileValidatorService.getErrors.and.returnValue(['Invalid file format']);
        spyOn(component as any, 'parseGameFile').and.returnValue(undefined);

        await component['initializeGame']();

        expect(fileValidatorService.validateGameFile).toHaveBeenCalled();
        expect(component['parseGameFile']).toHaveBeenCalled();
        expect(mapEditorService.initialize).not.toHaveBeenCalled();
    });
    it('should initializeGame show error dialog on invalid file', async () => {
        fileValidatorService.validateGameFile.and.returnValue(false);

        await component['initializeGame']();

        expect(fileValidatorService.validateGameFile).toHaveBeenCalled();
        expect(matDialogRef.close).toHaveBeenCalled();
        expect(matDialog.open).toHaveBeenCalledWith(MessageDialogComponent, {
            data: {
                type: MessageDialogType.Error,
                title: GAME_IMPORTATION_ERROR_TITLE,
                body: GAME_IMPORTATION_ERROR_HEADER,
                optionals: undefined,
            },
        });
    });
    it('should not import game if form is not valid', () => {
        const mockGame: Game = {
            gid: '1',
            name: 'Test Game',
            mode: GameMode.Classic,
            mapSize: 10,
            description: '',
            imageBase64: '',
            isVisible: false,
            lastEditDate: new Date(),
            creationDate: new Date(),
            gameMap: [],
        };
        component.game = mockGame;
        component.file = 'test-file';
        gameService.addGame.and.returnValue(of({ ressource: mockGame } as any));

        component.onImportGame({ valid: false } as NgForm);

        expect(gameService.addGame).not.toHaveBeenCalled();
        expect(socketService.send).not.toHaveBeenCalled();
        expect(matDialog.open).not.toHaveBeenCalled();
        expect(matDialogRef.close).not.toHaveBeenCalled();
    });
    it('should not import game if no game', () => {
        const mockGame: Game = {
            gid: '1',
            name: 'Test Game',
            mode: GameMode.Classic,
            mapSize: 10,
            description: '',
            imageBase64: '',
            isVisible: false,
            lastEditDate: new Date(),
            creationDate: new Date(),
            gameMap: [],
        };
        component.game = undefined as any;
        component.file = 'test-file';
        gameService.addGame.and.returnValue(of({ ressource: mockGame } as any));

        component.onImportGame({ valid: true } as NgForm);

        expect(gameService.addGame).not.toHaveBeenCalled();
        expect(socketService.send).not.toHaveBeenCalled();
        expect(matDialog.open).not.toHaveBeenCalled();
        expect(matDialogRef.close).not.toHaveBeenCalled();
    });
    it('should handle import game and show success dialog', () => {
        const mockGame: Game = {
            gid: '1',
            name: 'Test Game',
            mode: GameMode.Classic,
            mapSize: 10,
            description: '',
            imageBase64: '',
            isVisible: false,
            lastEditDate: new Date(),
            creationDate: new Date(),
            gameMap: [],
        };
        component.game = mockGame;
        component.file = 'test-file';
        const showSuccessDialogSpy = spyOn(component as any, 'showSuccessDialog');
        gameService.addGame.and.returnValue(of({ ressource: mockGame } as any));
        component.onImportGame({ valid: true } as NgForm);

        expect(gameService.addGame).toHaveBeenCalled();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.GameModified, mockGame.gid);
        expect(showSuccessDialogSpy).toHaveBeenCalled();
        expect(matDialogRef.close).toHaveBeenCalled();
    });

    it('should handle import game and show error dialog on error', () => {
        const mockGame: Game = {
            gid: '1',
            name: 'Test Game',
            mode: GameMode.Classic,
            mapSize: 10,
            description: '',
            imageBase64: '',
            isVisible: false,
            lastEditDate: new Date(),
            creationDate: new Date(),
            gameMap: [],
        };
        component.game = mockGame;
        component.file = 'test-file';
        const errorResponse = { error: { message: 'Error' } };
        spyOn(component as any, 'handleError').and.callThrough();
        gameService.addGame.and.returnValue(throwError(() => errorResponse));

        component.onImportGame({ valid: true } as NgForm);

        expect(gameService.addGame).toHaveBeenCalled();
        expect((component as any).handleError).toHaveBeenCalledWith(errorResponse.error);
    });

    it('should parse game file correctly', () => {
        const fileContent = '{"name": "Test Game", "mode": "Classic", "description": "Test Description", "gameMap": []}';
        const parsedGame = component['parseGameFile'](fileContent);

        expect(parsedGame.name).toBe('Test Game');
        expect(parsedGame.mode).toBe(GameMode.Classic);
        expect(parsedGame.description).toBe('Test Description');
        expect(parsedGame.gameMap).toEqual([]);
    });
    it('should not parse game file on error', () => {
        spyOn(JSON, 'parse').and.throwError('Invalid JSON');
        const parsedGame = component['parseGameFile']('');

        expect(parsedGame).toEqual(Object({}));
    });
    it('should handle error correctly', () => {
        const errorResponse: ValidationResponse<Game> = {
            feedbacks: { errors: ['Error'], mapFeedback: { blockedSection: [], invalidDoors: [] } },
        } as any;

        component['handleError'](errorResponse);

        expect(matDialog.open).toHaveBeenCalledWith(MessageDialogComponent, {
            data: {
                title: GAME_REGISTRATION_ERROR_TITLE,
                type: MessageDialogType.Error,
                body: GAME_REGISTRATION_ERROR_HEADER,
                optionals: ['Error'],
            },
        });
        expect(mapEditorService.hightLightNoAccessTiles).toHaveBeenCalled();
        expect(mapEditorService.hightLightInvalidDoors).toHaveBeenCalled();
    });
    it('should show error dialog correctly', () => {
        const errors = ['Error 1', 'Error 2'];
        component['showErrorDialog']('Error Title', 'Error Message', errors);

        expect(matDialog.open).toHaveBeenCalledWith(MessageDialogComponent, {
            data: {
                title: 'Error Title',
                type: MessageDialogType.Error,
                body: 'Error Message',
                optionals: errors,
            },
        });
    });

    it('should show success dialog correctly', () => {
        component['showSuccessDialog']();
        expect(mockMatSnackBar.openFromComponent).toHaveBeenCalledWith(SnackBarComponent, {
            data: {
                message: GAME_REGISTRATION_SUCCESSFUL_MESSAGE,
            },
            ...SNACK_BAR_PROPERTIES_SET_UP_SUCCESS,
        });
    });

    it('should reset dialog state correctly', () => {
        component.file = 'test-file';
        component['fileContent'] = 'test-content';
        component.game = { gid: '1' } as Game;

        component['resetDialogState']();

        expect(component.file).toBe('');
        expect(component['fileContent']).toBe('');
        expect(component.game).toBeNull();
    });
});
