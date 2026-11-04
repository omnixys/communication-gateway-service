import type { CommunicationProviderType } from '../enums/gateway.enums.js';
import type { AttachmentReference } from './attachment-reference.model.js';
import type { CommunicationChannel } from './communication-channel.model.js';
export interface InboundMessage {
    readonly messageId: string;
    readonly channel: CommunicationChannel;
    readonly providerType: CommunicationProviderType;
    readonly from: string;
    readonly body: string;
    readonly providerInstance: string | null;
    readonly senderName: string | null;
    readonly contentType: string;
    readonly attachment: AttachmentReference | null;
    readonly conversationId: string | null;
    readonly receivedAt: Date | null;
}
