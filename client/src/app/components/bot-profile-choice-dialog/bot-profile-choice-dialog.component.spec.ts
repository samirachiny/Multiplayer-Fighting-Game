import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BotProfileChoiceDialogComponent } from './bot-profile-choice-dialog.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { VirtualPlayerProfile } from '@app/interfaces/virtual-player-profile';
import { ALL_VIRTUAL_PLAYER_PROFILE } from '@app/constants/consts';
import { MatDialogClose } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { NgClass } from '@angular/common';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { WsEventServer } from '@common/enums/web-socket-event';

describe('VirtualPlayerProfileChooseDialogComponent', () => {
    let component: BotProfileChoiceDialogComponent;
    let fixture: ComponentFixture<BotProfileChoiceDialogComponent>;
    let socketClientServiceSpy: jasmine.SpyObj<SocketClientService>;

    const mockProfiles: VirtualPlayerProfile[] = ALL_VIRTUAL_PLAYER_PROFILE;

    beforeEach(async () => {
        socketClientServiceSpy = jasmine.createSpyObj('SocketClientService', ['send']);

        await TestBed.configureTestingModule({
            imports: [NgClass, MatTooltip, MatDialogClose, BotProfileChoiceDialogComponent],
            providers: [{ provide: SocketClientService, useValue: socketClientServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(BotProfileChoiceDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize profiles with ALL_VIRTUAL_PLAYER_PROFILE', () => {
        expect(component.profiles).toEqual(mockProfiles);
    });

    it('should set the virtualPlayerProfile when a profile is selected', () => {
        const mockProfile: VirtualPlayerProfile = mockProfiles[0];
        component.onSelectedProfile(mockProfile);
        expect(component.virtualPlayerProfile).toBe(mockProfile.botProfile);
    });

    it('should not set the virtualPlayerProfile if the selected profile is null', () => {
        expect(component.virtualPlayerProfile).toBeUndefined();
        component.onSelectedProfile(null);
        expect(component.virtualPlayerProfile).toBeUndefined();
    });

    it('should send the selected virtualPlayerProfile when onChoiceDone is called', () => {
        const selectedBotProfile = BotProfile.Aggressive;
        component.virtualPlayerProfile = selectedBotProfile;
        component.onChoiceDone();
        expect(socketClientServiceSpy.send).toHaveBeenCalledWith(WsEventServer.AddVirtualPlayer, selectedBotProfile);
    });

    it('should not send anything if no virtualPlayerProfile is selected', () => {
        component.virtualPlayerProfile = null;
        component.onChoiceDone();
        expect(socketClientServiceSpy.send).not.toHaveBeenCalled();
    });
});
