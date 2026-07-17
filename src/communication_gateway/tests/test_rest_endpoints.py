
from typing import TYPE_CHECKING

import pytest
from httpx import ASGITransport, AsyncClient

from communication_gateway.api.rest.messages import (
    set_address_resolver,
    set_mapping_store,
)
from communication_gateway.api.rest.providers import (
    set_dispatcher,
    set_registry,
)
from communication_gateway.api.rest.webhooks import set_webhook_service
from communication_gateway.application.ports.channel_provider_registry import ChannelEntry
from communication_gateway.application.services.gateway_dispatcher import GatewayDispatcher
from communication_gateway.application.services.webhook_service import WebhookService
from communication_gateway.config import settings
from communication_gateway.domain.enums import CommunicationChannelType, CommunicationProviderType
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.infrastructure.events.in_memory_event_publisher import (
    InMemoryEventPublisher,
)
from communication_gateway.infrastructure.persistence.in_memory_message_mapping_store import (
    InMemoryMessageMappingStore,
)
from communication_gateway.infrastructure.persistence.in_memory_registry import (
    InMemoryChannelProviderRegistry,
)
from communication_gateway.infrastructure.resolvers.default_provider_resolver import (
    DefaultProviderResolver,
)
from communication_gateway.infrastructure.resolvers.dict_address_resolver import (
    DictAddressResolver,
)
from communication_gateway.main import (
    app,
)
from communication_gateway.tests.conftest import MockProvider

if TYPE_CHECKING:
    from collections.abc import Generator

    from _pytest.monkeypatch import MonkeyPatch


@pytest.fixture(autouse=True)
def _reset_globals() -> Generator[None]:
    yield
    from communication_gateway.api.rest import messages, providers, webhooks

    providers._registry = None
    providers._dispatcher = None
    webhooks._service = None
    messages._address_resolver = None
    messages._mapping_store = None


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
        mapping_store = InMemoryMessageMappingStore()
        webhook_service = WebhookService(registry, publisher, mapping_store)
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
        mapping_store = InMemoryMessageMappingStore()
        webhook_service = WebhookService(registry, publisher, mapping_store)
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
        mapping_store = InMemoryMessageMappingStore()
        webhook_service = WebhookService(registry, publisher, mapping_store)
        address_resolver = DictAddressResolver()
        address_resolver._forward = {"user-1": {CommunicationChannelType.WHATSAPP: "+1234567890"}}
        address_resolver._reverse = {"+1234567890": "user-1"}
        set_dispatcher(dispatcher)
        set_registry(registry)
        set_webhook_service(webhook_service)
        set_address_resolver(address_resolver)
        set_mapping_store(mapping_store)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/messages/send",
                json={
                    "id": "test-1",
                    "channel": "WHATSAPP",
                    "recipientId": "user-1",
                    "body": "Hello via REST",
                },
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["providerMessageId"] == "mock-msg-1"
        assert data["providerIdentity"] is not None
        assert data["providerIdentity"]["providerType"] == "EVOLUTION"

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            direct = await client.post(
                "/api/v1/messages/send",
                json={
                    "id": "test-direct",
                    "channel": "WHATSAPP",
                    "recipientAddress": "+491701234567",
                    "body": "Direct V1 address",
                    "contentType": "TEXT",
                    "metadata": {"conversationId": "conversation-1"},
                },
            )
        assert direct.status_code == 200
        assert provider.last_message is not None
        assert provider.last_message.to == "+491701234567"

    async def test_send_message_requires_internal_api_key(self, monkeypatch: MonkeyPatch) -> None:
        monkeypatch.setattr(settings.core, "internal_api_key", "shared-secret")
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/messages/send",
                json={
                    "id": "unauthorized",
                    "channel": "WHATSAPP",
                    "recipientAddress": "+491701234567",
                    "body": "must not send",
                },
                headers={"x-internal-api-key": "wrong"},
            )
        assert response.status_code == 401
        assert response.json()["detail"]["code"] == "INVALID_INTERNAL_API_KEY"
