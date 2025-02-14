import { ChatMessage } from '@common/interfaces/chat-message';
import * as io from 'socket.io';
import { Service } from 'typedi';
import { PartyService } from '@app/services/party/party.service';
import { WsEventClient } from '@common/enums/web-socket-event';
import { PartyHelper } from '@app/classes/party-helper/party-helper';

@Service()
export class ChatMessageService {
    constructor(private partyService: PartyService) {}

    getMessages(socket: io.Socket, setMessages: (messages: ChatMessage[]) => void): void {
        const partyId: string = PartyHelper.getPartyId(socket);
        setMessages(this.partyService.getChatMessages(partyId));
    }

    sendMessage(socket: io.Socket, message: ChatMessage): void {
        const partyId = PartyHelper.getPartyId(socket);
        message.timestamp = new Date();
        message.senderId = socket.id;
        message.characterImage = this.partyService.getPlayer(partyId, socket.id).character.imagePath;
        this.partyService.addMessageToChat(partyId, message);
        PartyHelper.sendEvent(partyId, WsEventClient.PartyMessage, message);
    }
}
