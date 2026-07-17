from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from datetime import datetime

    from communication_gateway.domain.enums import CommunicationProviderType, DeliveryStatus


@dataclass
class DeliveryReceipt:
    message_id: str
    provider_message_id: str
    provider_type: CommunicationProviderType
    status: DeliveryStatus
    timestamp: datetime
    error: str | None = None
