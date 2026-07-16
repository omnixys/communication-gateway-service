from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from communication_gateway.domain.enums import DeliveryStatus
from communication_gateway.domain.models.provider_identity import ProviderIdentity


@dataclass
class ProviderResponse:
    success: bool
    provider_message_id: str | None = None
    status: DeliveryStatus = DeliveryStatus.UNKNOWN
    error: str | None = None
    raw: dict[str, Any] | None = None
    provider_identity: ProviderIdentity | None = None
