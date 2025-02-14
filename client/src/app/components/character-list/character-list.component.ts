import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NUMBER_OF_ADJACENT_CHARACTERS_TO_DISPLAY } from '@app/constants/consts';
import { CHARACTERS } from '@common/constants/character';
import { Character } from '@common/interfaces/character';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { MatRipple } from '@angular/material/core';

@Component({
    selector: 'app-character-list',
    standalone: true,
    imports: [MatIconModule, CommonModule, MatRipple],
    templateUrl: './character-list.component.html',
    styleUrl: './character-list.component.scss',
})
export class CharacterListComponent implements OnInit, OnDestroy {
    @Output() characterSelected;
    charactersToDisplay: Character[];
    charactersOccupied: number[];
    private characters: Character[];
    private selectedIndex: number;
    constructor(private socketService: SocketClientService) {
        this.characterSelected = new EventEmitter<Character>();
        this.characters = CHARACTERS;
        this.selectedIndex = 0;
    }

    ngOnInit(): void {
        this.socketService.send(WsEventServer.GetOccupiedCharacters, (charactersOccupied: number[]) => {
            this.charactersOccupied = charactersOccupied.map((character) => character - 1);
            this.nextCharacter();
        });

        this.socketService.on(WsEventClient.CharacterOccupiedUpdated, (charactersOccupied: number[]) => {
            this.charactersOccupied = charactersOccupied
                .map((character) => character - 1)
                .filter((characterId) => characterId !== this.selectedIndex);
        });
    }

    ngOnDestroy(): void {
        this.socketService.off(WsEventClient.CharacterOccupiedUpdated);
    }

    nextCharacter(onLeft: boolean = false): void {
        const step = onLeft ? this.characters.length - 1 : 1;
        do {
            this.selectedIndex = (this.selectedIndex + step) % this.characters.length;
        } while (this.charactersOccupied.includes(this.selectedIndex));
        this.updateCharactersToDisplay();
        this.characterSelected.emit(this.characters[this.selectedIndex]);
        this.socketService.send(WsEventServer.CharacterOccupiedUpdated, this.selectedIndex + 1);
    }

    onCharacterClick(index: number): void {
        const lastSelectedIndex: number = this.selectedIndex;
        this.selectedIndex =
            (this.selectedIndex + index - NUMBER_OF_ADJACENT_CHARACTERS_TO_DISPLAY + this.characters.length) % this.characters.length;
        if (this.charactersOccupied.includes(this.selectedIndex)) {
            this.selectedIndex = lastSelectedIndex;
            return;
        }
        this.updateCharactersToDisplay();
        this.characterSelected.emit(this.characters[this.selectedIndex]);
        this.socketService.send(WsEventServer.CharacterOccupiedUpdated, this.selectedIndex + 1);
    }

    private updateCharactersToDisplay(): void {
        this.charactersToDisplay = [];
        for (let i = -NUMBER_OF_ADJACENT_CHARACTERS_TO_DISPLAY; i <= NUMBER_OF_ADJACENT_CHARACTERS_TO_DISPLAY; i++) {
            const index = (this.selectedIndex + i + this.characters.length) % this.characters.length;
            this.charactersToDisplay.push(this.characters[index]);
        }
    }
}
