/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ChatMessageService } from '@app/services/chat-message/chat-message.service';
import * as io from 'socket.io';
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { WsEventClient } from '@common/enums/web-socket-event';
import { ChatMessage } from '@common/interfaces/chat-message';
import { PartyService } from '@app/services/party/party.service';
import { PlayerInfos } from '@common/interfaces/player-infos';

describe('ChatMessageService', () => {
    let chatMessageService: ChatMessageService;
    let sioStub: any;
    let socket: any;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    beforeEach(() => {
        partyServiceStub = sinon.createStubInstance(PartyService);
        partyServiceStub.getPlayer.returns({ character: { imagePath: '' } } as PlayerInfos);
        chatMessageService = new ChatMessageService(partyServiceStub);
        sioStub = {
            to: sinon.stub().returns(sioStub),
            emit: sinon.stub().returns(sioStub),
        };
        socket = { id: 'player1' };
        PartyHelper.init(sioStub);
    });

    // Restauration des mocks après chaque test
    afterEach(() => {
        sinon.restore();
    });

    describe('getMessages', () => {
        it('should call setMessages with chat messages from the correct party', () => {
            const partyId = 'party-id';
            const chatMessages: ChatMessage[] = [{ message: 'Hello', timestamp: new Date(), senderName: 'user1' }];
            const partyIdStub = sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
            partyServiceStub.getChatMessages.returns(chatMessages);
            const setMessages = sinon.spy();
            chatMessageService.getMessages(socket as unknown as io.Socket, setMessages);
            expect(partyIdStub.calledWith(socket)).to.be.true;
            expect(setMessages.calledWith(chatMessages)).to.be.true;
        });
    });

    describe('sendMessage', () => {
        it('should send a message to the correct party room', () => {
            const partyId = 'party-id';
            const message: ChatMessage = { message: 'Hello', senderName: 'user1' };
            const partyIdStub = sinon.stub(PartyHelper, 'getPartyId').returns(partyId);

            chatMessageService.sendMessage(socket as unknown as io.Socket, message);
            expect(partyIdStub.calledWith(socket)).to.be.true;
            expect(partyServiceStub.addMessageToChat.calledWith(partyId, message)).to.be.true;
            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.PartyMessage, message)).to.be.true;
        });
    });
});
