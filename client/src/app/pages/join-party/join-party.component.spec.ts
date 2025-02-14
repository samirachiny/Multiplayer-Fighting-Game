/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { JoinPartyComponent } from './join-party.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { ResponseAccessCode } from '@common/interfaces/response-code';
import { NavigationCheckService } from '@app/services/navigation-check/navigation-check.service';
import { WsEventServer } from '@common/enums/web-socket-event';
import { SnackBarComponent } from '@app/components/snack-bar/snack-bar.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACK_BAR_PROPERTIES_SET_UP_ERROR } from '@app/constants/consts';

describe('JoinPartyComponent', () => {
    let component: JoinPartyComponent;
    let fixture: ComponentFixture<JoinPartyComponent>;
    let socketService: jasmine.SpyObj<SocketClientService>;
    let router: jasmine.SpyObj<Router>;
    let mockMatSnackBar: jasmine.SpyObj<MatSnackBar>;
    let navigationCheck: jasmine.SpyObj<NavigationCheckService>;

    beforeEach(async () => {
        const activatedRouteStub = {
            snapshot: {
                paramMap: {
                    get: () => 'mock-id',
                },
            },
        };
        socketService = jasmine.createSpyObj('SocketClientService', ['send']);
        navigationCheck = jasmine.createSpyObj('NavigationCheckService', ['isNotFromHome', 'setToJoinParty']);

        router = jasmine.createSpyObj('Router', ['navigate']);
        mockMatSnackBar = jasmine.createSpyObj('MatSnackBar', ['openFromComponent']);

        await TestBed.configureTestingModule({
            imports: [JoinPartyComponent],
            providers: [
                { provide: SocketClientService, useValue: socketService },
                { provide: NavigationCheckService, useValue: navigationCheck },
                { provide: Router, useValue: router },
                { provide: MatSnackBar, useValue: mockMatSnackBar },
                { provide: ActivatedRoute, useValue: activatedRouteStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(JoinPartyComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should leave party if not from home', () => {
        (navigationCheck as any).isNotFromHome.and.returnValue(true);
        fixture = TestBed.createComponent(JoinPartyComponent);
        component = fixture.componentInstance;
        expect(component['socketService'].send).toHaveBeenCalledWith(WsEventServer.LeaveParty);
    });

    it('should call validateAccessCode when emit is successful', () => {
        const mockResponse: ResponseAccessCode = { isValid: true, feedback: '' };
        spyOn<any>(component, 'validateAccessCode').and.callThrough();

        (socketService.send as jasmine.Spy).and.callFake((event: string, code: number, callback: Function) => {
            callback(mockResponse);
        });
        component.onSubmit();
        expect(component['validateAccessCode']).toHaveBeenCalledWith(mockResponse);
    });

    it('should invalidate the form with less than 4 digits', () => {
        component.accessCode = '12';
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
    });

    it('should send access code via WebSocket on submit', () => {
        component.accessCode = '1234';
        component.onSubmit();
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.ValidateAccessCode, 1234, jasmine.any(Function));
    });

    it('should navigate to create-character on valid access code', () => {
        const response: ResponseAccessCode = { isValid: true, feedback: '' };
        component['validateAccessCode'](response);
        expect(router.navigate).toHaveBeenCalledWith(['create-character']);
    });

    it('should open error snack bar with correct data', () => {
        const response: ResponseAccessCode = { isValid: false, feedback: 'Code invalide' };
        component['validateAccessCode'](response);
        expect(mockMatSnackBar.openFromComponent).toHaveBeenCalledWith(SnackBarComponent, {
            data: { message: response.feedback },
            ...SNACK_BAR_PROPERTIES_SET_UP_ERROR,
        });
    });
});
