import pytest

from communication_gateway.domain.enums import (
    CommunicationChannelType,
    DeliveryStatus,
)
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.resolution_context import ResolutionContext


class TestDispatcher:

    async def test_dispatch_calls_send(self, dispatcher, mock_provider) -> None:
        message = OutboundMessage(
            id="msg-1",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            to="+1234567890",
            body="Hello",
        )
        result = await dispatcher.dispatch(message)

        assert result.success is True
        assert mock_provider.last_message is message

    async def test_dispatch_with_context(self, dispatcher, mock_provider) -> None:
        message = OutboundMessage(
            id="msg-2",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            to="+1234567890",
            body="With context",
        )
        context = ResolutionContext(tenant_id="tenant-1")
        result = await dispatcher.dispatch(message, context)

        assert result.success is True

    async def test_dispatch_unknown_channel_raises(self, dispatcher) -> None:
        message = OutboundMessage(
            id="msg-3",
            channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
            to="test@example.com",
            body="Hello",
        )
        with pytest.raises(Exception):
            await dispatcher.dispatch(message)

    async def test_dispatch_propagates_provider_error(self, dispatcher, mock_provider) -> None:
        mock_provider.send_result = {
            "success": False,
            "status": DeliveryStatus.FAILED,
            "error": "Provider error",
        }

        message = OutboundMessage(
            id="msg-4",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            to="+1234567890",
            body="Error test",
        )
        result = await dispatcher.dispatch(message)

        assert result.get("success") is False or result.success is False
