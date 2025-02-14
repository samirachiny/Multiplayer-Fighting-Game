import { Component, ElementRef, OnInit, ViewChild, AfterViewChecked, OnDestroy, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { StopDKeyDirective } from '@app/directives/stop-d-key/stop-d-key.directive';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { ChatMessage } from '@common/interfaces/chat-message';
import { PlayerInfos } from '@common/interfaces/player-infos';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [FormsModule, DatePipe, MatIcon, MatRipple, StopDKeyDirective],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
    @ViewChild('messagesContainer') messageContainer: ElementRef;
    @Input() showImage: boolean;
    messages: ChatMessage[];
    playerInfo: PlayerInfos;
    newMessage: string;
    private isNewMessageReceived: boolean;

    constructor(private socketClientService: SocketClientService) {
        this.messages = [];
        this.newMessage = '';
        this.isNewMessageReceived = false;
    }

    ngOnInit(): void {
        this.socketClientService.on(WsEventClient.PartyMessage, (message: ChatMessage) => {
            this.messages.push(message);
            this.isNewMessageReceived = true;
        });
        this.socketClientService.send(WsEventServer.GetMessages, (messages: ChatMessage[]) => {
            this.messages = messages;
        });
        this.socketClientService.send(WsEventServer.GetPlayerInfos, (playerInfo: PlayerInfos) => {
            this.playerInfo = playerInfo;
        });
    }

    sendMessage() {
        if (!this.newMessage.trim()) return;
        this.socketClientService.send(WsEventServer.SendMessage, {
            senderId: this.playerInfo.pid,
            senderName: this.playerInfo.name,
            message: this.newMessage.trim(),
        });
        this.newMessage = '';
        this.isNewMessageReceived = true;
    }

    ngAfterViewChecked() {
        if (!(this.messageContainer && this.isNewMessageReceived)) return;
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
        this.isNewMessageReceived = false;
    }

    ngOnDestroy() {
        this.socketClientService.off(WsEventClient.PartyMessage);
    }
}
