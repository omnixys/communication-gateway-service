from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from typing import TYPE_CHECKING

from communication_gateway.domain.events import MessageDelivered

if TYPE_CHECKING:
    from omnixys_kafka import AIOKafkaEventProducer

    from communication_gateway.application.ports.event_publisher import OutboundEventPublisher
    from communication_gateway.application.ports.message_mapping_store import (
        MessageMappingStore,
    )

logger = logging.getLogger(__name__)

DELIVERY_STATUS_TOPIC = "gateway.delivery.status"


class KafkaDeliveryEventHandler:
    def __init__(
        self,
        publisher: OutboundEventPublisher,
        producer: AIOKafkaEventProducer,
        mapping_store: MessageMappingStore,
    ) -> None:
        self._publisher = publisher
        self._producer = producer
        self._mapping_store = mapping_store
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run())
        logger.info("Kafka delivery event handler started — topic=%s", DELIVERY_STATUS_TOPIC)

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self._producer.stop()

    async def _run(self) -> None:
        delivery = self._publisher.subscribe(MessageDelivered)
        async for event in delivery:
            try:
                if not isinstance(event, MessageDelivered):
                    continue
                await self._publish(event.receipt)
            except Exception:
                logger.exception("kafka_delivery_publish_error")

    async def _publish(self, receipt: object) -> None:
        from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt

        if not isinstance(receipt, DeliveryReceipt):
            return

        internal_msg_id = ""
        conversation_id = ""
        try:
            mapping = await self._mapping_store.get_by_provider_message_id(
                receipt.provider_message_id,
            )
            if mapping is not None:
                internal_msg_id = mapping.internal_id
                conversation_id = mapping.conversation_id
        except Exception:
            logger.exception("mapping_lookup_error")

        payload = {
            "messageId": internal_msg_id,
            "providerMessageId": receipt.provider_message_id,
            "conversationId": conversation_id,
            "channel": "WHATSAPP",
            "provider": receipt.provider_type.value,
            "status": receipt.status.value,
            "timestamp": receipt.timestamp.isoformat() if receipt.timestamp else None,
            "error": receipt.error,
        }
        key = internal_msg_id or receipt.provider_message_id
        await self._producer.publish_raw(
            DELIVERY_STATUS_TOPIC,
            value=json.dumps(payload).encode("utf-8"),
            key=key,
        )
        logger.info(
            "kafka_delivery_published msg=%s status=%s",
            receipt.provider_message_id,
            receipt.status.value,
        )
