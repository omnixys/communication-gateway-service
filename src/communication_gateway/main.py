from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from communication_gateway.api.graphql.context import GraphQLContext
from communication_gateway.api.graphql.schema import schema
from communication_gateway.api.health import router as health_router
from communication_gateway.api.rest.attachments import router as attachments_router
from communication_gateway.api.rest.messages import router as messages_router
from communication_gateway.api.rest.providers import (
    router as providers_router,
)
from communication_gateway.api.rest.providers import (
    set_dispatcher,
    set_registry,
)
from communication_gateway.api.rest.webhooks import (
    router as webhooks_router,
)
from communication_gateway.api.rest.webhooks import (
    set_webhook_service,
)
from communication_gateway.application.ports.channel_provider_registry import ChannelEntry
from communication_gateway.application.services.gateway_dispatcher import GatewayDispatcher
from communication_gateway.application.services.webhook_service import WebhookService
from communication_gateway.domain.enums import CommunicationChannelType
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.infrastructure.events.in_memory_event_publisher import (
    InMemoryEventPublisher,
)
from communication_gateway.infrastructure.persistence.in_memory_registry import (
    InMemoryChannelProviderRegistry,
)
from communication_gateway.infrastructure.providers.evolution.evolution_config import (
    EvolutionApiConfig,
)
from communication_gateway.infrastructure.providers.evolution.evolution_provider import (
    EvolutionProvider,
)
from communication_gateway.infrastructure.resolvers.default_provider_resolver import (
    DefaultProviderResolver,
)

event_publisher = InMemoryEventPublisher()
registry = InMemoryChannelProviderRegistry()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _setup_providers()
    yield


def _setup_providers() -> None:
    evolution_config = EvolutionApiConfig.from_settings()
    evolution = EvolutionProvider(evolution_config)

    whatsapp_entry = ChannelEntry(
        resolver=DefaultProviderResolver(providers=[evolution]),
        providers=[evolution],
    )
    registry.register_channel(
        CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
        whatsapp_entry,
    )

    dispatcher = GatewayDispatcher(registry)
    webhook_service = WebhookService(registry, event_publisher)

    set_dispatcher(dispatcher)
    set_registry(registry)
    set_webhook_service(webhook_service)


def create_application() -> FastAPI:
    app = FastAPI(
        title="Omnixys Communication Gateway",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.include_router(health_router)
    app.include_router(messages_router)
    app.include_router(attachments_router)
    app.include_router(providers_router)
    app.include_router(webhooks_router)

    async def get_context() -> AsyncGenerator[GraphQLContext]:
        yield GraphQLContext(registry=registry)

    graphql_router = GraphQLRouter(
        schema,
        context_getter=get_context,
    )
    app.include_router(graphql_router, prefix="/graphql")

    return app


app = create_application()


def run() -> None:
    import asyncio

    import hypercorn.asyncio
    import hypercorn.config

    from communication_gateway.config import settings

    config = hypercorn.config.Config()
    config.bind = [f"{settings.host}:{settings.port}"]
    config.loglevel = settings.log_level.lower()

    asyncio.run(hypercorn.asyncio.serve(app, config))
