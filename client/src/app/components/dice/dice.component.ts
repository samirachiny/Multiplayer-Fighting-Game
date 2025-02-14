import { Component, Input, OnDestroy } from '@angular/core';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient } from '@common/enums/web-socket-event';
import { Dice } from '@common/enums/dice';
import { DiceRollResult } from '@common/interfaces/dice';
import { NO_DICE_NUMBER_SYMBOL } from '@app/constants/consts';

@Component({
    selector: 'app-dice',
    standalone: true,
    imports: [],
    templateUrl: './dice.component.html',
    styleUrl: './dice.component.scss',
})
export class DiceComponent implements OnDestroy {
    @Input() dice: Dice | null;
    @Input() playerId: string;
    d6: Dice = Dice.D6;
    d4: Dice = Dice.D4;
    diceValue: number | string;

    constructor(private socketClientService: SocketClientService) {
        this.d6 = Dice.D6;
        this.d4 = Dice.D4;
        this.diceValue = NO_DICE_NUMBER_SYMBOL;
        this.socketClientService.on(WsEventClient.RollDiceResult, (diceRollResult: DiceRollResult) => this.updateDiceValue(diceRollResult));
        this.socketClientService.on(WsEventClient.UpdateCurrentAttacker, () => this.resetDiceValue());
    }

    ngOnDestroy(): void {
        this.socketClientService.off(WsEventClient.RollDiceResult);
        this.socketClientService.off(WsEventClient.UpdateCurrentAttacker);
    }

    private updateDiceValue(diceRollResult: DiceRollResult): void {
        if (diceRollResult.pid === this.playerId && diceRollResult.type === this.dice) {
            this.diceValue = diceRollResult.result;
        }
    }

    private resetDiceValue(): void {
        this.diceValue = NO_DICE_NUMBER_SYMBOL;
    }
}
