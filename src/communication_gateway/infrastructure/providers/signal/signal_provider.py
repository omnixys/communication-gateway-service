from typing import TYPE_CHECKING

from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.domain.enums import CommunicationProviderType
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities

if TYPE_CHECKING:
    from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
    from communication_gateway.domain.models.inbound_message import InboundMessage
    from communication_gateway.domain.models.outbound_message import OutboundMessage
    from communication_gateway.domain.models.provider_response import ProviderResponse


class SignalProvider(CommunicationProvider):
    @property
    def provider_type(self) -> CommunicationProviderType:
        return CommunicationProviderType.SIGNAL

    async def send(self, message: OutboundMessage) -> ProviderResponse:
        msg = "Signal provider — to be implemented"
        raise NotImplementedError(msg)

    async def health(self) -> bool:
        msg = "Signal provider — to be implemented"
        raise NotImplementedError(msg)

    async def capabilities(self) -> ChannelCapabilities:
        return ChannelCapabilities(
            supports_attachments=True,
            supports_read_receipts=True,
            supports_reactions=True,
            supports_delivery_status=True,
        )

    async def verify_webhook(self, headers: dict[str, str], body: bytes) -> bool:
        msg = "Signal provider — to be implemented"
        raise NotImplementedError(msg)

    async def handle_webhook(
        self, headers: dict[str, str], body: bytes,
    ) -> InboundMessage | DeliveryReceipt | None:
        msg = "Signal provider — to be implemented"
        raise NotImplementedError(msg)
