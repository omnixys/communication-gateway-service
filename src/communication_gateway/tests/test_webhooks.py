from datetime import UTC

import pytest

from communication_gateway.application.services.webhook_service import WebhookService
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.errors import WebhookVerificationError
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
from communication_gateway.domain.models.inbound_message import InboundMessage


class TestWebhookService:

    async def test_process_webhook_inbound_message(
        self,
        webhook_service: WebhookService,
        mock_provider,
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
        mock_provider,
    ) -> None:
        from datetime import datetime

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
        mock_provider,
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
