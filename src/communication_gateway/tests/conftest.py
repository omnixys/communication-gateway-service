import pytest_asyncio

from communication_gateway.application.ports.channel_provider_registry import ChannelEntry
from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.application.services.gateway_dispatcher import GatewayDispatcher
from communication_gateway.application.services.webhook_service import WebhookService
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
from communication_gateway.domain.models.inbound_message import InboundMessage
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.provider_response import ProviderResponse
from communication_gateway.infrastructure.events.in_memory_event_publisher import (
    InMemoryEventPublisher,
)
from communication_gateway.infrastructure.persistence.in_memory_registry import (
    InMemoryChannelProviderRegistry,
)
from communication_gateway.infrastructure.resolvers.default_provider_resolver import (
    DefaultProviderResolver,
)


class MockProvider(CommunicationProvider):

    def __init__(
        self,
        provider_type: CommunicationProviderType = CommunicationProviderType.EVOLUTION,
    ) -> None:
        self._type = provider_type
        self.last_message: OutboundMessage | None = None
        self.send_result: ProviderResponse = ProviderResponse(
            success=True,
            provider_message_id="mock-msg-1",
            status=DeliveryStatus.SENT,
        )
        self.health_result: bool = True
        self.webhook_should_verify: bool = True
        self.webhook_result: InboundMessage | DeliveryReceipt | None = None

    @property
    def provider_type(self) -> CommunicationProviderType:
        return self._type

    async def send(self, message: OutboundMessage) -> ProviderResponse:
        self.last_message = message
        return self.send_result

    async def health(self) -> bool:
        return self.health_result

    async def capabilities(self) -> ChannelCapabilities:
        return ChannelCapabilities(supports_attachments=True)

    async def verify_webhook(self, headers: dict[str, str], body: bytes) -> bool:
        return self.webhook_should_verify

    async def handle_webhook(
        self, headers: dict[str, str], body: bytes
    ) -> InboundMessage | DeliveryReceipt | None:
        return self.webhook_result


@pytest_asyncio.fixture
def mock_provider() -> MockProvider:
    return MockProvider()


@pytest_asyncio.fixture
def registry(mock_provider: MockProvider) -> InMemoryChannelProviderRegistry:
    reg = InMemoryChannelProviderRegistry()
    entry = ChannelEntry(
        resolver=DefaultProviderResolver(providers=[mock_provider]),
        providers=[mock_provider],
    )
    reg.register_channel(
        CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
        entry,
    )
    return reg


@pytest_asyncio.fixture
def dispatcher(registry: InMemoryChannelProviderRegistry) -> GatewayDispatcher:
    return GatewayDispatcher(registry)


@pytest_asyncio.fixture
def event_publisher() -> InMemoryEventPublisher:
    return InMemoryEventPublisher()


@pytest_asyncio.fixture
def webhook_service(
    registry: InMemoryChannelProviderRegistry,
    event_publisher: InMemoryEventPublisher,
) -> WebhookService:
    return WebhookService(registry, event_publisher)
