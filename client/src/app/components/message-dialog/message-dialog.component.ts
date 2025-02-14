import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MessageDialogData } from '@app/interfaces/message-dialog-data';

@Component({
    selector: 'app-message-dialog',
    standalone: true,
    imports: [MatButtonModule, MatDialogActions, MatDialogClose, MatDialogContent, MatIconModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './message-dialog.component.html',
    styleUrl: './message-dialog.component.scss',
})
export class MessageDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) readonly data: MessageDialogData) {}
}
