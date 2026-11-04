import type { InboundMessage } from '../../../communication-gateway/models/entities/inbound-message.model.js';
import type { ProviderIdentity } from '../../../communication-gateway/models/entities/provider-identity.model.js';
import type { CommunicationChannelType } from '../../../communication-gateway/models/enums/gateway.enums.js';
import type { DeliveryReceipt } from '../../../communication-gateway/models/payloads/delivery-receipt.model.js';
import type { ProviderResponse } from '../../../communication-gateway/models/payloads/provider-response.model.js';
export interface EvolutionWebhookPayload {
    readonly event: string;
    readonly instance: string;
    readonly data: unknown;
}
export interface EvolutionMessageData {
    readonly key: Record<string, unknown>;
    readonly pushName: string;
    readonly message: Record<string, unknown> | null;
    readonly messageType: string | null;
}
export declare function mapToProviderResponse(status: 'success' | 'error', data: Record<string, unknown> | null, error: string | null, identity: ProviderIdentity): ProviderResponse;
export declare function mapToInboundMessage(messageData: EvolutionMessageData, providerInstance: string | null, channel: CommunicationChannelType): InboundMessage;
export declare function mapToDeliveryReceipt(messageData: EvolutionMessageData): DeliveryReceipt;
export declare function toWebhookPayload(raw: unknown): EvolutionWebhookPayload;
