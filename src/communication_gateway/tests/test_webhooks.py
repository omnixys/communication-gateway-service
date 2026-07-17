from datetime import UTC, datetime
from typing import TYPE_CHECKING

import pytest

from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.errors import (
    InvalidStatusTransitionError,
    WebhookVerificationError,
)
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
from communication_gateway.domain.models.inbound_message import InboundMessage
from communication_gateway.domain.models.message_mapping import MessageMapping

if TYPE_CHECKING:
    from communication_gateway.application.services.webhook_service import WebhookService
    from communication_gateway.infrastructure.persistence.in_memory_message_mapping_store import (
        InMemoryMessageMappingStore,
    )
    from communication_gateway.tests.conftest import MockProvider


class TestWebhookService:
    async def test_process_webhook_inbound_message(
        self,
        webhook_service: WebhookService,
        mock_provider: MockProvider,
    ) -> None:
        inbound = InboundMessage(
            message_id="wh-1",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            provider_type=CommunicationProviderType.EVOLUTION,
            from_="+1234567890",
            body="Inbound hello",
        )
        mock_provider.webhook_result = inbound

        result = await webhook_service.process_webhook(
            CommunicationProviderType.EVOLUTION,
            {"apiKey": "test"},
            b"{}",
        )
        assert result is inbound

    async def test_process_webhook_delivery_receipt(
        self,
        webhook_service: WebhookService,
        mock_provider: MockProvider,
    ) -> None:
        receipt = DeliveryReceipt(
            message_id="msg-1",
            provider_message_id="prov-1",
            provider_type=CommunicationProviderType.EVOLUTION,
            status=DeliveryStatus.DELIVERED,
            timestamp=datetime.now(UTC),
        )
        mock_provider.webhook_result = receipt

        result = await webhook_service.process_webhook(
            CommunicationProviderType.EVOLUTION,
            {"apiKey": "test"},
            b"{}",
        )
        assert result is receipt

    async def test_webhook_verification_failure(
        self,
        webhook_service: WebhookService,
        mock_provider: MockProvider,
    ) -> None:
        mock_provider.webhook_should_verify = False

        with pytest.raises(WebhookVerificationError):
            await webhook_service.process_webhook(
                CommunicationProviderType.EVOLUTION,
                {"apiKey": "wrong"},
                b"{}",
            )

    async def test_unknown_provider_type(
        self,
        webhook_service: WebhookService,
    ) -> None:
        with pytest.raises(ValueError):
            await webhook_service.process_webhook(
                CommunicationProviderType.SIGNAL,
                {},
                b"{}",
            )

    async def test_inbound_message_idempotency_skips_duplicate(
        self,
        webhook_service: WebhookService,
        mock_provider: MockProvider,
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        inbound = InboundMessage(
            message_id="dup-1",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            provider_type=CommunicationProviderType.EVOLUTION,
            from_="+1234567890",
            body="Duplicate",
        )
        mock_provider.webhook_result = inbound

        existing = MessageMapping(
            internal_id="existing-1",
            provider_message_id="dup-1",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conv-1",
            status=DeliveryStatus.DELIVERED,
        )
        await mapping_store.save(existing)

        result = await webhook_service.process_webhook(
            CommunicationProviderType.EVOLUTION,
            {"apiKey": "test"},
            b"{}",
        )
        assert result is inbound

    async def test_inbound_message_idempotency_retries_failed(
        self,
        webhook_service: WebhookService,
        mock_provider: MockProvider,
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        inbound = InboundMessage(
            message_id="retry-1",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            provider_type=CommunicationProviderType.EVOLUTION,
            from_="+1234567890",
            body="Retry after failure",
        )
        mock_provider.webhook_result = inbound

        existing = MessageMapping(
            internal_id="failed-1",
            provider_message_id="retry-1",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conv-2",
            status=DeliveryStatus.FAILED,
        )
        await mapping_store.save(existing)

        result = await webhook_service.process_webhook(
            CommunicationProviderType.EVOLUTION,
            {"apiKey": "test"},
            b"{}",
        )
        assert result is inbound

    async def test_delivery_receipt_updates_status(
        self,
        webhook_service: WebhookService,
        mock_provider: MockProvider,
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        receipt = DeliveryReceipt(
            message_id="msg-1",
            provider_message_id="prov-upd-1",
            provider_type=CommunicationProviderType.EVOLUTION,
            status=DeliveryStatus.DELIVERED,
            timestamp=datetime.now(UTC),
        )
        mock_provider.webhook_result = receipt

        existing = MessageMapping(
            internal_id="upd-1",
            provider_message_id="prov-upd-1",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conv-3",
            status=DeliveryStatus.SENT,
        )
        await mapping_store.save(existing)

        result = await webhook_service.process_webhook(
            CommunicationProviderType.EVOLUTION,
            {"apiKey": "test"},
            b"{}",
        )
        assert result is receipt

        updated = await mapping_store.get_by_provider_message_id("prov-upd-1")
        assert updated is not None
        assert updated.status == DeliveryStatus.DELIVERED

    async def test_duplicate_delivery_receipt_skipped(
        self,
        webhook_service: WebhookService,
        mock_provider: MockProvider,
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        receipt = DeliveryReceipt(
            message_id="msg-1",
            provider_message_id="prov-skip-1",
            provider_type=CommunicationProviderType.EVOLUTION,
            status=DeliveryStatus.DELIVERED,
            timestamp=datetime.now(UTC),
        )
        mock_provider.webhook_result = receipt

        existing = MessageMapping(
            internal_id="skip-1",
            provider_message_id="prov-skip-1",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conv-4",
            status=DeliveryStatus.DELIVERED,
        )
        await mapping_store.save(existing)

        result = await webhook_service.process_webhook(
            CommunicationProviderType.EVOLUTION,
            {"apiKey": "test"},
            b"{}",
        )
        assert result is receipt

        updated = await mapping_store.get_by_provider_message_id("prov-skip-1")
        assert updated is not None
        assert updated.status == DeliveryStatus.DELIVERED

    async def test_read_receipt_progression(
        self,
        webhook_service: WebhookService,
        mock_provider: MockProvider,
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        receipt = DeliveryReceipt(
            message_id="msg-1",
            provider_message_id="prov-read-1",
            provider_type=CommunicationProviderType.EVOLUTION,
            status=DeliveryStatus.READ,
            timestamp=datetime.now(UTC),
        )
        mock_provider.webhook_result = receipt

        existing = MessageMapping(
            internal_id="read-1",
            provider_message_id="prov-read-1",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conv-5",
            status=DeliveryStatus.DELIVERED,
        )
        await mapping_store.save(existing)

        result = await webhook_service.process_webhook(
            CommunicationProviderType.EVOLUTION,
            {"apiKey": "test"},
            b"{}",
        )
        assert result is receipt

        updated = await mapping_store.get_by_provider_message_id("prov-read-1")
        assert updated is not None
        assert updated.status == DeliveryStatus.READ

    async def test_invalid_delivery_transition_raises(
        self,
        webhook_service: WebhookService,
        mock_provider: MockProvider,
        mapping_store: InMemoryMessageMappingStore,
    ) -> None:
        receipt = DeliveryReceipt(
            message_id="msg-1",
            provider_message_id="prov-inv-1",
            provider_type=CommunicationProviderType.EVOLUTION,
            status=DeliveryStatus.DELIVERED,
            timestamp=datetime.now(UTC),
        )
        mock_provider.webhook_result = receipt

        existing = MessageMapping(
            internal_id="inv-1",
            provider_message_id="prov-inv-1",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conv-6",
            status=DeliveryStatus.PENDING,
        )
        await mapping_store.save(existing)

        with pytest.raises(InvalidStatusTransitionError):
            await webhook_service.process_webhook(
                CommunicationProviderType.EVOLUTION,
                {"apiKey": "test"},
                b"{}",
            )
