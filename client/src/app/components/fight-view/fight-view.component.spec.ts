/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FightViewComponent } from './fight-view.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { Router } from '@angular/router';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { Fighter } from '@common/interfaces/player-infos';
import { UrlPath } from '@app/enums/url-path';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';
import { FIGHT_MESSAGES } from '@app/constants/consts';

describe('FightViewComponent', () => {
    let component: FightViewComponent;
    let fixture: ComponentFixture<FightViewComponent>;
    let socketService: SocketClientServiceMock;
    let socketHelper: SocketTestHelper;
    let router: jasmine.SpyObj<Router>;
    let mockMatSnackBar: jasmine.SpyObj<MatSnackBar>;

    const mockFightParticipants: FightParticipants = {
        attacker: {
            pid: '1',
            name: 'Attacker',
            life: 10,
            remainEscape: 3,
        } as Fighter,
        defender: {
            pid: '2',
            name: 'Defender',
            life: 10,
            remainEscape: 3,
        } as Fighter,
    };

    const mockDiceRollResult = {
        pid: '1',
        result: 4,
    } as any;

    beforeEach(async () => {
        socketService = new SocketClientServiceMock();
        socketHelper = socketService['socket'] as any as SocketTestHelper;
        mockMatSnackBar = jasmine.createSpyObj('MatSnackBar', ['openFromComponent']);
        router = jasmine.createSpyObj('Router', ['navigate']);
        spyOn(socketService, 'on').and.callThrough();
        spyOn(socketService, 'off');
        spyOn(socketService, 'send').and.callThrough();
        await TestBed.configureTestingModule({
            imports: [FightViewComponent],
            providers: [
                { provide: SocketClientService, useValue: socketService },
                { provide: Router, useValue: router },
                { provide: MatSnackBar, useValue: mockMatSnackBar },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(FightViewComponent);
        component = fixture.componentInstance;
        component.playerId = '1';
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize fight and set fighters', () => {
        spyOn(socketHelper, 'emit').and.callFake((event: string, callback: (data: FightParticipants) => void) => {
            callback(mockFightParticipants);
        });
        fixture = TestBed.createComponent(FightViewComponent);
        component = fixture.componentInstance;
        expect(component.myFighter).toEqual(mockFightParticipants.defender);
        expect(component.opponentFighter).toEqual(mockFightParticipants.attacker);
        expect(component.isAttacker).toBeFalse();
        expect(component.isLoading).toBeFalse();
    });

    it('should update remaining fighting time', () => {
        component['updateRemainFightingTime'](30);
        expect(component.remainTime).toEqual(30);
    });

    it('should update current attacker for opponent', () => {
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component['opponentFighter'] = { name: 'Defender' } as any;
        component['updateCurrentAttacker']('myFighter');
        expect(component.isActionCompleted).toBeFalse();
        expect(component.showResult).toBeFalse();
        expect(component.isAttacker).toBeFalse();
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.opponentTurnStarted('Defender'));
    });
    it('should update current attacker for fighter', () => {
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component['playerId'] = 'myFighter';
        component['updateCurrentAttacker']('myFighter');
        expect(component.isActionCompleted).toBeFalse();
        expect(component.showResult).toBeFalse();
        expect(component.isAttacker).toBeTrue();
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.turnStarted());
    });

    it('should decrement opponent life', () => {
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component.isAttacker = true;
        component['opponentFighter'] = { life: 1 } as any;
        component['decrementFighterLife']();
        expect(component.opponentFighter.life).toEqual(0);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.youWon());
    });

    it('should decrement my life', () => {
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component.isAttacker = false;
        component['myFighter'] = { life: 1 } as any;
        component['decrementFighterLife']();
        expect(component.myFighter.life).toEqual(0);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.youLost());
    });

    it('should coorectly handle attack', () => {
        component['opponentFighter'] = { name: 'opponentName' } as Fighter;
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component['isAttacker'] = true;
        component['handleAttack'](true);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.attackSuccessful());
        component['isAttacker'] = false;
        component['handleAttack'](true);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.opponentAttackSuccessful(component['opponentFighter'].name));
        component['isAttacker'] = true;
        component['handleAttack'](false);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.attackFailed());
        component['isAttacker'] = false;
        component['handleAttack'](false);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.opponentAttackFailed(component['opponentFighter'].name));
    });

    it('should decrement figther life', () => {
        component.isAttacker = false;
        component['myFighter'] = { life: 10 } as any;
        component['opponentFighter'] = { name: 'opponentFighter' } as any;
        component['decrementFighterLife']();
        expect(component.myFighter.life).toEqual(9);
    });
    it('should handle dice roll result for fighter', () => {
        component['rollDiceResult'](mockDiceRollResult);
        expect(component.myDiceRollResult).toEqual(mockDiceRollResult);
        expect(component.showResult).toBeTrue();
    });
    it('should handle dice roll result for opponent', () => {
        component['rollDiceResult']({ ...mockDiceRollResult, pid: '2' });
        expect(component.opponentDiceRollResult).toEqual({ ...mockDiceRollResult, pid: '2' });
        expect(component.showResult).toBeTrue();
    });
    it('should handle escape failed', () => {
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component.isAttacker = true;
        component['myFighter'] = { remainEscape: 3 } as any;
        component['handleEscape'](false);
        expect(component.myFighter.remainEscape).toEqual(2);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.escapeFailed());
    });
    it('should handle escape failed for opponent', () => {
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component['myFighter'] = { remainEscape: 3 } as any;
        component.isAttacker = false;
        component['opponentFighter'] = { name: 'opponentFighter' } as any;
        component['handleEscape'](false);
        expect(component.myFighter.remainEscape).toEqual(3);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.opponentEscapeFailed(component['opponentFighter'].name));
    });
    it('should handle escape passed', () => {
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component.isAttacker = true;
        component['handleEscape'](true);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.escapeSuccessful());
    });
    it('should handle escape passed for opponent', () => {
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component.isAttacker = false;
        component['opponentFighter'] = { name: 'opponentFighter' } as any;
        component['handleEscape'](true);
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.opponentEscapeSuccessful(component['opponentFighter'].name));
    });

    it('should handle fighter give up', () => {
        const showFightInformationSpy = spyOn(component as any, 'showFightInformation');
        component['opponentFighter'] = { name: 'Defender' } as any;
        component['fighterGiverUp']();
        expect(showFightInformationSpy).toHaveBeenCalledWith(FIGHT_MESSAGES.opponentGaveUp(component['opponentFighter'].name));
    });

    it('should execute action and set isActionCompleted to true', () => {
        component['executeAction'](WsEventServer.Attack);
        expect(socketService.send).toHaveBeenCalledWith(WsEventServer.Attack);
        expect(component.isActionCompleted).toBeTrue();
    });

    it('should navigate to home on give up', () => {
        spyOn(component as any, 'executeAction');
        component.onGiveUp();
        expect(component['executeAction']).toHaveBeenCalledWith(WsEventServer.FightingGiveUp);
        expect(router.navigate).toHaveBeenCalledWith([UrlPath.Home]);
    });
    it('should execute attack action if not completed', () => {
        spyOn(component as any, 'executeAction');
        component.isActionCompleted = false;
        component.onAttack();
        expect(component['executeAction']).toHaveBeenCalledWith(WsEventServer.Attack);
    });

    it('should not execute attack action if already completed', () => {
        spyOn(component as any, 'executeAction');
        component.isActionCompleted = true;
        component.onAttack();
        expect(component['executeAction']).not.toHaveBeenCalled();
    });

    it('should execute escape action if not completed', () => {
        spyOn(component as any, 'executeAction');
        component.isActionCompleted = false;
        component.onEscape();
        expect(component['executeAction']).toHaveBeenCalledWith(WsEventServer.Escape);
    });

    it('should not execute escape action if already completed', () => {
        spyOn(component as any, 'executeAction');
        component.isActionCompleted = true;
        component.onEscape();
        expect(component['executeAction']).not.toHaveBeenCalled();
    });
    it('should initialize fight and set fighters', () => {
        spyOn(socketHelper, 'emit').and.callFake((event: string, callback: (data: FightParticipants) => void) => {
            callback(mockFightParticipants);
        });

        component['initializeFight']();
        expect(component.myFighter).toEqual(mockFightParticipants.attacker);
        expect(component.opponentFighter).toEqual(mockFightParticipants.defender);
        expect(component.isAttacker).toBeTrue();
        expect(component.isLoading).toBeFalse();
    });

    it('should set up socket listeners', () => {
        spyOn(component as any, 'updateRemainFightingTime');
        spyOn(component as any, 'updateCurrentAttacker');
        spyOn(component as any, 'decrementFighterLife');
        spyOn(component as any, 'rollDiceResult');
        spyOn(component as any, 'handleEscape');
        spyOn(component as any, 'handleAttack');
        spyOn(component as any, 'fighterGiverUp');

        component['setupSocketListeners']();

        socketHelper.peerSideEmit(WsEventClient.UpdateRemainFightingTime, 30);
        expect(component['updateRemainFightingTime']).toHaveBeenCalledWith(30);

        socketHelper.peerSideEmit(WsEventClient.UpdateCurrentAttacker, '2');
        expect(component['updateCurrentAttacker']).toHaveBeenCalledWith('2');

        socketHelper.peerSideEmit(WsEventClient.DecrementFighterLife);
        expect(component['decrementFighterLife']).toHaveBeenCalled();

        socketHelper.peerSideEmit(WsEventClient.RollDiceResult, mockDiceRollResult);
        expect(component['rollDiceResult']).toHaveBeenCalledWith(mockDiceRollResult);

        socketHelper.peerSideEmit(WsEventClient.EscapeFailed);
        expect(component['handleEscape']).toHaveBeenCalledWith(false);

        socketHelper.peerSideEmit(WsEventClient.EscapePassed);
        expect(component['handleEscape']).toHaveBeenCalledWith(true);

        socketHelper.peerSideEmit(WsEventClient.AttackFailed);
        expect(component['handleAttack']).toHaveBeenCalledWith(false);

        socketHelper.peerSideEmit(WsEventClient.AttackPassed);
        expect(component['handleAttack']).toHaveBeenCalledWith(true);

        socketHelper.peerSideEmit(WsEventClient.FighterGiveUp);
        expect(component['fighterGiverUp']).toHaveBeenCalled();

        spyOn(component as any, 'addDefenderFighterLife');
        socketHelper.peerSideEmit(WsEventClient.AddDefenderLife);
        expect(component['addDefenderFighterLife']).toHaveBeenCalled();

        spyOn(component as any, 'swapFightersLives');
        socketHelper.peerSideEmit(WsEventClient.SwapFightersLives);
        expect(component['swapFightersLives']).toHaveBeenCalled();
    });

    it('should remove socket listeners', () => {
        component['removeSocketListeners']();
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.UpdateRemainFightingTime);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.UpdateCurrentAttacker);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.DecrementFighterLife);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.RollDiceResult);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.EscapeFailed);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.EscapePassed);
        expect(socketService.off).toHaveBeenCalledWith(WsEventClient.FighterGiveUp);
    });

    it('should add 2 to opponent fighter life when isAttacker is true', () => {
        component.isAttacker = true;
        component.opponentFighter = { life: 5 } as any;

        component['addDefenderFighterLife']();

        expect(component.opponentFighter.life).toEqual(7);
    });

    it('should add 2 to my fighter life when isAttacker is false', () => {
        component.isAttacker = false;
        component.myFighter = { life: 5 } as any;

        component['addDefenderFighterLife']();

        expect(component.myFighter.life).toEqual(7);
    });

    it('should swap the life values of myFighter and opponentFighter', () => {
        component.myFighter = { life: 5 } as any;
        component.opponentFighter = { life: 10 } as any;

        component['swapFightersLives']();

        expect(component.myFighter.life).toEqual(10);
        expect(component.opponentFighter.life).toEqual(5);
    });
});
