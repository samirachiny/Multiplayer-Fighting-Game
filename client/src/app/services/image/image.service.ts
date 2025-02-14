import { Injectable } from '@angular/core';
import { IMG_LOAD_ERROR_HEADER } from '@app/constants/consts';
import { CHARACTER_IMAGES, ITEM_IMAGES, TILE_IMAGES } from '@app/constants/image';

@Injectable({
    providedIn: 'root',
})
export class ImageService {
    private imageCache: Map<string, HTMLImageElement>;
    private imagePaths: string[];

    constructor() {
        this.imageCache = new Map();
        this.imagePaths = [...Object.values(TILE_IMAGES), ...Object.values(ITEM_IMAGES), ...Object.values(CHARACTER_IMAGES)];
    }

    async preloadImages(): Promise<void> {
        const promises = this.imagePaths.map(async (path) => this.loadImage(path));
        await Promise.all(promises);
    }

    getImage(path: string): HTMLImageElement | undefined {
        return this.imageCache.get(path);
    }

    private async loadImage(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                this.imageCache.set(path, img);
                resolve();
            };
            img.onerror = () => reject(`${IMG_LOAD_ERROR_HEADER}${path}`);
        });
    }
}
