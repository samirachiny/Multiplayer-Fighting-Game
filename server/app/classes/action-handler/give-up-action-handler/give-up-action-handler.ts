import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { RespawnManager } from '@app/classes/respawn-manager/respawn-manager';
import { TurnManager } from '@app/classes/turn-manager/turn-manager';
import { PartyEventListener } from '@app/services/party-listener/party-listener.service';
import { PartyService } from '@app/services/party/party.service';
import { LogTypeEvent } from '@common/enums/log-type';
import { SendingOptions } from '@common/enums/sending-options';
import { WsEventClient } from '@common/enums/web-socket-event';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { Container } from 'typedi';

export class GiveUpActionHandler {
    private partyService: PartyService;
    private partyEventListener: PartyEventListener;

    constructor(
        private partyId: string,
        private turnManager: TurnManager,
        private respawnManager: RespawnManager,
    ) {
        this.partyService = Container.get(PartyService);
        this.partyEventListener = Container.get(PartyEventListener);
    }

    giveUp(playerId: string): boolean {
        if (this.isPlayerAlreadyGivenUp(playerId)) return false;
        this.processPlayerGiveUp(playerId);
        if (this.isOnlyOnePlayerLeft() || this.isOnlyVirtualPlayersLeft()) {
            this.sendAllPlayerGiveUpSignal();
            return true;
        }
        this.deactivateDebugModeIfNeeded(playerId);
        this.handleEndRoundIfCurrentPlayer(playerId);
        this.notifyPlayerGiveUp(playerId);
        return false;
    }

    private deactivateDebugModeIfNeeded(playerId: string) {
        if (this.isUnableToDeactivateDebugMode(playerId)) return;
        this.partyService.setPartyDebugMode(this.partyId, false);
        PartyHelper.sendEvent(this.partyId, WsEventClient.PartyModeToggled, false);
    }

    private isUnableToDeactivateDebugMode(playerId: string) {
        const isOrganizer = this.partyService.getPlayer(this.partyId, playerId)?.isOrganizer;
        const isDebugMode = this.partyService.isDebugMode(this.partyId);
        return !(isOrganizer && isDebugMode);
    }

    private isPlayerAlreadyGivenUp(playerId: string): boolean {
        if (!this.partyService.getPlayer(this.partyId, playerId)) return true;
        return this.partyService.getPlayer(this.partyId, playerId).isGiveUp;
    }

    private processPlayerGiveUp(playerId: string): void {
        this.partyService.setPlayerGiveUp(this.partyId, playerId);
        this.respawnManager.replaceItems(playerId, this.partyService.getPlayer(this.partyId, playerId).currentPosition);
        this.partyEventListener.emit(LogTypeEvent.GiveUp, {
            partyId: this.partyId,
            logParameters: { event: LogTypeEvent.GiveUp, playerIds: [playerId] },
            options: SendingOptions.Broadcast,
        });
    }

    private handleEndRoundIfCurrentPlayer(playerId: string): void {
        const player = this.partyService.getPlayer(this.partyId, playerId);
        if (player && player.isCurrentPlayer) this.turnManager.endRound(playerId);
    }

    private notifyPlayerGiveUp(playerId: string): void {
        const player = this.partyService.getPlayer(this.partyId, playerId);
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerGiveUp, player);
        PartyHelper.sendEvent(this.partyId, WsEventClient.PlayerListUpdated, this.partyService.getOrderPlayers(this.partyId));
    }

    private isOnlyOnePlayerLeft(): boolean {
        return this.partyService.getPlayers(this.partyId).filter((player: PlayerInfos) => !player.isGiveUp).length === 1;
    }

    private isOnlyVirtualPlayersLeft(): boolean {
        const humanActivePlayers = this.partyService
            .getPlayers(this.partyId)
            .filter((player: PlayerInfos) => !(player.isVirtualPlayer || player.isGiveUp));
        return humanActivePlayers.length === 0;
    }

    private sendAllPlayerGiveUpSignal() {
        PartyHelper.sendEvent(this.partyId, WsEventClient.AllPlayersGaveUp);
    }
}
