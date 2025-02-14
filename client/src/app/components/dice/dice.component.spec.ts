/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiceComponent } from './dice.component';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient } from '@common/enums/web-socket-event';
import { Dice } from '@common/enums/dice';
import { DiceRollResult } from '@common/interfaces/dice';
import { SocketTestHelper } from '@app/classes/socket-test-helper/socket-test-helper';
import { SocketClientServiceMock } from '@app/classes/socket-client-service-mock/socket-client-service-mock';

describe('DiceComponent', () => {
    let component: DiceComponent;
    let fixture: ComponentFixture<DiceComponent>;
    let socketClientService: SocketClientService;
    let socketHelper: SocketTestHelper;
    const mockPlayerId = 'player1';
    const mockDiceRollResult: DiceRollResult = { pid: mockPlayerId, type: Dice.D6, result: 4 };

    beforeEach(async () => {
        socketClientService = new SocketClientServiceMock();
        socketHelper = socketClientService['socket'] as any as SocketTestHelper;
        await TestBed.configureTestingModule({
            imports: [DiceComponent],
            providers: [{ provide: SocketClientService, useValue: socketClientService }],
        }).compileComponents();
        spyOn(socketClientService, 'on').and.callThrough();
        spyOn(socketClientService, 'off');
        fixture = TestBed.createComponent(DiceComponent);
        component = fixture.componentInstance;
        socketClientService = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;

        component.dice = Dice.D6;
        component.playerId = mockPlayerId;
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should update diceValue on ROLL_DICE_RESULT event when playerId and dice match', () => {
        socketHelper.peerSideEmit(WsEventClient.RollDiceResult, mockDiceRollResult);
        expect(component.diceValue).toBe(mockDiceRollResult.result);
    });

    it('should ignore ROLL_DICE_RESULT event when playerId does not match', () => {
        const rollDice = { ...mockDiceRollResult, pid: 'wrongPlayerId' };
        socketHelper.peerSideEmit(WsEventClient.RollDiceResult, rollDice);
        expect(component.diceValue).toEqual('?');
    });

    it('should reset diceValue to "?" on UPDATE_CURRENT_ATTACKER event', () => {
        component.diceValue = 5;
        socketHelper.peerSideEmit(WsEventClient.UpdateCurrentAttacker);
        expect(component.diceValue as any).toEqual('?');
    });

    it('should unsubscribe from events on component destruction', () => {
        component.ngOnDestroy();
        expect(socketClientService.off).toHaveBeenCalledWith(WsEventClient.RollDiceResult);
        expect(socketClientService.off).toHaveBeenCalledWith(WsEventClient.UpdateCurrentAttacker);
    });
});
