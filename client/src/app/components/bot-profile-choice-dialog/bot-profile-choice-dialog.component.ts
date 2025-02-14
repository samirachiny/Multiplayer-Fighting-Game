import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogClose } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { ALL_VIRTUAL_PLAYER_PROFILE } from '@app/constants/consts';
import { VirtualPlayerProfile } from '@app/interfaces/virtual-player-profile';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { WsEventServer } from '@common/enums/web-socket-event';

@Component({
    selector: 'app-virtual-player-profile-choose-dialog',
    standalone: true,
    imports: [NgClass, MatTooltip, MatDialogClose],
    templateUrl: './bot-profile-choice-dialog.component.html',
    styleUrl: './bot-profile-choice-dialog.component.scss',
})
export class BotProfileChoiceDialogComponent {
    virtualPlayerProfile: BotProfile | null;
    profiles: VirtualPlayerProfile[] = ALL_VIRTUAL_PLAYER_PROFILE;

    constructor(private socketClientService: SocketClientService) {}

    onSelectedProfile(profile: VirtualPlayerProfile | null) {
        if (!profile) return;
        this.virtualPlayerProfile = profile.botProfile;
    }

    onChoiceDone() {
        if (!this.virtualPlayerProfile) return;
        this.socketClientService.send(WsEventServer.AddVirtualPlayer, this.virtualPlayerProfile);
    }
}
