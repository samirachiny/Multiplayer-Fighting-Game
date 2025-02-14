import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ImageService } from '@app/services/image/image.service';

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet],
})
export class AppComponent implements OnInit {
    constructor(private imageService: ImageService) {}

    async ngOnInit(): Promise<void> {
        await this.imageService.preloadImages();
    }
}
