from dataclasses import dataclass

from communication_gateway.domain.enums import AttachmentType


@dataclass
class AttachmentReference:
    attachment_id: str
    type: AttachmentType
    url: str
    filename: str
    mime_type: str
    size_bytes: int
