/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { HomePageComponent } from './home-page.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: HomePageComponent },
    { path: 'admin', component: HomePageComponent },
    { path: 'create-party', component: HomePageComponent },
    { path: 'join-party', component: HomePageComponent },
    { path: '**', redirectTo: '/home' },
];

describe('HomePageComponent', () => {
    let component: HomePageComponent;
    let fixture: ComponentFixture<HomePageComponent>;
    let socketService: any;
    let navigationCheck: any;

    beforeEach(async () => {
        socketService = jasmine.createSpyObj('SocketClientService', ['connect', 'disconnect']);
        navigationCheck = jasmine.createSpyObj('NavigationCheckService', ['isNotFromHome', 'setToHome']);
        await TestBed.configureTestingModule({
            imports: [HomePageComponent],
            providers: [
                provideRouter(routes),
                {
                    provide: SocketClientService,
                    useValue: socketService,
                },
                {
                    provide: NavigationCheckService,
                    useValue: navigationCheck,
                },
            ],
        }).compileComponents();
        (navigationCheck as any).isNotFromHome = false;
        fixture = TestBed.createComponent(HomePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should reconnect if from another page', () => {
        (navigationCheck as any).isNotFromHome = true;
        fixture = TestBed.createComponent(HomePageComponent);
        component = fixture.componentInstance;
        expect(socketService.connect).toHaveBeenCalled();
        expect(socketService.disconnect).toHaveBeenCalled();
    });
});
