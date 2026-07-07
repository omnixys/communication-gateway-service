from dataclasses import dataclass

from communication_gateway.domain.enums import DeliveryStatus


@dataclass
class ProviderResponse:
    success: bool
    provider_message_id: str | None = None
    status: DeliveryStatus = DeliveryStatus.UNKNOWN
    error: str | None = None
    raw: dict | None = None
