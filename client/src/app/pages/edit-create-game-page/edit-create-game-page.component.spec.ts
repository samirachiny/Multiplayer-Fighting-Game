/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { MapEditorComponent } from '@app/components/map-editor/map-editor.component';
import { MessageDialogComponent } from '@app/components/message-dialog/message-dialog.component';
import { MessageDialogType } from '@app/enums/message-dialog-type';
import { MessageDialogData } from '@app/interfaces/message-dialog-data';
import { GameService } from '@app/services/game/game.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { Coordinate } from '@common/interfaces/coordinate';
import { Game } from '@common/interfaces/game';
import { GameMapSize, GameMode } from '@common/enums/game-infos';
import { ValidationResponse } from '@common/interfaces/response-infos';
import { of, throwError } from 'rxjs';
import { EditCreateGamePageComponent } from './edit-create-game-page.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { UrlPath } from '@app/enums/url-path';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
    BASE_ERROR_TITLE,
    GAME_IMPORTATION_ERROR_HEADER,
    GAME_REGISTRATION_SUCCESSFUL_MESSAGE,
    NEW_GAME_INVALID_ERROR_HEADER,
    SNACK_BAR_PROPERTIES_SET_UP_SUCCESS,
} from '@app/constants/consts';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { ValidationGameError } from '@common/enums/validation-game-error';
import { ImageService } from '@app/services/image/image.service';
describe('EditCreateGamePageComponent', () => {
    let component: EditCreateGamePageComponent;
    let fixture: ComponentFixture<EditCreateGamePageComponent>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockMapEditorService: jasmine.SpyObj<MapEditorService>;
    let mockMapEditor: jasmine.SpyObj<MapEditorComponent>;
    let mockMatSnackBar: jasmine.SpyObj<MatSnackBar>;
    let mockImageService: jasmine.SpyObj<ImageService>;
    let mockSocketService: any;
    let mockActivatedRoute: any;
    let initializeGameMethod: any;

    const mockGame: Game = {
        gid: '1',
        name: 'Test Game',
        mode: 'Mode',
        mapSize: 3,
        description: '',
        lastEditDate: new Date(),
        creationDate: new Date(),
        imageBase64: '',
        isVisible: true,
        gameMap: [
            [10, 10, 50],
            [10, 10, 50],
            [10, 10, 50],
        ],
    };

    beforeEach(async () => {
        const dialogRefSpyObj = jasmine.createSpyObj({
            afterClosed: of(true),
            close: null,
        });
        mockSocketService = {
            send: jasmine.createSpy('send').and.returnValue(of([])),
        };
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
        mockDialog.open.and.returnValue(dialogRefSpyObj as MatDialogRef<unknown>);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockGameService = jasmine.createSpyObj('GameService', ['addGame', 'editGame', 'getGameById']);
        mockMapEditorService = jasmine.createSpyObj('MapService', ['hightLightNoAccessTiles', 'hightLightInvalidDoors', 'removeHightLightFormTile']);
        mockMatSnackBar = jasmine.createSpyObj('MatSnackBar', ['openFromComponent']);
        mockMapEditor = {
            getCanvas: jasmine.createSpy('getCanvas').and.returnValue({
                nativeElement: {
                    toDataURL: jasmine.createSpy('toDataURL').and.returnValue('base64string'),
                },
            }),
        } as unknown as jasmine.SpyObj<MapEditorComponent>;

        mockActivatedRoute = {
            paramMap: of(new Map([['id', 'create']])),
        };
        mockImageService = jasmine.createSpyObj('ImageService', ['preloadImages']);

        await TestBed.configureTestingModule({
            imports: [EditCreateGamePageComponent, FormsModule, MatDialogModule],
            providers: [
                { provide: MatDialog, useValue: mockDialog },
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                { provide: Router, useValue: mockRouter },
                { provide: GameService, useValue: mockGameService },
                { provide: MapEditorService, useValue: mockMapEditorService },
                { provide: SocketClientService, useValue: mockSocketService },
                { provide: MatSnackBar, useValue: mockMatSnackBar },
                { provide: ImageService, useValue: mockImageService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditCreateGamePageComponent);
        component = fixture.componentInstance;
        component.mapEditor = mockMapEditor;
        component['game'] = mockGame;
        component['oldName'] = '';
        component['oldDescription'] = '';

        initializeGameMethod = (component as any).initializeGame;
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        spyOn<any>(component, 'initializeGame').and.callFake(() => {});
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize the component for new game', async () => {
        component['isNewGame'] = true;
        spyOn(component as any, 'handleNewGame');

        await component.ngOnInit();
        expect(mockImageService.preloadImages).toHaveBeenCalled();
        expect(component['handleNewGame']).toHaveBeenCalled();
    });

    it('should call loadExistingGame when id is present', () => {
        mockActivatedRoute.paramMap = of(new Map([['id', '123']]));
        const spy = spyOn<any>(component, 'loadExistingGame');
        component.init();
        expect(spy).toHaveBeenCalledWith('123');
    });

    it('should return immediately if feedbacks or mapFeedback is not present', () => {
        const response: ValidationResponse<Game> = {
            resource: mockGame,
        };

        spyOn(component as any, 'openErrorDialog');

        component.handleError(response);

        expect((component as any).openErrorDialog).not.toHaveBeenCalled();
        expect(mockMapEditorService.hightLightNoAccessTiles).not.toHaveBeenCalled();
        expect(mockMapEditorService.hightLightInvalidDoors).not.toHaveBeenCalled();
    });

    it('should call openErrorDialog and hightLight methods when mapFeedback is present', () => {
        const response: ValidationResponse<Game> = {
            resource: mockGame,
            feedbacks: {
                errors: [ValidationGameError.MissingDescription],
                mapFeedback: {
                    mapStatus: false,
                    blockedSection: [{ x: 1, y: 1 }],
                    invalidDoors: [{ x: 2, y: 2 }],
                    excessTiles: 0,
                    areItemsPlaced: true,
                },
            },
        };
        const blockedSection = response.feedbacks?.mapFeedback?.blockedSection;
        const invalidDoors = response.feedbacks?.mapFeedback?.invalidDoors;

        spyOn(component as any, 'openErrorDialog');

        component.handleError(response);
        expect((component as any).openErrorDialog).toHaveBeenCalledWith(GAME_IMPORTATION_ERROR_HEADER, response);

        expect(mockMapEditorService.hightLightNoAccessTiles).toHaveBeenCalledWith(blockedSection as Coordinate[]);
        expect(mockMapEditorService.hightLightInvalidDoors).toHaveBeenCalledWith(invalidDoors as Coordinate[]);
    });

    it("should handle don't new game if data is invalid", () => {
        spyOn(sessionStorage, 'getItem').and.returnValue(JSON.stringify({ data: 'nothing' }));
        component['initializeGame'] = initializeGameMethod;
        spyOn(component as any, 'initializeGame').and.callThrough();
        component['handleNewGame']();
        expect(component['initializeGame']).not.toHaveBeenCalled();
    });

    it('should handle new game initialization', () => {
        spyOn(sessionStorage, 'getItem').and.returnValue(JSON.stringify({ size: GameMapSize.Large, mode: GameMode.Classic }));
        component['initializeGame'] = initializeGameMethod;
        spyOn(component as any, 'initializeGame').and.callThrough();
        component['handleNewGame']();
        expect(component['initializeGame']).toHaveBeenCalled();
    });

    it("should handle don't new game if data is invalid", () => {
        spyOn(sessionStorage, 'getItem').and.returnValue(JSON.stringify({ size: 'nothing', mode: 'nothing' }));
        component['initializeGame'] = initializeGameMethod;
        spyOn(component as any, 'initializeGame').and.callThrough();
        component['handleNewGame']();
        expect(component['initializeGame']).not.toHaveBeenCalled();
    });

    it("should handle don't new game if data is invalid", () => {
        spyOn(sessionStorage, 'getItem').and.returnValue(JSON.stringify({ size: 'nothing', mode: GameMode.Classic }));
        component['initializeGame'] = initializeGameMethod;
        spyOn(component as any, 'initializeGame').and.callThrough();
        component['handleNewGame']();
        expect(component['initializeGame']).not.toHaveBeenCalled();
    });

    it('should call openErrorDialog when dataString is not defined', () => {
        spyOn(sessionStorage, 'getItem').and.returnValue(null);
        const openErrorDialogSpy = spyOn<any>(component, 'openErrorDialog');

        component['handleNewGame']();

        expect(openErrorDialogSpy).toHaveBeenCalledWith(NEW_GAME_INVALID_ERROR_HEADER, null);
        expect(component.isLoading).toBeTrue();
    });

    it('should handle game creation with valid form', async () => {
        const mockForm: NgForm = { valid: true } as NgForm;
        const response: ValidationResponse<Game> = {
            resource: mockGame,
        };
        mockGameService.addGame.and.returnValue(of(response as ValidationResponse<Game>));
        component['isNewGame'] = true;

        component.handleSaveGame(mockForm);

        expect(mockGameService.addGame).toHaveBeenCalledWith(component['game']);
        fixture.whenStable().then(() => {
            expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Admin]);
        });
    });

    it('should not handle game creation with invalid form', () => {
        const mockForm: NgForm = { valid: false } as NgForm;
        component.handleSaveGame(mockForm);
        expect(mockGameService.addGame).not.toHaveBeenCalled();
    });

    it('should handle game update with valid form', async () => {
        const mockForm: NgForm = { valid: true } as NgForm;
        component['game'] = mockGame;
        component['isNewGame'] = false;
        const response: ValidationResponse<Game> = {
            resource: mockGame,
        };

        mockGameService.editGame.and.returnValue(of(response as ValidationResponse<Game>));

        component.handleSaveGame(mockForm);

        await fixture.whenStable();

        expect(mockGameService.editGame).toHaveBeenCalledWith(component['game']);
        expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Admin]);
    });

    it('should handle game update failure', () => {
        component['game'] = mockGame;
        const errorResponse = { error: { message: 'Error' } };
        mockGameService.editGame.and.returnValue(throwError(() => errorResponse));

        component['isNewGame'] = false;
        component.handleSaveGame({ valid: true } as NgForm);
        expect(mockGameService.editGame).toHaveBeenCalled();
    });

    it('should handle successful game creation', async () => {
        const response = {};
        mockGameService.addGame.and.returnValue(of(response as ValidationResponse<Game>));
        component['isNewGame'] = true;
        component.handleSaveGame({ valid: true } as NgForm);
        expect(mockGameService.addGame).toHaveBeenCalled();
        fixture.whenStable().then(() => {
            expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Admin]);
        });
    });

    it('should load an existing game and initialize the game', async () => {
        mockActivatedRoute.paramMap = of(new Map([['id', '1']]));
        mockGameService.getGameById.and.returnValue(of(mockGame));
        component['loadExistingGame']('1');
        expect(mockGameService.getGameById).toHaveBeenCalledWith('1');
        fixture.whenStable().then(() => {
            expect(component.isLoading).toBeFalse();
        });
    });

    it('should handle error while loading an existing game', () => {
        const errorResponse = { error: { message: 'Error' } };
        mockActivatedRoute.paramMap = of(new Map([['id', '1']]));
        mockGameService.getGameById.and.returnValue(throwError(() => errorResponse));

        component['loadExistingGame']('1');
        expect(mockGameService.getGameById).toHaveBeenCalledWith('1');
        expect(mockDialog.open).toHaveBeenCalled();
    });

    it('should open a success dialog after successful game creation', () => {
        component['openSuccessDialog']();
        expect(mockMatSnackBar.openFromComponent).toHaveBeenCalledWith(SnackBarComponent, {
            data: {
                message: GAME_REGISTRATION_SUCCESSFUL_MESSAGE,
            },
            ...SNACK_BAR_PROPERTIES_SET_UP_SUCCESS,
        });
    });

    it('should open an error dialog when an error occurs', () => {
        component['openErrorDialog']('Test Error', null);
        expect(mockDialog.open).toHaveBeenCalled();
    });

    it('should navigate back to admin when onBack is called', () => {
        component.onBack();
        expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Admin]);
    });

    it('should open cancel confirmation dialog', () => {
        component.onOpenCancelConfirmation();
        expect(mockDialog.open).toHaveBeenCalled();
    });

    it('should handle map changes', () => {
        component['game'] = mockGame;
        const newMap = [
            [0, 1],
            [1, 0],
        ];
        component.onMapChanged(newMap);
        expect(component['game'].gameMap).toEqual(newMap);
    });

    it('should prevent default behavior on drag event', () => {
        const mockEvent = new DragEvent('drop');
        spyOn(mockEvent, 'preventDefault');

        component.onDropInput(mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should call openSuccessDialog on successful game creation', () => {
        const response = {};
        mockGameService.addGame.and.returnValue(of(response as ValidationResponse<Game>));
        spyOn(component as any, 'openSuccessDialog');
        component.handleCreateGame();
        expect(mockGameService.addGame).toHaveBeenCalledWith(component['game']);
        expect((component as any).openSuccessDialog).toHaveBeenCalled();
    });

    it('should call handleError on game creation failure', () => {
        const errorResponse = { error: { message: 'Error' } };
        mockGameService.addGame.and.returnValue(throwError(() => errorResponse));
        spyOn(component as any, 'handleError');

        component.handleCreateGame();

        expect(mockGameService.addGame).toHaveBeenCalledWith(component['game']);
        expect((component as any).handleError).toHaveBeenCalledWith(errorResponse.error);
    });

    it('should open the dialog and redirect to /admin', () => {
        component['openSuccessDialog']();
        expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Admin]);
    });

    it('should open the dialog and set isGameSubmitted to false when redirectToAdmin is false', () => {
        const mockDialogMessage: MessageDialogData = {
            type: MessageDialogType.Error,
            title: 'Test Title',
            body: 'Test Body',
            optionals: ['Some optional data'],
        };

        const dialogRefSpy = jasmine.createSpyObj({ afterClosed: of(true) });
        mockDialog.open.and.returnValue(dialogRefSpy);

        component.isGameSubmitted = true;
        component['openInformationDialog'](mockDialogMessage);

        expect(mockDialog.open).toHaveBeenCalledWith(MessageDialogComponent, {
            data: {
                type: mockDialogMessage.type,
                title: mockDialogMessage.title,
                body: mockDialogMessage.body,
                optionals: mockDialogMessage.optionals,
            },
        });

        fixture.whenStable().then(() => {
            expect(component.isGameSubmitted).toBeFalse();
            // expect(mockRouter.navigate).not.toHaveBeenCalled();
        });
    });

    it('should open the confirmation dialog and call onBack when agreed', () => {
        const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
        mockDialog.open.and.returnValue(dialogRefSpy);

        const onBackSpy = spyOn(component, 'onBack');

        component.onOpenCancelConfirmation();

        expect(mockDialog.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
            data: {
                title: 'Confirmation Annulation',
                body: 'Voulez-vous vraiment annuler les modifications apportées au jeu',
                onAgreed: jasmine.any(Function),
            },
        });

        // eslint-disable-next-line @typescript-eslint/ban-types
        const dialogData = mockDialog.open.calls.mostRecent().args[1]?.data as { onAgreed: Function };
        dialogData?.onAgreed();
        expect(onBackSpy).toHaveBeenCalled();
    });

    describe('openErrorDialog', () => {
        let openInformationDialogSpy: jasmine.Spy;

        beforeEach(() => {
            openInformationDialogSpy = spyOn(component as any, 'openInformationDialog');
        });

        it('should call openInformationDialog with correct parameters when response is null', () => {
            const message = 'Test error message';
            const expectedDialogData: MessageDialogData = {
                title: BASE_ERROR_TITLE,
                type: MessageDialogType.Error,
                body: message,
                optionals: [],
            };

            component['openErrorDialog'](message, null);

            expect(openInformationDialogSpy).toHaveBeenCalledWith(expectedDialogData);
        });

        it('should call openInformationDialog with correct parameters when response is undefined', () => {
            const message = 'Test error message';
            const expectedDialogData: MessageDialogData = {
                title: BASE_ERROR_TITLE,
                type: MessageDialogType.Error,
                body: message,
                optionals: [],
            };

            component['openErrorDialog'](message, null);

            expect(openInformationDialogSpy).toHaveBeenCalledWith(expectedDialogData);
        });

        it('should call openInformationDialog with correct parameters when response.feedbacks is undefined', () => {
            const message = 'Test error message';
            const response: ValidationResponse<Game> = {} as ValidationResponse<Game>;
            const expectedDialogData: MessageDialogData = {
                title: BASE_ERROR_TITLE,
                type: MessageDialogType.Error,
                body: message,
                optionals: [],
            };

            component['openErrorDialog'](message, response);

            expect(openInformationDialogSpy).toHaveBeenCalledWith(expectedDialogData);
        });

        it('should call openInformationDialog with correct parameters when response.feedbacks.errors is undefined', () => {
            const message = 'Test error message';
            const errors = [] as ValidationGameError[];
            const response: ValidationResponse<Game> = { resource: {} as Game, feedbacks: { errors } };
            const expectedDialogData: MessageDialogData = {
                title: BASE_ERROR_TITLE,
                type: MessageDialogType.Error,
                body: message,
                optionals: [],
            };

            component['openErrorDialog'](message, response);

            expect(openInformationDialogSpy).toHaveBeenCalledWith(expectedDialogData);
        });

        it('should call openInformationDialog with correct parameters when response.feedbacks.errors is defined', () => {
            const message = 'Test error message';
            const errors = [] as ValidationGameError[];
            const response: ValidationResponse<Game> = { resource: {} as Game, feedbacks: { errors } };
            const expectedDialogData: MessageDialogData = {
                title: BASE_ERROR_TITLE,
                type: MessageDialogType.Error,
                body: message,
                optionals: errors,
            };

            component['openErrorDialog'](message, response);

            expect(openInformationDialogSpy).toHaveBeenCalledWith(expectedDialogData);
        });

        it('should reinitialize game when press on reinitiliaze game', () => {
            component['isNewGame'] = true;
            component.onMapReset(mockGame.gameMap);
            expect(component.name).toEqual('');
            expect(component.description).toEqual('');
            expect(component['game'].gameMap).toEqual(mockGame.gameMap);

            mockGameService.getGameById.and.returnValue(of(mockGame));
            component['loadExistingGame']('testId');
            component['isNewGame'] = false;
            component.onMapReset(mockGame.gameMap);
            expect(component.name).toEqual(mockGame.name);
            expect(component.description).toEqual(mockGame.description);
            expect(component['game'].gameMap).toEqual(mockGame.gameMap);
        });
    });
});
