import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';

@Component({
    selector: 'app-snack-bar',
    standalone: true,
    imports: [MatButtonModule, MatSnackBarModule, MatIcon],
    templateUrl: './snack-bar.component.html',
    styleUrl: './snack-bar.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class SnackBarComponent {
    constructor(
        readonly snackBarRef: MatSnackBarRef<SnackBarComponent>,
        @Inject(MAT_SNACK_BAR_DATA) readonly data: { message: string },
    ) {}
}
