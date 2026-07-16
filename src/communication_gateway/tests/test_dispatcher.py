import pytest

from communication_gateway.application.services.gateway_dispatcher import (
    GatewayDispatcher,
)
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    DeliveryStatus,
)
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.provider_response import ProviderResponse
from communication_gateway.domain.models.resolution_context import ResolutionContext
from communication_gateway.tests.conftest import MockProvider


class TestDispatcher:
    async def test_dispatch_calls_send(
        self, dispatcher: GatewayDispatcher, mock_provider: MockProvider
    ) -> None:
        message = OutboundMessage(
            id="msg-1",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            to="+1234567890",
            body="Hello",
        )
        result = await dispatcher.dispatch(message)

        assert result.success is True
        assert mock_provider.last_message is message

    async def test_dispatch_with_context(
        self, dispatcher: GatewayDispatcher, mock_provider: MockProvider
    ) -> None:
        message = OutboundMessage(
            id="msg-2",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            to="+1234567890",
            body="With context",
        )
        context = ResolutionContext(tenant_id="tenant-1")
        result = await dispatcher.dispatch(message, context)

        assert result.success is True

    async def test_dispatch_unknown_channel_raises(
        self, dispatcher: GatewayDispatcher
    ) -> None:
        message = OutboundMessage(
            id="msg-3",
            channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
            to="test@example.com",
            body="Hello",
        )
        with pytest.raises(Exception):
            await dispatcher.dispatch(message)

    async def test_dispatch_propagates_provider_error(
        self,
        dispatcher: GatewayDispatcher,
        mock_provider: MockProvider,
    ) -> None:
        mock_provider.send_result = ProviderResponse(
            success=False,
            status=DeliveryStatus.FAILED,
            error="Provider error",
        )

        message = OutboundMessage(
            id="msg-4",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            to="+1234567890",
            body="Error test",
        )
        result = await dispatcher.dispatch(message)

        assert result.success is False
        assert result.error == "Provider error"
