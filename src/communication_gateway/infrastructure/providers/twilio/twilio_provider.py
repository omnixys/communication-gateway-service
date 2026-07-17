from typing import TYPE_CHECKING

from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.domain.enums import CommunicationProviderType
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities

if TYPE_CHECKING:
    from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
    from communication_gateway.domain.models.inbound_message import InboundMessage
    from communication_gateway.domain.models.outbound_message import OutboundMessage
    from communication_gateway.domain.models.provider_response import ProviderResponse


class TwilioProvider(CommunicationProvider):
    @property
    def provider_type(self) -> CommunicationProviderType:
        return CommunicationProviderType.TWILIO

    async def send(self, message: OutboundMessage) -> ProviderResponse:
        msg = "Twilio provider — to be implemented"
        raise NotImplementedError(msg)

    async def health(self) -> bool:
        msg = "Twilio provider — to be implemented"
        raise NotImplementedError(msg)

    async def capabilities(self) -> ChannelCapabilities:
        return ChannelCapabilities(
            supports_attachments=False,
            supports_read_receipts=False,
            supports_delivery_status=True,
        )

    async def verify_webhook(self, headers: dict[str, str], body: bytes) -> bool:
        msg = "Twilio provider — to be implemented"
        raise NotImplementedError(msg)

    async def handle_webhook(
        self, headers: dict[str, str], body: bytes,
    ) -> InboundMessage | DeliveryReceipt | None:
        msg = "Twilio provider — to be implemented"
        raise NotImplementedError(msg)
