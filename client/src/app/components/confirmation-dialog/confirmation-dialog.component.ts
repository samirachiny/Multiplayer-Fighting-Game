import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent } from '@angular/material/dialog';
import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-data';

@Component({
    selector: 'app-confirmation-dialog-component',
    standalone: true,
    imports: [MatButtonModule, MatDialogActions, MatDialogClose, MatDialogContent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: 'confirmation-dialog.component.html',
    styleUrl: './confirmation-dialog.component.scss',
})
export class ConfirmationDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData) {}
    onAgreed() {
        this.data.onAgreed();
    }
    onRefused() {
        if (!this.data.onRefused) return;
        this.data.onRefused();
    }
}
