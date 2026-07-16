from dataclasses import dataclass, field
from datetime import UTC, datetime

from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)


@dataclass
class MessageMapping:
    internal_id: str
    provider_message_id: str
    provider: CommunicationProviderType
    channel: CommunicationChannelType
    conversation_id: str
    sender: str = ""
    recipient: str = ""
    status: DeliveryStatus = DeliveryStatus.PENDING
    tenant_id: str = ""
    organization_id: str = ""
    provider_instance: str = ""
    retry_count: int = 0
    last_status_change: datetime | None = None
    last_error: str | None = None
    metadata: dict[str, object] | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC).replace(tzinfo=None))
    updated_at: datetime | None = None
