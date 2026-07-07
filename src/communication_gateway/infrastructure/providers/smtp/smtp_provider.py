from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.domain.enums import CommunicationProviderType
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities
from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
from communication_gateway.domain.models.inbound_message import InboundMessage
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.provider_response import ProviderResponse


class SMTPProvider(CommunicationProvider):

    @property
    def provider_type(self) -> CommunicationProviderType:
        return CommunicationProviderType.SMTP

    async def send(self, message: OutboundMessage) -> ProviderResponse:
        raise NotImplementedError("SMTP provider — to be implemented")

    async def health(self) -> bool:
        raise NotImplementedError("SMTP provider — to be implemented")

    async def capabilities(self) -> ChannelCapabilities:
        return ChannelCapabilities(
            supports_attachments=True,
            supports_rich_text=True,
            supports_formatting=True,
            supports_forwarding=True,
            supports_quoted_replies=True,
            supports_delivery_status=False,
        )

    async def verify_webhook(self, headers: dict[str, str], body: bytes) -> bool:
        raise NotImplementedError("SMTP provider — to be implemented")

    async def handle_webhook(
        self, headers: dict[str, str], body: bytes
    ) -> InboundMessage | DeliveryReceipt | None:
        raise NotImplementedError("SMTP provider — to be implemented")
