import { type ChannelCapabilities } from '../../../communication-gateway/models/entities/channel-capabilities.model.js';
import type { OutboundMessage } from '../../../communication-gateway/models/entities/outbound-message.model.js';
import type { ProviderMetadata } from '../../../communication-gateway/models/entities/provider-metadata.model.js';
import { CommunicationProviderType } from '../../../communication-gateway/models/enums/gateway.enums.js';
import type { CommunicationProvider, WebhookResult } from '../../../communication-gateway/models/interfaces/communication-provider.port.js';
import type { ResendConfig } from '../../../communication-gateway/models/interfaces/resend-config.interface.js';
import type { ProviderResponse } from '../../../communication-gateway/models/payloads/provider-response.model.js';
export declare class ResendProvider implements CommunicationProvider {
    readonly providerType = CommunicationProviderType.RESEND;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly fromAddress;
    private readonly timeoutMs;
    private readonly identity;
    constructor(config: ResendConfig);
    get metadata(): ProviderMetadata;
    send(message: OutboundMessage): Promise<ProviderResponse>;
    health(): Promise<boolean>;
    capabilities(): Promise<ChannelCapabilities>;
    verifyWebhook(): Promise<boolean>;
    handleWebhook(): Promise<WebhookResult>;
    private errorCode;
    private failure;
}
