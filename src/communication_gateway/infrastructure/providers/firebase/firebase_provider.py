from typing import TYPE_CHECKING

from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.domain.enums import CommunicationProviderType
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities

if TYPE_CHECKING:
    from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
    from communication_gateway.domain.models.inbound_message import InboundMessage
    from communication_gateway.domain.models.outbound_message import OutboundMessage
    from communication_gateway.domain.models.provider_response import ProviderResponse


class FirebaseProvider(CommunicationProvider):
    @property
    def provider_type(self) -> CommunicationProviderType:
        return CommunicationProviderType.FIREBASE

    async def send(self, message: OutboundMessage) -> ProviderResponse:
        msg = "Firebase provider — to be implemented"
        raise NotImplementedError(msg)

    async def health(self) -> bool:
        msg = "Firebase provider — to be implemented"
        raise NotImplementedError(msg)

    async def capabilities(self) -> ChannelCapabilities:
        return ChannelCapabilities(
            supports_attachments=False,
            supports_read_receipts=False,
            supports_typing=False,
            supports_delivery_status=True,
            supports_presence=False,
        )

    async def verify_webhook(self, headers: dict[str, str], body: bytes) -> bool:
        msg = "Firebase provider — to be implemented"
        raise NotImplementedError(msg)

    async def handle_webhook(
        self, headers: dict[str, str], body: bytes,
    ) -> InboundMessage | DeliveryReceipt | None:
        msg = "Firebase provider — to be implemented"
        raise NotImplementedError(msg)
