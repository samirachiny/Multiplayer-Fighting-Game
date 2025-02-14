/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterListComponent } from './character-list.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { NUMBER_OF_ADJACENT_CHARACTERS_TO_DISPLAY } from '@app/constants/consts';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';

describe('CharacterListComponent', () => {
    let component: CharacterListComponent;
    let fixture: ComponentFixture<CharacterListComponent>;
    let socketServiceMock: SocketClientServiceMock;

    beforeEach(async () => {
        socketServiceMock = new SocketClientServiceMock();
        await TestBed.configureTestingModule({
            imports: [CharacterListComponent],
            providers: [SocketClientService],
        }).compileComponents();

        fixture = TestBed.createComponent(CharacterListComponent);
        component = fixture.componentInstance;
        socketServiceMock = TestBed.inject(SocketClientService);

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize socket listeners', () => {
        const sendSpy = spyOn(socketServiceMock, 'send').and.callFake((event: string, data?: any, callback?: Function) => {});
        const onSpy = spyOn(socketServiceMock, 'on').and.callFake((event: string, callback: Function) => {});

        component.ngOnInit();

        expect(sendSpy).toHaveBeenCalledWith(WsEventServer.GetOccupiedCharacters, jasmine.any(Function));
        expect(onSpy).toHaveBeenCalledWith(WsEventClient.CharacterOccupiedUpdated, jasmine.any(Function));
    });

    it('should update charactersOccupied when receiving CHARACTER_OCCUPIED_UPDATED', () => {
        const updatedCharactersOccupied = [1, 2, 3];
        spyOn(socketServiceMock, 'on').and.callFake((event: string, callback: Function) => {
            callback(updatedCharactersOccupied);
        });
        component.ngOnInit();
        expect(component.charactersOccupied).toEqual([0, 1, 2].filter((id) => id !== component['selectedIndex']));
        expect(socketServiceMock.on).toHaveBeenCalledWith(WsEventClient.CharacterOccupiedUpdated, jasmine.any(Function));
    });

    it('should update charactersToDisplay when nextCharacter is called', () => {
        component['characters'] = [
            { id: 1, name: 'Christ le Sombre', imagePath: './assets/img/characters/character1.png', story: 'Story 1' },
            { id: 2, name: 'Nadine DelaGuerre', imagePath: './assets/img/characters/character2.png', story: 'Story 2' },
            { id: 3, name: 'Simon de Flandres', imagePath: './assets/img/characters/character3.png', story: 'Story 3' },
            { id: 4, name: 'Aymane de Montfort', imagePath: './assets/img/characters/character4.png', story: 'Story 4' },
            { id: 5, name: 'Raissa de Rohan', imagePath: './assets/img/characters/character5.png', story: 'Story 5' },
        ];

        component.charactersOccupied = [0, 2];
        component['selectedIndex'] = 0;
        component.nextCharacter();

        const expectedLength = NUMBER_OF_ADJACENT_CHARACTERS_TO_DISPLAY * 2 + 1;

        expect(component.charactersToDisplay.length).toBe(expectedLength);
    });

    it('should not change selectedIndex when clicking on an occupied character', () => {
        component.charactersOccupied = [2];
        component['selectedIndex'] = 1;
        component.onCharacterClick(3);
        expect(component['selectedIndex']).toBe(1);
    });

    it('should emit characterSelected when nextCharacter is called', () => {
        spyOn(component.characterSelected, 'emit');

        component.charactersOccupied = [];
        component['characters'] = [
            { id: 0, name: 'Character 1', imagePath: '', story: '' },
            { id: 1, name: 'Character 2', imagePath: '', story: '' },
        ];
        component.nextCharacter();

        expect(component.characterSelected.emit).toHaveBeenCalledWith(component['characters'][component['selectedIndex']]);
    });
    it('should emit characterSelected when nextCharacter is called', () => {
        spyOn(component.characterSelected, 'emit');

        component.charactersOccupied = [];
        component['characters'] = [
            { id: 0, name: 'Character 1', imagePath: '', story: '' },
            { id: 1, name: 'Character 2', imagePath: '', story: '' },
        ];
        component.nextCharacter(false);

        expect(component.characterSelected.emit).toHaveBeenCalledWith(component['characters'][component['selectedIndex']]);
    });

    /* it('should call off to clean up WebSocket listeners on ngOnDestroy', () => {
        const offSpy = spyOn(socketServiceMock, 'off').and.callThrough();
        component.ngOnDestroy();
        expect(offSpy).toHaveBeenCalledWith(WsEventServer.CharacterOccupiedUpdated);
    });*/

    it('should calculate step correctly when onLeft is true in nextCharacter', () => {
        component['characters'] = [
            { id: 0, name: 'Character 0', imagePath: '', story: '' },
            { id: 1, name: 'Character 1', imagePath: '', story: '' },
            { id: 2, name: 'Character 2', imagePath: '', story: '' },
            { id: 3, name: 'Character 3', imagePath: '', story: '' },
        ];
        component.charactersOccupied = [];
        component['selectedIndex'] = 1;
        spyOn(component.characterSelected, 'emit');

        component.nextCharacter(true);

        expect(component['selectedIndex']).toBe(0);
        expect(component.characterSelected.emit).toHaveBeenCalledWith(component['characters'][0]);
    });

    it('should update charactersOccupied and call nextCharacter when receiving GET_CHARACTER_OCCUPIED_LIST', () => {
        const mockCharactersOccupied = [1, 2, 3];

        spyOn(component, 'nextCharacter').and.callThrough();

        spyOn(socketServiceMock, 'send').and.callFake((event: string, data?: unknown, callback?: Function) => {
            if (typeof data === 'function') {
                callback = data;
                data = undefined;
            }

            if (event === WsEventServer.GetOccupiedCharacters && typeof callback === 'function') {
                callback(mockCharactersOccupied);
            }
        });

        component.ngOnInit();

        expect(component.charactersOccupied).toEqual([0, 1, 2]);
        expect(component.nextCharacter).toHaveBeenCalled();
    });

    it('should not change selectedIndex if the selected character is occupied', () => {
        component['characters'] = [
            { id: 0, name: 'Character 1', imagePath: '', story: '' },
            { id: 1, name: 'Character 2', imagePath: '', story: '' },
        ];

        component['selectedIndex'] = 1; // Actuellement sélectionné
        const lastSelectedIndex = component['selectedIndex'];

        // Marquer le personnage sélectionné comme occupé
        component.charactersOccupied = [1]; // Personnage à l'index 1 est occupé

        // Appel à 'onCharacterClick' avec un index occupé
        component.onCharacterClick(1);

        // Vérifier que 'selectedIndex' n'a pas changé et est resté sur 'lastSelectedIndex'
        expect(component['selectedIndex']).toBe(lastSelectedIndex);
    });
});
