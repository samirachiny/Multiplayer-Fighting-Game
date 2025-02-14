import { Injectable } from '@angular/core';
import { PreviousPage } from '@app/enums/previous-page';

@Injectable({
    providedIn: 'root',
})
export class NavigationCheckService {
    private previousPage: PreviousPage;
    constructor() {
        this.previousPage = PreviousPage.FromHome;
    }

    get isNotFromCreateOrJoinParty(): boolean {
        return !(this.previousPage === PreviousPage.FromCreateParty || this.previousPage === PreviousPage.FromJoinParty);
    }

    get isFromCreateParty(): boolean {
        return this.previousPage === PreviousPage.FromCreateParty;
    }

    get isNotFromCreateCharacter(): boolean {
        return this.previousPage !== PreviousPage.FromCreateCharacter;
    }

    get isNotFromWaiting(): boolean {
        return this.previousPage !== PreviousPage.FromWaiting;
    }

    get isNotFromGame(): boolean {
        return this.previousPage !== PreviousPage.FromGame;
    }

    get isNotFromHome(): boolean {
        return this.previousPage !== PreviousPage.FromHome;
    }

    setToHome(): void {
        this.previousPage = PreviousPage.FromHome;
    }

    setToCreateParty(): void {
        this.previousPage = PreviousPage.FromCreateParty;
    }
    setToJoinParty(): void {
        this.previousPage = PreviousPage.FromJoinParty;
    }
    setToCreateCharacter(): void {
        this.previousPage = PreviousPage.FromCreateCharacter;
    }

    setToWaiting(): void {
        this.previousPage = PreviousPage.FromWaiting;
    }

    setToGame(): void {
        this.previousPage = PreviousPage.FromGame;
    }
}
