/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-unused-vars */
/* eslint-disable @angular-eslint/component-class-suffix */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog, MatDialogConfig, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { CreateCharacterComponent } from './create-character-page.component';
import { BASE_ATTRIBUTE_VALUE, FeedbacksMessages, MESSAGE_DIALOG, GAME_KEY, SNACK_BAR_PROPERTIES_SET_UP_ERROR } from '@app/constants/consts';
import { MessageDialogComponent } from '@app/components/message-dialog/message-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Dice } from '@common/enums/dice';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { NO_ERRORS_SCHEMA, Component, TemplateRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { UrlPath } from '@app/enums/url-path';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { PreviousPage } from '@app/enums/previous-page';
import { Character } from '@common/interfaces/character';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-data';
import { ComponentType } from '@angular/cdk/portal';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { CHARACTERS } from '@common/constants/character';

class SocketClientServiceMock extends SocketClientService {
    override connect() {}
    // eslint-disable-next-line @typescript-eslint/ban-types
    override off(event: string, callback?: Function) {}
}
@Component({
    selector: 'app-header',
    template: '',
    standalone: true,
})
class HeaderComponentStub {}

@Component({
    selector: 'app-character-list',
    template: '',
    standalone: true,
})
class CharacterListComponentStub {}

describe('CreateCharacterComponent', () => {
    let component: CreateCharacterComponent;
    let fixture: ComponentFixture<CreateCharacterComponent>;
    let mockSocketService: SocketClientServiceMock;
    let mockMatDialog: jasmine.SpyObj<MatDialog>;
    let mockMatDialogRef: jasmine.SpyObj<MatDialogRef<MessageDialogComponent>>;
    let mockMatSnackBar: jasmine.SpyObj<MatSnackBar>;
    let mockMatSnackBarRef: jasmine.SpyObj<MatSnackBarRef<SnackBarComponent>>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockNavigationCheck: jasmine.SpyObj<NavigationCheckService>;
    let socketHelper: SocketTestHelper;

    beforeEach(async () => {
        mockNavigationCheck = jasmine.createSpyObj('NavigationCheckService', [], {
            isNotFromCreateOrJoinParty: false, // Retourne false pour couvrir la ligne
        });
        mockSocketService = new SocketClientServiceMock();
        socketHelper = new SocketTestHelper();
        mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockSocketService['socket'] = socketHelper as any;
        mockMatDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
        mockMatSnackBar = jasmine.createSpyObj('MatSnackBar', ['openFromComponent']);
        mockMatSnackBarRef = jasmine.createSpyObj('MatSnackBarRef<SnackBarComponent>', ['openFromComponent']);
        mockMatDialogRef.afterClosed.and.returnValue(of(true));
        mockMatDialog.open.and.returnValue(mockMatDialogRef);
        mockMatSnackBar.openFromComponent.and.returnValue(mockMatSnackBarRef);
        mockNavigationCheck = jasmine.createSpyObj('NavigationCheckService', [
            'isNotFromCreateOrJoinParty',
            'setToCreateCharacter',
            'isFromCreateParty',
        ]);
        await TestBed.configureTestingModule({
            imports: [
                CreateCharacterComponent,
                MatDialogModule,
                MatTooltipModule,
                FormsModule,
                MatCardModule,
                RouterLink,
                HeaderComponentStub,
                CharacterListComponentStub,
                ConfirmationDialogComponent,
            ],
            providers: [
                { provide: SocketClientService, useValue: mockSocketService },
                { provide: NavigationCheckService, useValue: mockNavigationCheck },
                { provide: MatDialog, useValue: mockMatDialog },
                { provide: MatSnackBar, useValue: mockMatSnackBar },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({})),
                    },
                },
                { provide: Router, useValue: mockRouter },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateCharacterComponent);
        component = fixture.componentInstance;
        spyOn<any>(component, 'leaveParty').and.callThrough();
        spyOn<any>(component, 'openRetryDialog').and.callThrough();
        spyOn<any>(component, 'openMessageDialog').and.callThrough();
        spyOn<any>(mockSocketService, 'on').and.callThrough();
        spyOn<any>(mockSocketService, 'off').and.callThrough();
        spyOn<any>(mockSocketService, 'send').and.callThrough();
    });

    describe('When gameId exists in sessionStorage', () => {
        beforeEach(() => {
            sessionStorage.clear();
            sessionStorage.setItem(GAME_KEY, 'test-game-id');
        });

        afterEach(() => {
            sessionStorage.clear();
            fixture.destroy();
            TestBed.resetTestingModule();
            if (component.ngOnDestroy) {
                component.ngOnDestroy(); // Appelle ngOnDestroy pour s'assurer que les abonnements sont nettoyés
            }
        });

        it('should create', () => {
            expect(component).toBeTruthy();
        });

        describe('ngOnInit', () => {
            it('should initialize with default character and game id', () => {
                expect(component.characterSelected).toEqual(CHARACTERS[0]);
            });
        });

        it('should correctly increase life or speed attribute', () => {
            component.onIncreaseAttribute('life');
            expect(component.player.life).toBe(BASE_ATTRIBUTE_VALUE + 2);
            expect(component.player.speed).toBe(BASE_ATTRIBUTE_VALUE);

            component.onIncreaseAttribute('speed');
            expect(component.player.speed).toBe(BASE_ATTRIBUTE_VALUE + 2);
            expect(component.player.life).toBe(BASE_ATTRIBUTE_VALUE);
        });

        it('should correctly determine if the player is personalized', () => {
            component.player.name = 'Test Player';
            component.player.diceAssignment = { attack: Dice.D4, defense: Dice.D6 };
            component.player.life = BASE_ATTRIBUTE_VALUE + 2;

            const isNotPersonalized = component['isNotPlayerPersonalized'];
            expect(isNotPersonalized).toBeFalse();
        });

        it('should return appropriate feedback messages', () => {
            const feedbacks = (component as any).buildFeedback();
            expect(feedbacks).toEqual([
                FeedbacksMessages.ShouldAssignDice,
                FeedbacksMessages.ShouldUpgradeLifeOrSpeed,
                FeedbacksMessages.ShouldAddPlayerName,
            ]);
        });

        it('should open message dialog if player is not personalized', () => {
            component.player.name = '';
            component.joinParty();
            expect(mockMatDialog.open).toHaveBeenCalledWith(MessageDialogComponent, {
                data: {
                    ...MESSAGE_DIALOG.customAvatarIssues,
                    optionals: [
                        FeedbacksMessages.ShouldAssignDice,
                        FeedbacksMessages.ShouldUpgradeLifeOrSpeed,
                        FeedbacksMessages.ShouldAddPlayerName,
                    ],
                },
            });
        });

        it('should set the selected character', () => {
            expect(component.characterSelected).toEqual(CHARACTERS[0]);
        });

        it('should open dialog if game modified is the selectedGame', () => {
            const openInformationDialogSpy = spyOn(component as any, 'openInformationDialog');
            spyOn<any>(component, 'openDialogIfGameNotAvailable').and.callThrough();
            const mockNewUpdatedGameId = 'test-game-id';
            component['openDialogIfGameNotAvailable'](mockNewUpdatedGameId);
            expect(component['openDialogIfGameNotAvailable']).toHaveBeenCalledWith(mockNewUpdatedGameId);
            expect(openInformationDialogSpy).toHaveBeenCalledWith(MESSAGE_DIALOG.gameNotAvailable.body);
        });

        it('should not open dialog if game is found and is visible', () => {
            // Appel de la méthode avec un gid qui ne correspond pas au gameId de sessionStorage
            component['openDialogIfGameNotAvailable']('another-game-id');
            const openInformationDialogSpy = spyOn(component as any, 'openInformationDialog');
            // Vérifier que la boîte de dialogue n'a pas été ouverte
            expect(openInformationDialogSpy).not.toHaveBeenCalled();
        });

        describe('Tests for sockets events', () => {
            it('should set up GAME_MODIFIED listener if gameId exists in sessionStorage', () => {
                (mockNavigationCheck as any).isFromCreateParty = true;
                component['configureSocketService']();
                expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.GameModified, jasmine.any(Function));
                expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.PartyLocked, jasmine.any(Function));
                expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.PartyFull, jasmine.any(Function));
                expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.PartyEnd, jasmine.any(Function));
            });

            it('should handle PARTY_LOCKED event by leaving party and opening retry dialog', () => {
                component['configureSocketService']();
                socketHelper.peerSideEmit(WsEventClient.PartyLocked);
                expect((component as any).leaveParty).toHaveBeenCalled();
                expect((component as any).openRetryDialog).toHaveBeenCalledWith({
                    ...MESSAGE_DIALOG.partyLocked,
                    onAgreed: jasmine.any(Function),
                    onRefused: jasmine.any(Function),
                });
            });

            it('should handle PARTY_END event by leaving party, opening message dialog, and navigating home after dialog closes', fakeAsync(() => {
                const openInformationDialogSpy = spyOn(component as any, 'openInformationDialog');
                component['configureSocketService']();
                socketHelper.peerSideEmit(WsEventClient.PartyEnd);
                tick();
                expect((component as any).leaveParty).toHaveBeenCalled();
                expect(openInformationDialogSpy).toHaveBeenCalledWith(MESSAGE_DIALOG.partyCancelled.body);
                expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Home]);
            }));

            it('should handle PARTY_FULL event by leaving party, opening message dialog, and navigating home after dialog closes', fakeAsync(() => {
                const openInformationDialogSpy = spyOn(component as any, 'openInformationDialog');
                component['configureSocketService']();
                socketHelper.peerSideEmit(WsEventClient.PartyFull);
                tick();
                expect((component as any).leaveParty).toHaveBeenCalled();
                expect(openInformationDialogSpy).toHaveBeenCalledWith(MESSAGE_DIALOG.partyPlayersFull.body);
                expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Home]);
            }));
            it('should call openDialogIfGameNotAvailable when GAME_MODIFIED event is received', () => {
                const openInformationDialogSpy = spyOn(component as any, 'openInformationDialog');
                spyOn<any>(component, 'openDialogIfGameNotAvailable').and.callThrough();
                (mockNavigationCheck as any).isFromCreateParty = true;
                component['configureSocketService']();
                sessionStorage.setItem(GAME_KEY, 'test-game-id');
                socketHelper.peerSideEmit(WsEventServer.GameModified, 'test-game-id');
                expect(component['openDialogIfGameNotAvailable']).toHaveBeenCalledWith('test-game-id');
                expect(openInformationDialogSpy).toHaveBeenCalledWith(MESSAGE_DIALOG.gameNotAvailable.body);
            });
        });
    });

    describe('When gameId does not exist in sessionStorage', () => {
        it('should not subscribe to GAME_MODIFIED listener if gameId does not exist', () => {
            sessionStorage.removeItem(GAME_KEY);
            (mockNavigationCheck as any).isFromCreateParty = false;
            component['configureSocketService']();
            expect(mockSocketService.on).not.toHaveBeenCalledWith(WsEventClient.GameModified, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.PartyLocked, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.PartyFull, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.PartyEnd, jasmine.any(Function));
        });
    });

    describe('General Tests', () => {
        it('should call configureSocketService when isNotFromCreateOrJoinParty is false', () => {
            // Arrange
            // Espionner la méthode privée configureSocketService
            const configureSocketServiceSpy = spyOn<any>(CreateCharacterComponent.prototype, 'configureSocketService').and.callThrough();
            (mockNavigationCheck as any).isNotFromCreateOrJoinParty = false;
            // Act
            fixture = TestBed.createComponent(CreateCharacterComponent);
            component = fixture.componentInstance;

            // Assert
            expect(configureSocketServiceSpy).toHaveBeenCalled();
        });

        it('should prevent default behavior on drag event', () => {
            const mockEvent = new DragEvent('drop');
            spyOn(mockEvent, 'preventDefault');

            component.blockDrop(mockEvent);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        it('should send leave party message when leaveParty is called', () => {
            component['leaveParty']();
            expect(mockSocketService.send).toHaveBeenCalledWith(WsEventServer.LeaveParty, mockNavigationCheck.isFromCreateParty);
        });

        it('should subscribe to WebSocket events in constructor', () => {
            sessionStorage.setItem(GAME_KEY, '1234');
            (mockNavigationCheck as any).isFromCreateParty.and.returnValue(true);
            component['configureSocketService']();
            expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.GameModified, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.PartyLocked, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.PartyFull, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(WsEventClient.PartyEnd, jasmine.any(Function));
        });

        it('should clean up in ngOnDestroy', () => {
            const offSpy = mockSocketService.off;

            component.ngOnDestroy();

            expect(offSpy).toHaveBeenCalledWith(WsEventServer.GameModified);
            expect(offSpy).toHaveBeenCalledWith(WsEventClient.PartyLocked);
            expect(offSpy).toHaveBeenCalledWith(WsEventClient.PartyFull);
            expect(offSpy).toHaveBeenCalledWith(WsEventClient.PartyEnd);
        });

        it('should call buildFeedback correctly', () => {
            const feedbacks = (component as any).buildFeedback();
            expect(feedbacks).toEqual([
                FeedbacksMessages.ShouldAssignDice,
                FeedbacksMessages.ShouldUpgradeLifeOrSpeed,
                FeedbacksMessages.ShouldAddPlayerName,
            ]);
        });
        it('should call onAssignDice correctly', () => {
            component.onAssignDice('attack');
            expect(component.player.diceAssignment.attack).toBe(Dice.D6);
            expect(component.player.diceAssignment.defense).toBe(Dice.D4);

            component.onAssignDice('defense');
            expect(component.player.diceAssignment.defense).toBe(Dice.D6);
            expect(component.player.diceAssignment.attack).toBe(Dice.D4);
        });
        it('should navigate to home if navigationCheck.isNotFromCreateOrJoinParty is true', () => {
            const navigationCheckService = TestBed.inject(NavigationCheckService);
            navigationCheckService['previousPage'] = PreviousPage.FromHome;

            fixture = TestBed.createComponent(CreateCharacterComponent);
            component = fixture.componentInstance;

            expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Home]);
        });

        it('should set player.character and characterSelected to the selected character', () => {
            // Créez un personnage de test avec l'interface Character
            const testCharacter: Character = {
                id: 1,
                name: 'Test Character',
                imagePath: '/path/to/image',
                story: 'This is a test story',
            };

            // Appelez la méthode onCharacterSelected avec le personnage de test
            component.onCharacterSelected(testCharacter);

            // Vérifiez que player.character et characterSelected sont bien définis sur le personnage de test
            expect(component.player.character).toBe(testCharacter);
            expect(component.characterSelected).toBe(testCharacter);
        });

        it('should call onBack on onAgreed and navigate to Home on onRefused in PARTY_LOCKED event', () => {
            // Arrange
            const onBackSpy = spyOn(component, 'onBack').and.callThrough();
            mockRouter.navigate.calls.reset();

            // Simuler l'appel de MatDialog.open
            mockMatDialog.open.and.callFake(
                (_componentOrTemplateRef: ComponentType<any> | TemplateRef<any>, config?: MatDialogConfig<any>): MatDialogRef<any> => {
                    if (config) {
                        const data = config.data! as ConfirmationDialogData;

                        // Simuler onAgreed
                        data.onAgreed!();
                        expect(onBackSpy).toHaveBeenCalled();

                        // Réinitialiser les appels
                        onBackSpy.calls.reset();
                        mockRouter.navigate.calls.reset();

                        // Simuler onRefused
                        data.onRefused!();
                        expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Home]);
                    }

                    // Retourner un faux MatDialogRef
                    return {
                        afterClosed: () => of(true),
                    } as MatDialogRef<MessageDialogComponent>;
                },
            );

            // Act
            component['configureSocketService']();
            socketHelper.peerSideEmit(WsEventClient.PartyLocked);

            // Assert
            expect(mockMatDialog.open).toHaveBeenCalledWith(
                jasmine.any(Function), // Accepte n'importe quelle fonction
                jasmine.objectContaining({
                    data: jasmine.objectContaining({
                        type: MESSAGE_DIALOG.partyLocked.type,
                        title: MESSAGE_DIALOG.partyLocked.title,
                        body: MESSAGE_DIALOG.partyLocked.body,
                        onAgreed: jasmine.any(Function),
                        onRefused: jasmine.any(Function),
                    }),
                }),
            );
        });

        it('should trim player name, call socketService.send, and navigate to Waiting on success', () => {
            // Arrange
            component.player.name = '  Test Player  ';
            component.player.diceAssignment = { attack: Dice.D4, defense: Dice.D6 };
            component.player.life = BASE_ATTRIBUTE_VALUE + 2; // Augmentez un attribut

            // Réinitialiser les espions si nécessaire
            mockNavigationCheck.setToCreateCharacter.calls.reset();
            mockRouter.navigate.calls.reset();
            (mockSocketService.send as jasmine.Spy).calls.reset();

            // Ajuster le comportement de l'espion existant
            (mockSocketService.send as jasmine.Spy).and.callFake((path: string, player: any, callback?: (isSuccessful: boolean) => void) => {
                expect(path).toBe(WsEventServer.JoinParty);
                if (callback) callback(true); // Simuler un succès
            });

            // Act
            component.joinParty();

            // Assert
            expect(component.player.name).toBe('Test Player'); // Vérifier que le nom est trimé
            expect(mockNavigationCheck.setToCreateCharacter).toHaveBeenCalled();
            expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Waiting]);
        });

        it('should open partyPlayersFull dialog and navigate to Home on failure', () => {
            // Arrange
            (component['leaveParty'] as jasmine.Spy).calls.reset();
            mockRouter.navigate.calls.reset();

            fixture.detectChanges();

            // Customize the player
            component.player.name = 'Player';
            component.player.diceAssignment = { attack: Dice.D4, defense: Dice.D6 };
            component.player.life = BASE_ATTRIBUTE_VALUE + 1; // Increase life
            component.player.speed = BASE_ATTRIBUTE_VALUE;
            component.player.attack = BASE_ATTRIBUTE_VALUE;
            component.player.defense = BASE_ATTRIBUTE_VALUE;

            // Simulate the socketService.send failure
            (mockSocketService.send as jasmine.Spy).and.callFake((path: string, player: any, callback?: (isSuccessful: boolean) => void) => {
                if (callback) callback(false); // Simulate failure
            });

            // Mock the dialog
            mockMatDialog.open.and.returnValue({
                afterClosed: () => of(true),
            } as MatDialogRef<MessageDialogComponent>);

            // Act
            const openInformationDialogSpy = spyOn(component as any, 'openInformationDialog');
            component.joinParty();

            // Assert
            expect(component['leaveParty']).toHaveBeenCalled();
            expect(openInformationDialogSpy).toHaveBeenCalledWith(MESSAGE_DIALOG.partyPlayersFull.body);
            expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.Home]);
        });
        describe('onIncreaseAttribute', () => {
            it('should increase life by 2 and reset speed to base value', () => {
                component.onIncreaseAttribute('life');
                expect(component.player.life).toBe(BASE_ATTRIBUTE_VALUE + 2);
                expect(component.player.speed).toBe(BASE_ATTRIBUTE_VALUE);
            });

            it('should not increase life if it is already at maximum value', () => {
                component.player.life = BASE_ATTRIBUTE_VALUE + 2;
                component.onIncreaseAttribute('life');
                expect(component.player.life).toBe(BASE_ATTRIBUTE_VALUE + 2);
                expect(component.player.speed).toBe(BASE_ATTRIBUTE_VALUE);
            });

            it('should increase speed by 2 and reset life to base value', () => {
                component.onIncreaseAttribute('speed');
                expect(component.player.speed).toBe(BASE_ATTRIBUTE_VALUE + 2);
                expect(component.player.life).toBe(BASE_ATTRIBUTE_VALUE);
            });

            it('should not increase speed if it is already at maximum value', () => {
                component.player.speed = BASE_ATTRIBUTE_VALUE + 2;
                component.onIncreaseAttribute('speed');
                expect(component.player.speed).toBe(BASE_ATTRIBUTE_VALUE + 2);
                expect(component.player.life).toBe(BASE_ATTRIBUTE_VALUE);
            });
        });
    });
    describe('onBack', () => {
        it('should call leaveParty and navigate to CreateParty if isFromCreateParty is true', () => {
            (mockNavigationCheck as any).isFromCreateParty = true;
            component.onBack();
            expect(component['leaveParty']).toHaveBeenCalled();
            expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.CreateParty]);
        });

        it('should call leaveParty and navigate to JoinParty if isFromCreateParty is false', () => {
            (mockNavigationCheck as any).isFromCreateParty = false;
            component.onBack();
            expect(component['leaveParty']).toHaveBeenCalled();
            expect(mockRouter.navigate).toHaveBeenCalledWith([UrlPath.JoinParty]);
        });
    });

    it('openInformationDialog should call snack bar', () => {
        component['openInformationDialog']('test');
        expect(mockMatSnackBar.openFromComponent).toHaveBeenCalledWith(SnackBarComponent, {
            data: { message: 'test' },
            ...SNACK_BAR_PROPERTIES_SET_UP_ERROR,
        });
    });
});
