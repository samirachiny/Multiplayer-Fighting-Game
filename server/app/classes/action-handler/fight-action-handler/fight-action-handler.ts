import { CombatManager } from '@app/classes/combat-manager/combat-manager';
import { MapManager } from '@app/classes/map-manager/map-manager';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { PartyService } from '@app/services/party/party.service';
import { sameCoordinate } from '@app/utils/helper';
import { LogTypeEvent } from '@common/enums/log-type';
import { SendingOptions } from '@common/enums/sending-options';
import { Coordinate } from '@common/interfaces/coordinate';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { Fighter, PlayerInfos } from '@common/interfaces/player-infos';
import { Observable } from 'rxjs';
import { Container } from 'typedi';
import { EndFightEvent } from '@common/types/end-fight-event';

export class FightActionHandler {
    readonly combatManager: CombatManager;
    private partyService: PartyService;
    private partyEventListener: PartyEventListener;
    private respawnManager: RespawnManager;

    constructor(
        private partyId: string,
        private turnManager: TurnManager,
        private mapManager: MapManager,
    ) {
        this.partyService = Container.get(PartyService);
        this.partyEventListener = Container.get(PartyEventListener);
        this.respawnManager = new RespawnManager(partyId, this.mapManager);
        this.combatManager = new CombatManager(partyId, this.respawnManager, turnManager);
    }

    destroy() {
        this.combatManager.resetAll();
    }

    initFight(playerId: string, pos: Coordinate, isTurnOver: boolean) {
        this.partyService.decrementRemainingAction(this.partyId, playerId);
        this.turnManager.pauseTurnTimer();
        const enemyId = this.resolveEnemy(pos).pid;
        this.combatManager.initFight(this.initFighter(playerId), this.initFighter(enemyId), isTurnOver);
        this.partyEventListener.emit(LogTypeEvent.StartCombat, {
            partyId: this.partyId,
            logParameters: { event: LogTypeEvent.StartCombat, playerIds: [playerId, enemyId] },
            options: SendingOptions.Broadcast,
        });
    }

    getFighters(): FightParticipants {
        return this.combatManager.getFighters();
    }

    getFightEndEventSignal(): Observable<EndFightEvent> {
        return this.combatManager.endFightEvent$;
    }

    async handleGiveUp(playerId: string): Promise<void> {
        await this.combatManager.handleGiveUp(playerId);
    }

    async handleAttack() {
        await this.combatManager.handleAttack();
    }

    async handleEscape() {
        await this.combatManager.handleEvasion();
    }

    private resolveEnemy(pos: Coordinate): PlayerInfos {
        for (const player of this.partyService.getPlayers(this.partyId)) {
            if (sameCoordinate(pos, { x: player.currentPosition.y, y: player.currentPosition.x })) return player;
        }
        return null;
    }

    private initFighter(playerId: string): Fighter {
        const player = this.partyService.getPlayer(this.partyId, playerId);
        const isOnIce = this.mapManager.isIce({ x: player.currentPosition.y, y: player.currentPosition.x });
        return {
            pid: player.pid,
            name: player.name,
            character: player.character,
            speed: player.speed,
            attack: isOnIce ? player.attack - 2 : player.attack,
            defense: isOnIce ? player.defense - 2 : player.defense,
            life: player.life,
            remainEscape: 2,
            diceAssignment: player.diceAssignment,
            hasSecondChanceEffect: player.hasSecondChanceEffect,
            hasSwapOpponentLifeEffect: player.hasSwapOpponentLifeEffect,
            isVirtualPlayer: player.isVirtualPlayer,
            virtualPlayerProfile: player.virtualPlayerProfile,
        };
    }
}
