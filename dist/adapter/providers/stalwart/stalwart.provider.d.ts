import { type ChannelCapabilities } from '../../../communication-gateway/models/entities/channel-capabilities.model.js';
import type { OutboundMessage } from '../../../communication-gateway/models/entities/outbound-message.model.js';
import type { ProviderMetadata } from '../../../communication-gateway/models/entities/provider-metadata.model.js';
import { CommunicationProviderType } from '../../../communication-gateway/models/enums/gateway.enums.js';
import type { CommunicationProvider, WebhookResult } from '../../../communication-gateway/models/interfaces/communication-provider.port.js';
import type { StalwartConfig } from '../../../communication-gateway/models/interfaces/stalwart-config.interface.js';
import type { ProviderResponse } from '../../../communication-gateway/models/payloads/provider-response.model.js';
export declare class StalwartProvider implements CommunicationProvider {
    readonly providerType = CommunicationProviderType.STALWART;
    private readonly config;
    private readonly identity;
    private readonly client;
    private token;
    private tokenExpiresAtMs;
    constructor(config: StalwartConfig);
    get metadata(): ProviderMetadata;
    send(message: OutboundMessage): Promise<ProviderResponse>;
    health(): Promise<boolean>;
    capabilities(): Promise<ChannelCapabilities>;
    verifyWebhook(): Promise<boolean>;
    handleWebhook(): Promise<WebhookResult>;
    private sendWithOAuth;
    private oauthToken;
    private buildMime;
    private errorCode;
    private failure;
}
