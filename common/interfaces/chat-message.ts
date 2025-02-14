export interface ChatMessage {
    senderName: string;
    characterImage?: string;
    timestamp?: Date;
    message: string;
    senderId?: string;
}
