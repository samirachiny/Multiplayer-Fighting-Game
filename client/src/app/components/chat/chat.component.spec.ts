/* eslint-disable @typescript-eslint/ban-types */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatComponent } from './chat.component';
import { WsEventClient, WsEventServer } from '@common/enums/web-socket-event';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { ElementRef } from '@angular/core';
import { Dice } from '@common/enums/dice';
import { Character } from '@common/interfaces/character';
import { ChatMessage } from '@common/interfaces/chat-message';
import { PlayerInfos } from '@common/interfaces/player-infos';

const mockMessages: ChatMessage[] = [{ senderName: 'User', message: 'Test message' }];

const mockPlayerInfo = {
    pid: 'test-pid',
    name: 'player-name',
    character: {
        id: 4,
        name: 'Raissa de Rohan',
        imagePath: './assets/img/characters/character5.png',
        story: 'Issue de la noblesse, Raissa utilise sa sagesse et son intelligence pour négocier la paix entre les royaumes en conflit.',
    } as Character,
    isOrganizer: false,
    speed: 4,
    attack: 4,
    defense: 4,
    life: 6,
    wins: 0,
    diceAssignment: {
        attack: Dice.D4,
        defense: Dice.D6,
    },
    isGiveUp: false,
    isCurrentPlayer: false,
    availableMoves: 0,
    remainingAction: 0,
    startPosition: null,
    currentPosition: null,
    previousPosition: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any as PlayerInfos;

class MockSocketClientService {
    on = jasmine.createSpy('on').and.callFake((path: string, callback: Function) => {
        if (path === WsEventClient.PartyMessage) {
            callback(mockMessages);
        }

        if (path === WsEventServer.GetPlayerInfos) {
            callback(mockPlayerInfo);
        }
    });
    send = jasmine.createSpy('send');
    off = jasmine.createSpy('off');
}

describe('ChatComponent', () => {
    let component: ChatComponent;
    let fixture: ComponentFixture<ChatComponent>;
    let mockSocketClientService: MockSocketClientService;

    beforeEach(async () => {
        mockSocketClientService = new MockSocketClientService();
        await TestBed.configureTestingModule({
            imports: [ChatComponent],
            providers: [{ provide: SocketClientService, useValue: mockSocketClientService }],
        }).compileComponents();

        fixture = TestBed.createComponent(ChatComponent);
        component = fixture.componentInstance;
        component.messageContainer = {
            nativeElement: {
                scrollTop: 0,
                scrollHeight: 361,
            },
        } as ElementRef;
        component.playerInfo = mockPlayerInfo;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should connect and receive messages on init', () => {
        mockSocketClientService.send.calls.allArgs().forEach((call) => {
            if (call[0] === WsEventServer.GetMessages) {
                call[1](mockMessages);
            }
            if (call[0] === WsEventServer.GetPlayerInfos) {
                call[1](mockPlayerInfo);
            }
        });

        expect(mockSocketClientService.on).toHaveBeenCalledWith(WsEventClient.PartyMessage, jasmine.any(Function));
        expect(mockSocketClientService.send).toHaveBeenCalledWith(WsEventServer.GetMessages, jasmine.any(Function));
        expect(mockSocketClientService.send).toHaveBeenCalledWith(WsEventServer.GetPlayerInfos, jasmine.any(Function));
        expect(component.messages.length).toEqual(1);
        expect(component.messages[0].senderName).toBe('User');
        expect(component.messages[0].message).toBe('Test message');
        expect(component.playerInfo).toEqual(mockPlayerInfo);
        expect(component.messages).toEqual(mockMessages);
    });
    //
    it('should handle multiple incoming messages correctly', () => {
        const mockMessages1 = [
            { senderName: 'User1', message: 'First message' },
            { senderName: 'User2', message: 'Second message' },
        ];
        mockMessages1.forEach((msg) => {
            mockSocketClientService.on.calls.mostRecent().args[1](msg);
        });

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        expect(component.messages.length).toEqual(3);
        expect(component.messages[1]).toEqual(mockMessages1[0]);
        expect(component.messages[2]).toEqual(mockMessages1[1]);
    });
    //
    it('should not throw error when ngAfterViewChecked is called with no messages', () => {
        component.messages = [];
        expect(() => component.ngAfterViewChecked()).not.toThrow();
    });
    //
    it('should not call send when message is just whitespace', () => {
        component.newMessage = '    ';
        component.sendMessage();
        expect(mockSocketClientService.send).not.toHaveBeenCalledWith(WsEventServer.SendMessage, {
            senderName: 'player-name',
            message: '',
        } as ChatMessage);
        expect(component.newMessage).toBe('    ');
    });

    it('should send a message when sensMessage is called', () => {
        component.playerInfo.name = mockPlayerInfo.name;
        component.newMessage = '   Hello World!    ';
        component.sendMessage();
        expect(mockSocketClientService.send).toHaveBeenCalledWith(WsEventServer.SendMessage, {
            senderId: 'test-pid',
            senderName: 'player-name',
            message: 'Hello World!',
        } as ChatMessage);
        expect(component.newMessage).toBe('');
        expect(component['isNewMessageReceived']).toBeTrue();
    });

    it('should scroll to bottom when messages are updated', () => {
        const scrollTopSpy = spyOnProperty(component.messageContainer.nativeElement, 'scrollTop', 'set');
        component.messages.push({ senderName: 'test-name', message: 'test-message' });
        component['isNewMessageReceived'] = true;
        component.ngAfterViewChecked();
        expect(scrollTopSpy).toHaveBeenCalled();
        expect(scrollTopSpy).toHaveBeenCalledWith(component.messageContainer.nativeElement.scrollHeight);
    });

    it('should return if messageContainer is not defined', () => {
        (component.messageContainer as unknown) = null;
        expect(() => component.ngAfterViewChecked()).not.toThrow();
    });

    it('should disconnect on component destroy', () => {
        component.ngOnDestroy();
        expect(mockSocketClientService.off).toHaveBeenCalledWith(WsEventClient.PartyMessage);
    });
});
