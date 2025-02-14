import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { FormsModule } from '@angular/forms';
import { WsEventServer } from '@common/enums/web-socket-event';
import { ResponseAccessCode } from '@common/interfaces/response-code';
import { HeaderComponent } from '@app/components/header/header.component';
import { NgClass } from '@angular/common';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { UrlPath } from '@app/enums/url-path';
import { MatRipple } from '@angular/material/core';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_BAR_PROPERTIES_SET_UP_ERROR } from '@app/constants/consts';

@Component({
    selector: 'app-join-party',
    standalone: true,
    imports: [FormsModule, HeaderComponent, NgClass, MatRipple],
    templateUrl: './join-party.component.html',
    styleUrl: './join-party.component.scss',
})
export class JoinPartyComponent {
    accessCode: string;

    constructor(
        private socketService: SocketClientService,
        private router: Router,
        private snackBar: MatSnackBar,
        private navigationCheck: NavigationCheckService,
    ) {
        if (this.navigationCheck.isNotFromHome) {
            this.socketService.send(WsEventServer.LeaveParty);
        }
    }

    onSubmit() {
        this.socketService.send(WsEventServer.ValidateAccessCode, parseInt(this.accessCode, 10), (response: ResponseAccessCode) => {
            this.validateAccessCode(response);
        });
    }

    private validateAccessCode(response: ResponseAccessCode) {
        if (!response.isValid && response.feedback) return this.openInformationDialog(response.feedback);
        this.navigationCheck.setToJoinParty();
        this.router.navigate([UrlPath.CreateCharacter]);
    }

    private openInformationDialog(message: string): void {
        this.snackBar.openFromComponent(SnackBarComponent, {
            data: { message },
            ...SNACK_BAR_PROPERTIES_SET_UP_ERROR,
        });
    }
}
