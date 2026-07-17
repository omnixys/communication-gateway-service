from __future__ import annotations

import asyncio
import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from omnixys_kafka import AIOKafkaEventProducer

from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.events import MessageDelivered
from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
from communication_gateway.domain.models.message_mapping import MessageMapping
from communication_gateway.infrastructure.events.in_memory_event_publisher import (
    InMemoryEventPublisher,
)
from communication_gateway.infrastructure.events.kafka_event_publisher import (
    DELIVERY_STATUS_TOPIC,
    KafkaDeliveryEventHandler,
)
from communication_gateway.infrastructure.persistence.in_memory_message_mapping_store import (
    InMemoryMessageMappingStore,
)


@pytest.fixture
def publisher() -> InMemoryEventPublisher:
    return InMemoryEventPublisher()


@pytest.fixture
def mapping_store() -> InMemoryMessageMappingStore:
    store = InMemoryMessageMappingStore()
    return store


@pytest.fixture
def mock_producer() -> tuple[MagicMock, AIOKafkaEventProducer]:
    raw = MagicMock()
    raw.start = AsyncMock()
    raw.stop = AsyncMock()
    raw.send_and_wait = AsyncMock()
    producer = AIOKafkaEventProducer(producer=raw)
    return raw, producer


class TestKafkaDeliveryEventHandler:
    async def test_start_creates_task(
        self,
        publisher: InMemoryEventPublisher,
        mock_producer: tuple[MagicMock, AIOKafkaEventProducer],
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        raw, producer = mock_producer
        handler = KafkaDeliveryEventHandler(
            publisher, producer=producer, mapping_store=mapping_store,
        )
        await handler.start()
        assert handler._task is not None
        await handler.stop()
        raw.stop.assert_awaited_once()

    async def test_publishes_delivery_event(
        self,
        publisher: InMemoryEventPublisher,
        mock_producer: tuple[MagicMock, AIOKafkaEventProducer],
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        raw, producer = mock_producer
        mapping = MessageMapping(
            internal_id="internal-msg-1",
            provider_message_id="evol-abc-123",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conv-1",
        )
        await mapping_store.save(mapping)

        handler = KafkaDeliveryEventHandler(
            publisher, producer=producer, mapping_store=mapping_store,
        )
        await handler.start()
        await asyncio.sleep(0)

        receipt = DeliveryReceipt(
            message_id="evol-abc-123",
            provider_message_id="evol-abc-123",
            provider_type=CommunicationProviderType.EVOLUTION,
            status=DeliveryStatus.DELIVERED,
            timestamp=datetime(2026, 7, 7, 10, 0, 0),
        )
        await publisher.publish(MessageDelivered(receipt=receipt))

        for _ in range(50):
            if raw.send_and_wait.await_count > 0:
                break
            await asyncio.sleep(0.01)

        raw.send_and_wait.assert_awaited_once()
        call_args = raw.send_and_wait.call_args
        assert call_args[1]["topic"] == DELIVERY_STATUS_TOPIC
        payload = json.loads(call_args[1]["value"])
        assert payload["messageId"] == "internal-msg-1"
        assert payload["providerMessageId"] == "evol-abc-123"
        assert payload["conversationId"] == "conv-1"
        assert payload["provider"] == "EVOLUTION"
        assert payload["status"] == "DELIVERED"
        assert payload["timestamp"] == "2026-07-07T10:00:00"
        assert payload["error"] is None

        await handler.stop()

    async def test_publishes_failed_status_with_error(
        self,
        publisher: InMemoryEventPublisher,
        mock_producer: tuple[MagicMock, AIOKafkaEventProducer],
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        raw, producer = mock_producer
        mapping = MessageMapping(
            internal_id="internal-msg-2",
            provider_message_id="evol-xyz-789",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conv-2",
        )
        await mapping_store.save(mapping)

        handler = KafkaDeliveryEventHandler(
            publisher, producer=producer, mapping_store=mapping_store,
        )
        await handler.start()
        await asyncio.sleep(0)

        receipt = DeliveryReceipt(
            message_id="evol-xyz-789",
            provider_message_id="evol-xyz-789",
            provider_type=CommunicationProviderType.EVOLUTION,
            status=DeliveryStatus.FAILED,
            timestamp=datetime(2026, 7, 7, 11, 0, 0),
            error="Provider returned 400",
        )
        await publisher.publish(MessageDelivered(receipt=receipt))

        for _ in range(50):
            if raw.send_and_wait.await_count > 0:
                break
            await asyncio.sleep(0.01)

        payload = json.loads(raw.send_and_wait.call_args[1]["value"])
        assert payload["status"] == "FAILED"
        assert payload["error"] == "Provider returned 400"
        assert payload["messageId"] == "internal-msg-2"
        assert payload["conversationId"] == "conv-2"

        await handler.stop()

    async def test_uses_internal_id_as_kafka_key(
        self,
        publisher: InMemoryEventPublisher,
        mock_producer: tuple[MagicMock, AIOKafkaEventProducer],
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        raw, producer = mock_producer
        mapping = MessageMapping(
            internal_id="internal-key-1",
            provider_message_id="evol-123",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conv-3",
        )
        await mapping_store.save(mapping)

        handler = KafkaDeliveryEventHandler(
            publisher, producer=producer, mapping_store=mapping_store,
        )
        await handler.start()
        await asyncio.sleep(0)

        receipt = DeliveryReceipt(
            message_id="evol-123",
            provider_message_id="evol-123",
            provider_type=CommunicationProviderType.EVOLUTION,
            status=DeliveryStatus.SENT,
            timestamp=datetime(2026, 7, 7, 12, 0, 0),
        )
        await publisher.publish(MessageDelivered(receipt=receipt))

        for _ in range(50):
            if raw.send_and_wait.await_count > 0:
                break
            await asyncio.sleep(0.01)

        call_args = raw.send_and_wait.call_args
        assert call_args[1]["key"] == b"internal-key-1"

        await handler.stop()

    async def test_handles_missing_mapping_gracefully(
        self,
        publisher: InMemoryEventPublisher,
        mock_producer: tuple[MagicMock, AIOKafkaEventProducer],
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        raw, producer = mock_producer
        handler = KafkaDeliveryEventHandler(
            publisher, producer=producer, mapping_store=mapping_store,
        )
        await handler.start()
        await asyncio.sleep(0)

        receipt = DeliveryReceipt(
            message_id="unknown-msg",
            provider_message_id="unknown-msg",
            provider_type=CommunicationProviderType.EVOLUTION,
            status=DeliveryStatus.DELIVERED,
            timestamp=datetime(2026, 7, 7, 13, 0, 0),
        )
        await publisher.publish(MessageDelivered(receipt=receipt))

        for _ in range(50):
            if raw.send_and_wait.await_count > 0:
                break
            await asyncio.sleep(0.01)

        raw.send_and_wait.assert_awaited_once()
        payload = json.loads(raw.send_and_wait.call_args[1]["value"])
        assert payload["messageId"] == ""
        assert payload["providerMessageId"] == "unknown-msg"
        assert payload["conversationId"] == ""

        await handler.stop()
