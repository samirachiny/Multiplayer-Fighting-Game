import { TestBed } from '@angular/core/testing';
import { AppComponent } from '@app/pages/app/app.component';
import { ImageService } from '@app/services/image/image.service';

describe('AppComponent', () => {
    let app: AppComponent;
    let mockImageService: jasmine.SpyObj<ImageService>;
    beforeEach(async () => {
        mockImageService = jasmine.createSpyObj('ImageService', ['preloadImages']);
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [{ provide: ImageService, useValue: mockImageService }],
        }).compileComponents();
    });

    it('should create the app', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        app = fixture.componentInstance;
        await app.ngOnInit();
        expect(app).toBeTruthy();
    });
});
