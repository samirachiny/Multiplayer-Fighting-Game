import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink, Routes } from '@angular/router';
import { Location } from '@angular/common';
import { HomePageComponent } from '@app/pages/home-page/home-page.component';
const routes: Routes = [{ path: 'home', component: HomePageComponent }];

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [provideRouter(routes), Location],
        }).compileComponents();

        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the correct page title', () => {
        const testTitle = 'Test Page Title';
        component.pageTitle = testTitle;
        fixture.detectChanges();

        const titleElement = fixture.debugElement.query(By.css('h1')).nativeElement;
        expect(titleElement.textContent).toBe(testTitle);
    });

    it('should have the correct logo with routerLink', () => {
        fixture.detectChanges();
        const imgElement = fixture.debugElement.query(By.css('img'));
        expect(imgElement.nativeElement.src).toContain('/assets/img/logo.png');
        expect(imgElement.nativeElement.alt).toBe('Logo du jeu');
        expect(imgElement.attributes['routerLink']).toBe('/home');
    });

    it('should update the title when input changes', () => {
        component.pageTitle = 'Initial Title';
        fixture.detectChanges();
        let titleElement = fixture.debugElement.query(By.css('h1')).nativeElement;
        expect(titleElement.textContent).toBe('Initial Title');

        component.pageTitle = 'Updated Title';
        fixture.detectChanges();
        titleElement = fixture.debugElement.query(By.css('h1')).nativeElement;
        expect(titleElement.textContent).toBe('Updated Title');
    });

    it('should have RouterLink directive on img element', () => {
        fixture.detectChanges();
        const imgElement = fixture.debugElement.query(By.css('img'));
        expect(imgElement.injector.get(RouterLink)).toBeTruthy();
    });

    it('should redirect to Home Page when logo is clicked', async () => {
        const location = TestBed.inject(Location);
        const joinBtn = fixture.debugElement.query(By.css('img')).nativeElement;
        joinBtn.click();
        await fixture.whenStable();
        expect(location.path()).toBe('/home');
    });
});
