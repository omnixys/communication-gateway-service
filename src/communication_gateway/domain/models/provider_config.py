from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from datetime import datetime

    from communication_gateway.domain.enums import CommunicationProviderType


@dataclass
class ProviderConfig:
    provider_type: CommunicationProviderType
    enabled: bool = True
    settings: dict[str, str] | None = None
    updated_at: datetime | None = None
