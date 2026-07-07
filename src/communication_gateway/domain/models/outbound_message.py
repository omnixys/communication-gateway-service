from dataclasses import dataclass, field

from communication_gateway.domain.models.attachment_reference import AttachmentReference
from communication_gateway.domain.models.communication_channel import CommunicationChannel


@dataclass
class OutboundMessage:
    id: str
    channel: CommunicationChannel
    to: str
    body: str
    content_type: str = "TEXT"
    attachment: AttachmentReference | None = None
    metadata: dict[str, object] = field(default_factory=dict)
