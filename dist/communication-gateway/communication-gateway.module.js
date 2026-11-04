var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AdapterModule } from '../adapter/adapter.module.js';
import { EVENT_PUBLISHER } from '../adapter/events/events.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MESSAGE_MAPPING_STORE } from '../prisma/tokens.js';
import { MessagesController } from './controllers/messages.controller.js';
import { ProvidersController } from './controllers/providers.controller.js';
import { WebhooksController } from './controllers/webhooks.controller.js';
import { ProvidersResolver } from './resolvers/providers.resolver.js';
import { GatewayDispatcher } from './services/gateway-dispatcher.service.js';
import { MessagesService } from './services/messages.service.js';
import { WebhookService } from './services/webhook.service.js';
import { CHANNEL_PROVIDER_REGISTRY, WEBHOOK_SERVICE } from './utils/tokens.js';
import { Module } from '@nestjs/common';
let CommunicationGatewayModule = class CommunicationGatewayModule {
};
CommunicationGatewayModule = __decorate([
    Module({
        imports: [AdapterModule, PrismaModule],
        controllers: [MessagesController, ProvidersController, WebhooksController],
        providers: [
            {
                provide: GatewayDispatcher,
                inject: [CHANNEL_PROVIDER_REGISTRY],
                useFactory: (registry) => new GatewayDispatcher(registry),
            },
            {
                provide: WEBHOOK_SERVICE,
                inject: [CHANNEL_PROVIDER_REGISTRY, EVENT_PUBLISHER, MESSAGE_MAPPING_STORE],
                useFactory: (registry, publisher, store) => new WebhookService(registry, publisher, store),
            },
            MessagesService,
            ProvidersResolver,
        ],
    })
], CommunicationGatewayModule);
export { CommunicationGatewayModule };
