import * as io from 'socket.io';
import * as http from 'http';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { PartySetUpManagerService } from '@app/services/party-set-up-manager/party-set-up-manager.service';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { ResponseAccessCode } from '@common/interfaces/response-code';
import { GameService } from '@app/services/game/game.service';
import { ChatMessageService } from '@app/services/chat-message/chat-message.service';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { ChatMessage } from '@common/interfaces/chat-message';
import { PartyService } from '@app/services/party/party.service';
import { SetUpPartyParams } from '@common/interfaces/set-up-party-params';
import { Container, Service } from 'typedi';
import { PartyManagerService } from '@app/services/party-manager/party-manager.service';
import { Coordinate } from '@common/interfaces/coordinate';
import { PartyInfos } from '@common/interfaces/party';
import { GameLogs } from '@common/interfaces/game-logs';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { Game } from '@common/interfaces/game';
import { ItemType } from '@common/enums/item';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';
import { PartyStatistic } from '@common/interfaces/party-statistics';
import { BotProfile } from '@common/enums/virtual-player-profile';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { SOCKET_CONNECTION_OPTIONS } from '@app/utils/const';

@Service()
export class SocketManagerService {
    private sio: io.Server;
    private partyStatService: PartyStatisticsService = Container.get(PartyStatisticsService);
    private virtualPlayerService: VirtualPlayerService = Container.get(VirtualPlayerService);
    private partyService: PartyService = Container.get(PartyService);
    private partySetUpManager: PartySetUpManagerService = Container.get(PartySetUpManagerService);
    private gameService: GameService = Container.get(GameService);
    private chatMessageService: ChatMessageService = Container.get(ChatMessageService);
    private partyManagerService: PartyManagerService = Container.get(PartyManagerService);
    init(server: http.Server): void {
        this.sio = new io.Server(server, SOCKET_CONNECTION_OPTIONS);
        PartyHelper.init(this.sio);
        this.handleSockets();
    }

    handleSockets(): void {
        this.sio.on('connection', (socket: io.Socket) => {
            this.configureChatMessage(socket);
            this.configureCharacterUpdate(socket);
            this.configurePartyManagement(socket);
            this.configureDisconnect(socket);
            this.configureGameModification(socket);
            this.configureAccessCode(socket);
            this.configureGameEvents(socket);
        });
    }

    private disconnect(socket: io.Socket, reason: string) {
        // nous avons besoins de ca pour nous informer sur les deconnexions a des fins de deboggage
        // eslint-disable-next-line no-console
        console.log(`Deconnexion par l'utilisateur avec id : ${socket.id}`);
        // nous avons besoins de ca pour nous informer sur les deconnexions des joueurs pour des raison de controles
        // eslint-disable-next-line no-console
        console.log(`Raison de deconnexion : ${reason}`);
    }

    private async gameModified() {
        const updatedGames: Game[] = await this.gameService.getGames();
        this.sio.emit(WsEventClient.GameListUpdated, updatedGames);
    }

    private getPlayerInfo(socket: io.Socket, setPlayerInfo: (playerInfo: PlayerInfos) => void) {
        const partyId = PartyHelper.getPartyId(socket);
        const player = this.partyService.getPlayer(partyId, socket.id);
        if (!player) return;
        setPlayerInfo(player);
    }

    private configureAccessCode(socket: io.Socket): void {
        socket.on(WsEventServer.ValidateAccessCode, (accessCode: number, callback: (response: ResponseAccessCode) => void) => {
            this.partySetUpManager.validateAccessCode(socket, accessCode, callback);
        });
    }
    private configureGameModification(socket: io.Socket): void {
        socket.on(WsEventServer.GameModified, async () => {
            this.gameModified();
        });
    }
    private configureDisconnect(socket: io.Socket): void {
        socket.on(WsEventServer.Disconnect, (reason: string) => {
            this.disconnect(socket, reason);
        });

        socket.on(WsEventServer.Disconnecting, () => {
            if (!PartyHelper.isInParty(socket)) return;
            if (this.partyManagerService.getPartyManager(socket)) return this.partyManagerService.giveUp(socket);
            if (PartyHelper.isOrganizer(socket)) return this.partySetUpManager.endParty(socket);
            this.partySetUpManager.leaveParty(socket, socket.id);
        });
    }
    private configureChatMessage(socket: io.Socket): void {
        socket.on(WsEventServer.GetMessages, (setMessages: (messages: ChatMessage[]) => void) => {
            if (PartyHelper.isInParty(socket)) this.chatMessageService.getMessages(socket, setMessages);
        });

        socket.on(WsEventServer.GetPlayerInfos, (setPlayerInfo: (playerInfo: PlayerInfos) => void) => {
            if (PartyHelper.isInParty(socket)) this.getPlayerInfo(socket, setPlayerInfo);
        });

        socket.on(WsEventServer.SendMessage, (message: ChatMessage) => {
            if (PartyHelper.isInParty(socket)) this.chatMessageService.sendMessage(socket, message);
        });
    }

    private configureCharacterUpdate(socket: io.Socket): void {
        socket.on(WsEventServer.GetOccupiedCharacters, (callback: (charactersOccupied: number[]) => void) => {
            if (PartyHelper.isInParty(socket)) this.partySetUpManager.getCharactersOccupied(socket, callback);
        });

        socket.on(WsEventServer.CharacterOccupiedUpdated, (newCharacterSelected: number) => {
            if (PartyHelper.isInParty(socket)) this.partySetUpManager.updateCharacterOccupied(socket, newCharacterSelected);
        });
    }

    private configurePartyManagement(socket: io.Socket): void {
        this.handleCreateParty(socket);
        this.handleToggleLockParty(socket);
        this.handleSetUpPartyInfos(socket);
        this.handleLeaveParty(socket);
        this.handleAddVirtualPlayer(socket);
        this.handleJoinParty(socket);
        this.handleEjectPlayer(socket);
    }

    private handleAddVirtualPlayer(socket: io.Socket) {
        socket.on(WsEventServer.AddVirtualPlayer, (profile: BotProfile) => {
            this.virtualPlayerService.addVirtualPlayer(socket, profile);
        });
    }

    private handleCreateParty(socket: io.Socket): void {
        socket.on(WsEventServer.CreateParty, async (gid: string, callback: (isSuccessful: boolean, result: string[]) => void) => {
            await this.partySetUpManager.createParty(socket, gid, callback);
        });
    }

    private handleToggleLockParty(socket: io.Socket): void {
        socket.on(WsEventServer.ToggleLockParty, (callback: (isLocked: boolean) => void) => {
            if (PartyHelper.isInParty(socket)) this.partySetUpManager.toggleLockParty(socket, callback);
        });
    }

    private handleSetUpPartyInfos(socket: io.Socket): void {
        socket.on(WsEventServer.SetUpParty, (callback: (data: SetUpPartyParams) => void) => {
            if (PartyHelper.isInParty(socket)) this.partySetUpManager.setUpPartyInfos(socket, callback);
        });
    }

    private handleLeaveParty(socket: io.Socket): void {
        socket.on(WsEventServer.LeaveParty, () => {
            if (!PartyHelper.isInParty(socket)) return;
            if (PartyHelper.isOrganizer(socket)) this.partySetUpManager.endParty(socket);
            else this.partySetUpManager.leaveParty(socket, socket.id);
        });
    }

    private handleEjectPlayer(socket: io.Socket): void {
        socket.on(WsEventServer.EjectPlayer, (playerId: string) => {
            if (PartyHelper.isInParty(socket)) this.partySetUpManager.leaveParty(socket, playerId, true);
        });
    }

    private handleJoinParty(socket: io.Socket): void {
        socket.on(WsEventServer.JoinParty, (player: PlayerInfos, callback: (isSuccessful: boolean) => void) => {
            if (PartyHelper.isInParty(socket)) this.partySetUpManager.joinParty(socket, player, callback);
        });
    }

    private configureGameEvents(socket: io.Socket): void {
        this.handleStartGame(socket);
        this.handleGetPartyInfos(socket);
        this.handleGetPlayer(socket);
        this.handleGetAvailablePositions(socket);
        this.handleGetInteractivePositions(socket);
        this.handleGetPath(socket);
        this.handleStartAction(socket);
        this.handlePlayerStartMoving(socket);
        this.handleGiveUp(socket);
        this.handleEndRound(socket);
        this.handleGetLogGames(socket);
        this.handleGetPartyStatistics(socket);
        this.handleGetFighters(socket);
        this.handleAttack(socket);
        this.handleEscape(socket);
        this.handleFightingGiveUp(socket);
        this.handleDeleteParty(socket);
        this.handleGetAllPlayers(socket);
        this.handleTogglePartyMode(socket);
        this.handleTeleportPlayer(socket);
        this.handleGetPartyDebugMode(socket);
        this.handleItemToRemoveChosen(socket);
    }

    private handleStartGame(socket: io.Socket): void {
        socket.on(WsEventServer.StartGame, () => {
            this.partyManagerService.startGame(socket);
        });
    }

    private handleGetPartyInfos(socket: io.Socket): void {
        socket.on(WsEventServer.GetPartyInfos, (setPartyInfos: (partyInfos: PartyInfos) => void) => {
            this.partyManagerService.getPartyInfos(socket, setPartyInfos);
        });
    }

    private handleGetPlayer(socket: io.Socket): void {
        socket.on(WsEventServer.GetPlayer, (setPlayerInfos: (player: PlayerInfos) => void) => {
            const player = this.partyService.getPlayer(PartyHelper.getPartyId(socket), socket.id);
            setPlayerInfos(player);
        });
    }

    private handleGetAvailablePositions(socket: io.Socket): void {
        socket.on(WsEventServer.GetAvailablePositions, (callback: (accessPositions: Coordinate[]) => void) => {
            this.partyManagerService.getAccessiblePositions(socket, callback);
        });
    }

    private handleGetInteractivePositions(socket: io.Socket): void {
        socket.on(WsEventServer.GetInteractivePositions, (callback: (interactivePositions: Coordinate[]) => void) => {
            this.partyManagerService.getInteractivePositions(socket, callback);
        });
    }

    private handleGetPath(socket: io.Socket): void {
        socket.on(WsEventServer.GetPath, (endPosition: Coordinate, callback: (path: Coordinate[]) => void) => {
            this.partyManagerService.getPath(socket, endPosition, callback);
        });
    }

    private handleStartAction(socket: io.Socket): void {
        socket.on(WsEventServer.StartAction, (position: Coordinate) => {
            this.partyManagerService.executeAction(socket, position);
        });
    }

    private handlePlayerStartMoving(socket: io.Socket): void {
        socket.on(WsEventServer.PlayerStartMoving, async (finalPosition: Coordinate) => {
            await this.partyManagerService.movePlayer(socket, finalPosition);
        });
    }

    private handleGiveUp(socket: io.Socket): void {
        socket.on(WsEventServer.GiveUp, () => {
            this.partyManagerService.giveUp(socket);
        });
    }

    private handleEndRound(socket: io.Socket): void {
        socket.on(WsEventServer.EndRound, () => {
            this.partyManagerService.endRound(socket);
        });
    }

    private handleGetLogGames(socket: io.Socket): void {
        socket.on(WsEventServer.GetLogGames, (callback: (logs: GameLogs[]) => void) => {
            callback(this.partyService.getLogs(PartyHelper.getPartyId(socket), socket.id));
        });
    }

    private handleGetPartyStatistics(socket: io.Socket): void {
        socket.on(WsEventServer.GetPartyStatistics, (setPartyStatistic: (partyStatistic: PartyStatistic | null) => void) => {
            setPartyStatistic(this.partyStatService.getPartyStatistic(PartyHelper.getPartyId(socket)));
            this.partyManagerService.deletePartyManager(socket);
        });
    }

    private handleGetFighters(socket: io.Socket): void {
        socket.on(WsEventServer.GetFighters, (callback: (data: FightParticipants) => void) => {
            this.partyManagerService.getFighters(socket, callback);
        });
    }

    private handleAttack(socket: io.Socket): void {
        socket.on(WsEventServer.Attack, async () => {
            await this.partyManagerService.handleAttack(socket);
        });
    }

    private handleEscape(socket: io.Socket): void {
        socket.on(WsEventServer.Escape, async () => {
            await this.partyManagerService.handleEscape(socket);
        });
    }

    private handleFightingGiveUp(socket: io.Socket): void {
        socket.on(WsEventServer.FightingGiveUp, async () => {
            await this.partyManagerService.handleGiveUpInFight(socket);
        });
    }

    private handleDeleteParty(socket: io.Socket): void {
        socket.on(WsEventServer.DeleteParty, () => {
            const partyId = PartyHelper.getPartyId(socket);
            const humanActivePlayers = this.partyService.getPlayers(partyId).filter((player) => !(player.isGiveUp || player.isVirtualPlayer));
            if (humanActivePlayers.length > 1) {
                this.partyService.removePlayer(partyId, socket.id);
                PartyHelper.removePlayerFromParty(socket.id, partyId);
                return;
            }
            this.partyManagerService.deletePartyManager(socket);
            this.partyStatService.deletePartyStatistic(partyId);
            this.partyService.deleteParty(partyId);
        });
    }

    private handleGetAllPlayers(socket: io.Socket): void {
        socket.on(WsEventServer.GetAllPlayers, (callback: (players: PlayerInfos[]) => void) => {
            callback(this.partyService.getOrderPlayers(PartyHelper.getPartyId(socket)));
        });
    }

    private handleGetPartyDebugMode(socket: io.Socket): void {
        socket.on(WsEventServer.GetPartyDebugMode, (callback: (isDebugMode: boolean) => void) => {
            callback(this.partyService.isDebugMode(PartyHelper.getPartyId(socket)));
        });
    }

    private handleTogglePartyMode(socket: io.Socket): void {
        socket.on(WsEventServer.TogglePartyDebugMode, () => {
            this.partyManagerService.toggleDebugMode(socket);
        });
    }

    private handleTeleportPlayer(socket: io.Socket): void {
        socket.on(WsEventServer.TeleportPlayer, (pos: Coordinate) => {
            this.partyManagerService.teleportPlayerTo(socket, pos);
        });
    }

    private handleItemToRemoveChosen(socket: io.Socket) {
        socket.on(WsEventServer.RemoveItemChosen, (item: ItemType) => {
            this.partyManagerService.removePlayerItem(socket, item);
        });
    }
}
