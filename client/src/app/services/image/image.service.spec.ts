/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';

import { ImageService } from './image.service';
import { TILE_IMAGES } from '@app/constants/image';

describe('ImageService', () => {
    let imageService: ImageService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        imageService = TestBed.inject(ImageService);
    });

    it('should be created', () => {
        expect(imageService).toBeTruthy();
    });
    describe('preloadImages', () => {
        it('should preload images correctly', async () => {
            const mockPaths = ['/path/to/image1.png', '/path/to/image2.png'];
            imageService['imagePaths'] = mockPaths;
            spyOn(imageService as any, 'loadImage').and.callFake(async (path: string) => {
                const img = new Image();
                img.src = path;
                imageService['imageCache'].set(path, img);
                return Promise.resolve();
            });
            await imageService.preloadImages();
            expect(imageService.getImage(mockPaths[0])).toBeTruthy();
            expect(imageService.getImage(mockPaths[1])).toBeTruthy();
        });
    });

    describe('getImage', () => {
        it('should return the correct image from the cache', () => {
            const mockPath = '/path/to/image.png';
            const mockImage = new Image();
            imageService['imageCache'].set(mockPath, mockImage);
            expect(imageService.getImage(mockPath)).toBe(mockImage);
        });

        it('should return undefined if the image is not in the cache', () => {
            const mockPath = '/path/to/image.png';
            expect(imageService.getImage(mockPath)).toBeUndefined();
        });
    });

    describe('loadImage', () => {
        it('should reject if the image fails to load', async () => {
            const mockPath = '/path/to/invalid/image.png';
            await expectAsync(imageService['loadImage'](mockPath)).toBeRejectedWith(`Erreur de chargement de l'image: ${mockPath}`);
        });
        it('should load an image correctly', async () => {
            const mockPath = TILE_IMAGES.doorOpened;
            const mockImage = new Image();
            mockImage.src = TILE_IMAGES.doorOpened;
            imageService['imageCache'].set(mockPath, mockImage);
            await imageService['loadImage'](mockPath).then(() => {
                expect(imageService.getImage(mockPath)).toEqual(mockImage);
            });
        });
    });
});
