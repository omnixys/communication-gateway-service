import type { AttachmentReference } from './attachment-reference.model.js';
import type { CommunicationChannel } from './communication-channel.model.js';
export interface OutboundMessage {
    readonly id: string;
    readonly channel: CommunicationChannel;
    readonly to: string;
    readonly body: string;
    readonly contentType: string;
    readonly attachment: AttachmentReference | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}
