export declare const SENDABLE_CHANNELS: readonly ["EMAIL", "WHATSAPP"];
export declare class SendMessageDto {
    id: string;
    channel: (typeof SENDABLE_CHANNELS)[number];
    recipientAddress?: string;
    recipientId?: string;
    senderAddress?: string;
    senderId?: string;
    body: string;
    contentType?: 'TEXT' | 'HTML';
    subject?: string;
    metadata?: Record<string, unknown>;
}
export declare class ProviderParamDto {
    providerType: string;
}
