from communication_gateway.application.ports.channel_provider_registry import (
    ChannelProviderRegistry,
)
from communication_gateway.application.ports.event_publisher import OutboundEventPublisher
from communication_gateway.domain.enums import CommunicationProviderType
from communication_gateway.domain.errors import WebhookVerificationError
from communication_gateway.domain.events import InboundMessageReceived, MessageDelivered


class WebhookService:

    def __init__(
        self,
        registry: ChannelProviderRegistry,
        publisher: OutboundEventPublisher,
    ) -> None:
        self._registry = registry
        self._publisher = publisher

    async def process_webhook(
        self,
        provider_type: CommunicationProviderType,
        headers: dict[str, str],
        body: bytes,
    ) -> object:
        provider = self._registry.get_by_provider_type(provider_type)
        if provider is None:
            raise ValueError(f"Unknown provider type: {provider_type}")

        if not await provider.verify_webhook(headers, body):
            raise WebhookVerificationError(provider_type)

        result = await provider.handle_webhook(headers, body)
        if isinstance(result, object):
            from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
            from communication_gateway.domain.models.inbound_message import InboundMessage

            if isinstance(result, InboundMessage):
                await self._publisher.publish(InboundMessageReceived(message=result))
            elif isinstance(result, DeliveryReceipt):
                await self._publisher.publish(MessageDelivered(receipt=result))

        return result
