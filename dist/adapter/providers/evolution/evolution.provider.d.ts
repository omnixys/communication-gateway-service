import { type ChannelCapabilities } from '../../../communication-gateway/models/entities/channel-capabilities.model.js';
import type { OutboundMessage } from '../../../communication-gateway/models/entities/outbound-message.model.js';
import type { ProviderMetadata } from '../../../communication-gateway/models/entities/provider-metadata.model.js';
import { CommunicationProviderType } from '../../../communication-gateway/models/enums/gateway.enums.js';
import type { WebhookResult } from '../../../communication-gateway/models/interfaces/communication-provider.port.js';
import type { CommunicationProvider } from '../../../communication-gateway/models/interfaces/communication-provider.port.js';
import type { EvolutionConfig } from '../../../communication-gateway/models/interfaces/evolution-config.interface.js';
import type { ProviderResponse } from '../../../communication-gateway/models/payloads/provider-response.model.js';
export declare class EvolutionProvider implements CommunicationProvider {
    readonly providerType = CommunicationProviderType.EVOLUTION;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly instance;
    private readonly webhookSecret;
    private readonly timeoutMs;
    private readonly identity;
    constructor(config: EvolutionConfig, timeoutMs?: number);
    get metadata(): ProviderMetadata;
    send(message: OutboundMessage): Promise<ProviderResponse>;
    health(): Promise<boolean>;
    capabilities(): Promise<ChannelCapabilities>;
    verifyWebhook(headers: Readonly<Record<string, string>>, body: Buffer): Promise<boolean>;
    handleWebhook(_headers: Readonly<Record<string, string>>, body: Buffer): Promise<WebhookResult>;
    private staticCapabilities;
}
