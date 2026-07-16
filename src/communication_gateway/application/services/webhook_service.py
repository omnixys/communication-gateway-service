import logging

from communication_gateway.application.ports.channel_provider_registry import (
    ChannelProviderRegistry,
)
from communication_gateway.application.ports.event_publisher import OutboundEventPublisher
from communication_gateway.application.ports.message_mapping_store import (
    MessageMappingStore,
)
from communication_gateway.domain.enums import (
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.errors import WebhookVerificationError
from communication_gateway.domain.events import InboundMessageReceived, MessageDelivered
from communication_gateway.domain.services.delivery_lifecycle import (
    assert_valid_transition,
)

logger = logging.getLogger(__name__)


class WebhookService:
    def __init__(
        self,
        registry: ChannelProviderRegistry,
        publisher: OutboundEventPublisher,
        mapping_store: MessageMappingStore,
    ) -> None:
        self._registry = registry
        self._publisher = publisher
        self._mapping_store = mapping_store

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
                existing = await self._mapping_store.find_by_provider_and_provider_message_id(
                    provider_type,
                    result.message_id,
                )
                if existing is not None and existing.status not in (
                    DeliveryStatus.FAILED,
                    DeliveryStatus.PENDING,
                ):
                    logger.info(
                        "duplicate_webhook_skipped provider=%s msg=%s status=%s",
                        provider_type,
                        result.message_id,
                        existing.status,
                    )
                    return result
                await self._publisher.publish(InboundMessageReceived(message=result))
            elif isinstance(result, DeliveryReceipt):
                existing = await self._mapping_store.find_by_provider_and_provider_message_id(
                    provider_type,
                    result.provider_message_id,
                )
                if existing is not None:
                    if existing.status == result.status:
                        logger.info(
                            "duplicate_receipt_skipped provider=%s msg=%s status=%s",
                            provider_type,
                            result.provider_message_id,
                            result.status,
                        )
                        return result
                    assert_valid_transition(existing.status, result.status)
                    await self._mapping_store.update_status(
                        result.provider_message_id,
                        result.status,
                        result.error,
                    )
                await self._publisher.publish(MessageDelivered(receipt=result))

        return result
