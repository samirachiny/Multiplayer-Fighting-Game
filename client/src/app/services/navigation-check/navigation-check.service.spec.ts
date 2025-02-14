import { TestBed } from '@angular/core/testing';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { PreviousPage } from '@app/enums/previous-page';

describe('NavigationCheckService', () => {
    let service: NavigationCheckService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(NavigationCheckService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set lastNavigation to FromHome', () => {
        service.setToHome();
        expect(service['previousPage']).toBe(PreviousPage.FromHome);
    });

    it('should set lastNavigation to FromCreateOrJoinParty', () => {
        service.setToJoinParty();
        expect(service['previousPage']).toBe(PreviousPage.FromJoinParty);
    });

    it('should set lastNavigation to FromCreateCharacter', () => {
        service.setToCreateCharacter();
        expect(service['previousPage']).toBe(PreviousPage.FromCreateCharacter);
    });

    it('should set lastNavigation to FromWaiting', () => {
        service.setToWaiting();
        expect(service['previousPage']).toBe(PreviousPage.FromWaiting);
    });

    it('should set lastNavigation to FromGame', () => {
        service.setToGame();
        expect(service['previousPage']).toBe(PreviousPage.FromGame);
    });

    it('should return true for isNotFromHome when lastNavigation is not FromHome', () => {
        service.setToJoinParty();
        expect(service.isNotFromHome).toBeTrue();
    });

    it('should return true for isNotFromCreateOrJoinParty when lastNavigation is not FromCreateOrJoinParty', () => {
        service.setToHome();
        expect(service.isNotFromCreateOrJoinParty).toBeTrue();
    });

    it('should return true for isNotFromCreateCharacter when lastNavigation is not FromCreateCharacter', () => {
        service.setToHome();
        expect(service.isNotFromCreateCharacter).toBeTrue();
    });

    it('should return true for isNotFromWaiting when lastNavigation is not FromWaiting', () => {
        service.setToHome();
        expect(service.isNotFromWaiting).toBeTrue();
    });

    it('should return true for isNotFromGame when lastNavigation is not FromGame', () => {
        service.setToHome();
        expect(service.isNotFromGame).toBeTrue();
    });

    it('should return true for isFromCreateParty when lastNavigation is FromCreateParty', () => {
        service.setToCreateParty();
        expect(service.isFromCreateParty).toBeTrue();
    });
});
