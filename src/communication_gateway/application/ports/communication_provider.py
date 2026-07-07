from abc import ABC, abstractmethod

from communication_gateway.domain.enums import CommunicationProviderType
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities
from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
from communication_gateway.domain.models.inbound_message import InboundMessage
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.provider_response import ProviderResponse


class CommunicationProvider(ABC):

    @property
    @abstractmethod
    def provider_type(self) -> CommunicationProviderType: ...

    @abstractmethod
    async def send(self, message: OutboundMessage) -> ProviderResponse: ...

    @abstractmethod
    async def health(self) -> bool: ...

    @abstractmethod
    async def capabilities(self) -> ChannelCapabilities: ...

    @abstractmethod
    async def verify_webhook(self, headers: dict[str, str], body: bytes) -> bool: ...

    @abstractmethod
    async def handle_webhook(
        self, headers: dict[str, str], body: bytes
    ) -> InboundMessage | DeliveryReceipt | None: ...
