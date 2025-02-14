import { NgStyle } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { AVERAGE_TIME_COLOR, END_TIME_COLOR, HALF_TIME, LAST_TIME, PLENTY_TIME_COLOR } from '@app/constants/consts';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { Fighter } from '@common/interfaces/player-infos';

@Component({
    selector: 'app-chronometer',
    standalone: true,
    imports: [NgStyle],
    templateUrl: './chronometer.component.html',
    styleUrl: './chronometer.component.scss',
})
export class ChronometerComponent implements OnDestroy {
    isFighting: boolean;
    isChoosingItem: boolean;
    remainingTime: number;
    attacker: Fighter;
    defender: Fighter;

    constructor(private socketClientService: SocketClientService) {
        this.isFighting = false;
        this.isChoosingItem = false;
        this.remainingTime = 0;
        this.configureSocketClientEvents();
    }

    get backgroundColor(): string {
        if (this.remainingTime > HALF_TIME) {
            return PLENTY_TIME_COLOR;
        }
        if (this.remainingTime > LAST_TIME) {
            return AVERAGE_TIME_COLOR;
        }
        return END_TIME_COLOR;
    }

    ngOnDestroy(): void {
        this.socketClientService.off(WsEventClient.UpdateRemainTime);
        this.socketClientService.off(WsEventClient.TimerPauseForChoosingItem);
        this.socketClientService.off(WsEventClient.TimerPauseForFight);
        this.socketClientService.off(WsEventClient.TimerResume);
    }
    private configureSocketClientEvents(): void {
        this.socketClientService.on<number>(WsEventClient.UpdateRemainTime, (remainTime) => (this.remainingTime = remainTime));
        this.socketClientService.on(WsEventClient.TimerPauseForFight, () => {
            this.socketClientService.send(WsEventServer.GetFighters, (data: FightParticipants) => {
                this.attacker = data.attacker;
                this.defender = data.defender;
                this.isFighting = true;
            });
        });
        this.socketClientService.on(WsEventClient.TimerPauseForChoosingItem, () => (this.isChoosingItem = true));
        this.socketClientService.on(WsEventClient.TimerResume, () => {
            this.isFighting = false;
            this.isChoosingItem = false;
        });
    }
}
