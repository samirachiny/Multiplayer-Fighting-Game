import * as io from 'socket.io';
import { PartyManager } from '@app/classes/party-manager/party-manager';
import { Service } from 'typedi';
import { PartyInfos } from '@common/interfaces/party';
import { Coordinate } from '@common/interfaces/coordinate';
import { PartyHelper } from '@app/classes/party-helper/party-helper';

import { WsEventClient } from '@common/enums/web-socket-event';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { ItemType } from '@common/enums/item';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';
import { PartyService } from '@app/services/party/party.service';

@Service()
export class PartyManagerService {
    private partyManagers: Map<string, PartyManager> = new Map<string, PartyManager>();

    constructor(
        private partyStatService: PartyStatisticsService,
        private partyService: PartyService,
    ) {}

    startGame(socket: io.Socket) {
        const partyId = PartyHelper.getPartyId(socket);
        if (this.partyManagers.get(partyId)) return;
        const partyManager = new PartyManager(partyId);
        PartyHelper.sendEvent(partyId, WsEventClient.StartGame);
        partyManager.startGame();
        this.partyManagers.set(partyId, partyManager);
    }

    getPartyManager(socket: io.Socket): PartyManager {
        const partyId = PartyHelper.getPartyId(socket);
        const partyManager = this.partyManagers.get(partyId);
        return partyManager;
    }

    getPartyInfos(socket: io.Socket, setPartyInfos: (partyInfos: PartyInfos) => void): void {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) partyManager.getPartyInfos(setPartyInfos);
    }

    getFighters(socket: io.Socket, callback: (data: FightParticipants) => void) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) callback(partyManager.getFighters());
    }

    getAccessiblePositions(socket: io.Socket, callback: (positions: Coordinate[]) => void): void {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) callback(partyManager.getAccessiblePositions(socket.id));
    }

    getInteractivePositions(socket: io.Socket, callback: (interactivePositions: Coordinate[]) => void) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) callback(partyManager.getInteractivePositions(socket.id));
    }

    getPath(socket: io.Socket, endPosition: Coordinate, callback: (path: Coordinate[]) => void): void {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) callback(partyManager.getPath(socket.id, endPosition));
    }

    giveUp(socket: io.Socket) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager && partyManager.giveUp(socket.id)) {
            const partyId = PartyHelper.getPartyId(socket);
            this.deletePartyManager(socket);
            this.partyService.deleteParty(partyId);
            this.partyStatService.deletePartyStatistic(partyId);
        }
    }

    executeAction(socket: io.Socket, position: Coordinate) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) partyManager.executeAction(socket.id, position);
    }

    async handleAttack(socket: io.Socket) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) await partyManager.handleAttack();
    }

    async handleGiveUpInFight(socket: io.Socket) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager && (await partyManager.handleGiveUpInFight(socket.id))) {
            this.deletePartyManager(socket);
        }
    }

    async handleEscape(socket: io.Socket) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) await partyManager.handleEscape();
    }

    removePlayerItem(socket: io.Socket, item: ItemType) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) partyManager.removePlayerItem(socket.id, item);
    }

    async movePlayer(socket: io.Socket, finalPosition: Coordinate) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) await partyManager.movePlayer(socket.id, finalPosition);
    }

    teleportPlayerTo(socket: io.Socket, pos: Coordinate) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) partyManager.teleportPlayerTo(socket.id, pos);
    }

    endRound(socket: io.Socket) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) partyManager.endRound(socket.id);
    }

    toggleDebugMode(socket: io.Socket) {
        const partyManager = this.getPartyManager(socket);
        if (partyManager) partyManager.toggleDebugMode(socket.id);
    }

    deletePartyManager(socket: io.Socket) {
        const partyManager = this.getPartyManager(socket);
        if (!partyManager) return;
        partyManager.destroy();
        this.partyManagers.delete(PartyHelper.getPartyId(socket));
    }
}
