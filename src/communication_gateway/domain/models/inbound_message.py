from dataclasses import dataclass
from datetime import datetime

from communication_gateway.domain.enums import CommunicationProviderType
from communication_gateway.domain.models.attachment_reference import AttachmentReference
from communication_gateway.domain.models.communication_channel import CommunicationChannel


@dataclass
class InboundMessage:
    message_id: str
    channel: CommunicationChannel
    provider_type: CommunicationProviderType
    from_: str
    body: str
    content_type: str = "TEXT"
    attachment: AttachmentReference | None = None
    conversation_id: str | None = None
    received_at: datetime | None = None
