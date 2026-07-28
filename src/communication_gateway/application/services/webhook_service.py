from typing import TYPE_CHECKING

from communication_gateway.domain.enums import (
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.errors import WebhookVerificationError
from communication_gateway.domain.events import InboundMessageReceived, MessageDelivered
from communication_gateway.domain.services.delivery_lifecycle import (
    assert_valid_transition,
)

if TYPE_CHECKING:
    from communication_gateway.application.ports.channel_provider_registry import (
        ChannelProviderRegistry,
    )
    from communication_gateway.application.ports.event_publisher import OutboundEventPublisher
    from communication_gateway.application.ports.message_mapping_store import (
        MessageMappingStore,
    )

logger = __import__("structlog").get_logger(__name__)


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
        logger.info("webhook_processing_started", provider_type=provider_type.value)
        provider = self._registry.get_by_provider_type(provider_type)
        if provider is None:
            msg = f"Unknown provider type: {provider_type}"
            raise ValueError(msg)

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
                        "duplicate_webhook_skipped",
                        provider=provider_type.value,
                        msg=result.message_id,
                        status=existing.status.value,
                    )
                    return result
                await self._publisher.publish(InboundMessageReceived(message=result))
                logger.info("inbound_message_published", provider=provider_type.value, msg=result.message_id)
            elif isinstance(result, DeliveryReceipt):
                existing = await self._mapping_store.find_by_provider_and_provider_message_id(
                    provider_type,
                    result.provider_message_id,
                )
                if existing is not None:
                    if existing.status == result.status:
                        logger.info(
                            "duplicate_receipt_skipped",
                            provider=provider_type.value,
                            msg=result.provider_message_id,
                            status=result.status.value,
                        )
                        return result
                    try:
                        assert_valid_transition(existing.status, result.status)
                    except Exception as exc:
                        logger.error(
                            "invalid_status_transition",
                            provider=provider_type.value,
                            msg=result.provider_message_id,
                            current_status=existing.status.value,
                            attempted_status=result.status.value,
                            error=str(exc),
                        )
                        raise
                    await self._mapping_store.update_status(
                        result.provider_message_id,
                        result.status,
                        result.error,
                    )
                    logger.info(
                        "status_update_applied",
                        provider=provider_type.value,
                        msg=result.provider_message_id,
                        status=result.status.value,
                    )
                await self._publisher.publish(MessageDelivered(receipt=result))
                logger.info("message_delivered_event_published", provider=provider_type.value, msg=result.provider_message_id)

        return result
