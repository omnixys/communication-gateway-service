import json

import pytest
import respx
from httpx import Response

from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.inbound_message import InboundMessage
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.infrastructure.providers.evolution.evolution_config import (
    EvolutionApiConfig,
)
from communication_gateway.infrastructure.providers.evolution.evolution_provider import (
    EvolutionProvider,
)


@pytest.fixture
def config() -> EvolutionApiConfig:
    return EvolutionApiConfig(
        base_url="http://evolution:8080",
        api_key="test-api-key",
        instance_name="test-instance",
        webhook_secret="test-secret",
    )


@pytest.fixture
def provider(config: EvolutionApiConfig) -> EvolutionProvider:
    return EvolutionProvider(config)


class TestEvolutionProvider:
    @property
    def provider_type(self) -> CommunicationProviderType:
        return CommunicationProviderType.EVOLUTION

    async def test_provider_type(self, provider: EvolutionProvider) -> None:
        assert provider.provider_type == CommunicationProviderType.EVOLUTION

    @respx.mock
    async def test_send_text_success(self, provider: EvolutionProvider) -> None:
        respx.post("http://evolution:8080/message/sendText/test-instance").mock(
            return_value=Response(
                200,
                json={
                    "key": {"id": "evolution-msg-1", "remoteJid": "1234567890@s.whatsapp.net"},
                    "status": "PENDING",
                },
            ),
        )

        message = OutboundMessage(
            id="msg-1",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            to="1234567890",
            body="Hello from test",
        )
        result = await provider.send(message)

        assert result.success is True
        assert result.provider_message_id == "evolution-msg-1"

    @respx.mock
    async def test_send_text_failure(self, provider: EvolutionProvider) -> None:
        respx.post("http://evolution:8080/message/sendText/test-instance").mock(
            return_value=Response(400, json={"error": "Bad request"}),
        )

        message = OutboundMessage(
            id="msg-2",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            to="1234567890",
            body="Will fail",
        )
        result = await provider.send(message)

        assert result.success is False
        assert result.status == DeliveryStatus.FAILED

    @respx.mock
    async def test_health_connected(self, provider: EvolutionProvider) -> None:
        respx.get("http://evolution:8080/instance/connectionState/test-instance").mock(
            return_value=Response(200, json={"instance": {"state": "open"}}),
        )

        ok = await provider.health()
        assert ok is True

    @respx.mock
    async def test_health_disconnected(self, provider: EvolutionProvider) -> None:
        respx.get("http://evolution:8080/instance/connectionState/test-instance").mock(
            return_value=Response(200, json={"instance": {"state": "close"}}),
        )

        ok = await provider.health()
        assert ok is False

    @respx.mock
    async def test_health_unreachable(self, provider: EvolutionProvider) -> None:
        respx.get("http://evolution:8080/instance/connectionState/test-instance").mock(
            return_value=Response(503),
        )

        ok = await provider.health()
        assert ok is False

    async def test_verify_webhook_with_api_key(self, provider: EvolutionProvider) -> None:
        headers = {"apiKey": "test-api-key"}
        result = await provider.verify_webhook(headers, b"{}")
        assert result is True

    async def test_verify_webhook_wrong_key(self, provider: EvolutionProvider) -> None:
        headers = {"apiKey": "wrong-key"}
        result = await provider.verify_webhook(headers, b"{}")
        assert result is False

    async def test_handle_webhook_message_upsert(self, provider: EvolutionProvider) -> None:
        payload = {
            "event": "messages.upsert",
            "instance": "test-instance",
            "data": [
                {
                    "key": {"id": "webhook-msg-1", "remoteJid": "1234567890@s.whatsapp.net"},
                    "pushName": "Test User",
                    "message": {"conversation": "Hello from WhatsApp"},
                    "messageType": "conversation",
                },
            ],
        }
        result = await provider.handle_webhook({}, json.dumps(payload).encode())
        assert isinstance(result, InboundMessage)
        assert result.from_ == "1234567890"
        assert result.body == "Hello from WhatsApp"

    async def test_capabilities(self, provider: EvolutionProvider) -> None:
        caps = await provider.capabilities()
        assert caps.supports_attachments is True
        assert caps.supports_typing is True
        assert caps.supports_read_receipts is True
