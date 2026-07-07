import pytest
from httpx import ASGITransport, AsyncClient

from communication_gateway.api.rest.providers import (
    set_dispatcher,
    set_registry,
)
from communication_gateway.api.rest.webhooks import set_webhook_service
from communication_gateway.application.ports.channel_provider_registry import ChannelEntry
from communication_gateway.application.services.gateway_dispatcher import GatewayDispatcher
from communication_gateway.application.services.webhook_service import WebhookService
from communication_gateway.domain.enums import CommunicationChannelType, CommunicationProviderType
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.infrastructure.events.in_memory_event_publisher import (
    InMemoryEventPublisher,
)
from communication_gateway.infrastructure.persistence.in_memory_registry import (
    InMemoryChannelProviderRegistry,
)
from communication_gateway.infrastructure.resolvers.default_provider_resolver import (
    DefaultProviderResolver,
)
from communication_gateway.main import (
    app,
)
from communication_gateway.tests.conftest import MockProvider


@pytest.fixture(autouse=True)
def _reset_globals():
    yield
    from communication_gateway.api.rest import providers, webhooks
    providers._registry = None
    providers._dispatcher = None
    webhooks._service = None


class TestRestEndpoints:

    async def test_health_endpoint(self) -> None:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"

    async def test_providers_list_endpoint(self) -> None:
        registry = InMemoryChannelProviderRegistry()
        provider = MockProvider(CommunicationProviderType.EVOLUTION)
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[provider]),
            providers=[provider],
        )
        registry.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )
        dispatcher = GatewayDispatcher(registry)
        publisher = InMemoryEventPublisher()
        webhook_service = WebhookService(registry, publisher)
        set_dispatcher(dispatcher)
        set_registry(registry)
        set_webhook_service(webhook_service)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/providers")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["provider_type"] == "EVOLUTION"

    async def test_provider_health_endpoint(self) -> None:
        registry = InMemoryChannelProviderRegistry()
        provider = MockProvider(CommunicationProviderType.EVOLUTION)
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[provider]),
            providers=[provider],
        )
        registry.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )
        dispatcher = GatewayDispatcher(registry)
        publisher = InMemoryEventPublisher()
        webhook_service = WebhookService(registry, publisher)
        set_dispatcher(dispatcher)
        set_registry(registry)
        set_webhook_service(webhook_service)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/providers/evolution/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"

    async def test_send_message_endpoint(self) -> None:
        registry = InMemoryChannelProviderRegistry()
        provider = MockProvider(CommunicationProviderType.EVOLUTION)
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[provider]),
            providers=[provider],
        )
        registry.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )
        dispatcher = GatewayDispatcher(registry)
        publisher = InMemoryEventPublisher()
        webhook_service = WebhookService(registry, publisher)
        set_dispatcher(dispatcher)
        set_registry(registry)
        set_webhook_service(webhook_service)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/messages/send",
                json={
                    "id": "test-1",
                    "channel": "WHATSAPP",
                    "to": "+1234567890",
                    "body": "Hello via REST",
                },
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
