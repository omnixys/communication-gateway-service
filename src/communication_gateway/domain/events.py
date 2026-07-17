from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from communication_gateway.domain.enums import CommunicationProviderType, ProviderStatus
    from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
    from communication_gateway.domain.models.inbound_message import InboundMessage


@dataclass
class InboundMessageReceived:
    message: InboundMessage


@dataclass
class MessageDelivered:
    receipt: DeliveryReceipt


@dataclass
class ProviderStatusChanged:
    provider_type: CommunicationProviderType
    status: ProviderStatus
