import { AdapterModule } from '../adapter/adapter.module.js';
import { EVENT_PUBLISHER } from '../adapter/events/events.module.js';
import type { InMemoryChannelProviderRegistry } from '../adapter/registry/in-memory-channel-provider.registry.js';
import { MESSAGE_MAPPING_STORE } from '../prisma/tokens.js';
import { MessagesController } from './controllers/messages.controller.js';
import { ProvidersController } from './controllers/providers.controller.js';
import { WebhooksController } from './controllers/webhooks.controller.js';
import type { MessageMappingStore } from './models/interfaces/message-mapping-store.port.js';
import type { OutboundEventPublisher } from './models/interfaces/outbound-event-publisher.port.js';
import { ProvidersResolver } from './resolvers/providers.resolver.js';
import { GatewayDispatcher } from './services/gateway-dispatcher.service.js';
import { MessagesService } from './services/messages.service.js';
import { WebhookService } from './services/webhook.service.js';
import { CHANNEL_PROVIDER_REGISTRY, WEBHOOK_SERVICE } from './utils/tokens.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [AdapterModule],
  controllers: [MessagesController, ProvidersController, WebhooksController],
  providers: [
    {
      provide: GatewayDispatcher,
      inject: [CHANNEL_PROVIDER_REGISTRY],
      useFactory: (registry: InMemoryChannelProviderRegistry): GatewayDispatcher =>
        new GatewayDispatcher(registry),
    },
    {
      provide: WEBHOOK_SERVICE,
      inject: [CHANNEL_PROVIDER_REGISTRY, EVENT_PUBLISHER, MESSAGE_MAPPING_STORE],
      useFactory: (
        registry: InMemoryChannelProviderRegistry,
        publisher: OutboundEventPublisher,
        store: MessageMappingStore,
      ): WebhookService => new WebhookService(registry, publisher, store),
    },
    MessagesService,
    ProvidersResolver,
  ],
})
export class CommunicationGatewayModule {}
