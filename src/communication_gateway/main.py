from __future__ import annotations

import errno
import json
import socket
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from aiokafka import AIOKafkaProducer
from fastapi import Depends, FastAPI
from kafka import AIOKafkaEventProducer
from observability import (
    configure_logging,
    configure_tracing,
    instrument_fastapi,
    shutdown_tracing,
    uninstrument_fastapi,
)
from observability.metrics import ObservabilityMiddleware
from security import JwtValidator, SecurityMiddleware
from strawberry.fastapi import GraphQLRouter

from communication_gateway.api.auth import require_internal_api_key
from communication_gateway.api.graphql.context import GraphQLContext
from communication_gateway.api.graphql.schema import schema as graphql_schema
from communication_gateway.api.health import router as health_router
from communication_gateway.api.health import set_event_forwarder_ready
from communication_gateway.api.middleware import ContextBridgeMiddleware
from communication_gateway.api.rest.messages import router as messages_router
from communication_gateway.api.rest.messages import (
    set_address_resolver,
    set_mapping_store,
)
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
from communication_gateway.application.ports.channel_provider_registry import (
    ChannelEntry,
)
from communication_gateway.application.services.gateway_dispatcher import (
    GatewayDispatcher,
)
from communication_gateway.application.services.webhook_service import WebhookService
from communication_gateway.config import settings, validate_production_settings
from communication_gateway.database import manager
from communication_gateway.domain.enums import (
    CommunicationChannelType,
)
from communication_gateway.domain.models.communication_channel import (
    CommunicationChannel,
)
from communication_gateway.infrastructure.events.http_event_forwarder import (
    HttpEventForwarder,
)
from communication_gateway.infrastructure.events.in_memory_event_publisher import (
    InMemoryEventPublisher,
)
from communication_gateway.infrastructure.events.kafka_event_publisher import (
    KafkaDeliveryEventHandler,
)
from communication_gateway.infrastructure.persistence.in_memory_message_mapping_store import (
    InMemoryMessageMappingStore,
)
from communication_gateway.infrastructure.persistence.in_memory_registry import (
    InMemoryChannelProviderRegistry,
)
from communication_gateway.infrastructure.persistence.repositories import (
    sqlalchemy_message_mapping_repository,
)
from communication_gateway.infrastructure.providers.evolution.evolution_config import (
    EvolutionApiConfig,
)
from communication_gateway.infrastructure.providers.evolution.evolution_provider import (
    EvolutionProvider,
)
from communication_gateway.infrastructure.providers.resend.resend_provider import ResendProvider
from communication_gateway.infrastructure.resolvers.default_provider_resolver import (
    DefaultProviderResolver,
)
from communication_gateway.infrastructure.resolvers.dict_address_resolver import (
    DictAddressResolver,
)

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

    from communication_gateway.application.ports.message_mapping_store import (
        MessageMappingStore,
    )

logger = __import__("structlog").get_logger(__name__)

event_publisher = InMemoryEventPublisher()
registry = InMemoryChannelProviderRegistry()

if settings.database.url and settings.database.url != "sqlite+aiosqlite://":
    mapping_store: MessageMappingStore = (
        sqlalchemy_message_mapping_repository.SqlAlchemyMessageMappingRepository(
            manager.session_factory,
        )
    )
else:
    mapping_store = InMemoryMessageMappingStore()

_raw_mappings: dict[str, dict[str, str]] = json.loads(settings.core.address_mappings)
_mapped: dict[str, dict[CommunicationChannelType, str]] = {}
for uid, channels in _raw_mappings.items():
    _mapped[uid] = {CommunicationChannelType(ch): addr for ch, addr in channels.items()}
address_resolver = DictAddressResolver(mapping=_mapped)
event_forwarder: HttpEventForwarder | None = None
kafka_handler: KafkaDeliveryEventHandler | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    configure_logging()
    configure_tracing(
        service_name=settings.core.service_name,
        otlp_endpoint=settings.observability.otlp_endpoint,
        environment=settings.core.environment,
    )
    instrument_fastapi(app)

    validate_production_settings()
    _setup_providers()
    _setup_forwarder()
    await _setup_kafka()
    if event_forwarder is None:
        msg = "event_forwarder must be initialized before startup"
        raise RuntimeError(msg)
    await event_forwarder.start()
    set_event_forwarder_ready(True)
    if kafka_handler is not None:
        await kafka_handler.start()
    logger.info("application_started")
    yield
    logger.info("application_shutdown")
    if event_forwarder is not None:
        set_event_forwarder_ready(False)
        await event_forwarder.stop()
    if kafka_handler is not None:
        await kafka_handler.stop()
    for provider in registry.list_providers():
        close = getattr(provider, "close", None)
        if close is not None:
            await close()
    uninstrument_fastapi(app)
    shutdown_tracing()
    await manager.close()


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

    email = ResendProvider(settings.resend)
    email_entry = ChannelEntry(
        resolver=DefaultProviderResolver(providers=[email]),
        providers=[email],
    )
    registry.register_channel(
        CommunicationChannel(type=CommunicationChannelType.EMAIL),
        email_entry,
    )

    dispatcher = GatewayDispatcher(registry)
    webhook_service = WebhookService(registry, event_publisher, mapping_store)

    set_dispatcher(dispatcher)
    set_registry(registry)
    set_webhook_service(webhook_service)


def _setup_forwarder() -> None:
    global event_forwarder

    set_address_resolver(address_resolver)
    set_mapping_store(mapping_store)

    event_forwarder = HttpEventForwarder(
        publisher=event_publisher,
        chat_service_url=settings.core.chat_service_url,
        api_key=settings.core.chat_service_api_key,
        address_resolver=address_resolver,
        mapping_store=mapping_store,
    )


async def _setup_kafka() -> None:
    global kafka_handler

    if not settings.gateway_kafka.broker:
        logger.info("KAFKA_BROKER not set — Kafka delivery events disabled")
        return

    raw = AIOKafkaProducer(
        bootstrap_servers=settings.gateway_kafka.broker,
        client_id="omnixys-communication-gateway",
    )
    producer = AIOKafkaEventProducer(producer=raw)
    await producer.start()
    kafka_handler = KafkaDeliveryEventHandler(
        publisher=event_publisher,
        producer=producer,
        mapping_store=mapping_store,
    )
    logger.info("Kafka producer started — brokers=%s", settings.gateway_kafka.broker)


def create_application() -> FastAPI:
    jwt_validator = JwtValidator(
        jwks_url=settings.keycloak.jwks_url,
        issuer=settings.keycloak.issuer,
        audience=settings.keycloak.audience,
    )

    app = FastAPI(
        title="Omnixys Communication Gateway",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(ObservabilityMiddleware)
    app.add_middleware(
        SecurityMiddleware,
        jwt_validator=jwt_validator,
        exclude_paths=["/health", "/health/live", "/health/ready", "/api/v1/webhooks"],
    )
    app.add_middleware(ContextBridgeMiddleware)

    app.include_router(health_router)
    app.include_router(messages_router)
    app.include_router(providers_router)
    app.include_router(webhooks_router)
    app.include_router(
        GraphQLRouter(
            graphql_schema,
            context_getter=lambda: GraphQLContext(registry=registry),
            dependencies=[Depends(require_internal_api_key)],
        ),
        prefix="/graphql",
    )

    return app


app = create_application()


def ensure_bind_available(host: str, port: int) -> None:
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        probe.bind((host, port))
    except OSError as exc:
        if exc.errno == errno.EADDRINUSE:
            msg = (
                f"Communication Gateway cannot start: {host}:{port} is already in use. "
                "Set PORT or stop the conflicting process."
            )
            raise SystemExit(
                msg,
            ) from None
        raise
    finally:
        probe.close()


def run() -> None:
    import asyncio

    import hypercorn.asyncio
    import hypercorn.config

    from communication_gateway.config import settings

    config = hypercorn.config.Config()
    config.bind = [f"{settings.core.host}:{settings.core.port}"]
    config.loglevel = settings.core.log_level.upper()

    ensure_bind_available(settings.core.host, settings.core.port)
    asyncio.run(hypercorn.asyncio.serve(app, config))  # type: ignore[arg-type]
