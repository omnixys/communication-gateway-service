import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_UUID_V7_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class SendMessageRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str = Field(min_length=1, max_length=255)
    channel: Literal["EMAIL", "WHATSAPP"]
    recipient_address: str | None = Field(
        default=None,
        alias="recipientAddress",
        min_length=1,
        max_length=500,
    )
    recipient_id: str | None = Field(
        default=None,
        alias="recipientId",
        min_length=1,
        max_length=255,
    )
    sender_address: str | None = Field(default=None, alias="senderAddress", max_length=500)
    sender_id: str | None = Field(default=None, alias="senderId", max_length=255)
    body: str = Field(min_length=1, max_length=100_000)
    content_type: Literal["TEXT", "HTML"] = Field(default="TEXT", alias="contentType")
    subject: str | None = Field(default=None, min_length=1, max_length=998)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("sender_id", mode="after")
    @classmethod
    def validate_sender_id(cls, v: str | None) -> str | None:
        if v is not None and not _UUID_V7_RE.match(v):
            msg = "senderId must be a valid UUIDv7"
            raise ValueError(msg)
        return v

    @model_validator(mode="after")
    def validate_channel_fields(self) -> SendMessageRequest:
        if not self.recipient_address and not self.recipient_id:
            msg = "recipientAddress or recipientId is required"
            raise ValueError(msg)
        if self.channel == "EMAIL" and not self.subject:
            msg = "subject is required for EMAIL"
            raise ValueError(msg)
        if self.channel == "WHATSAPP" and self.content_type != "TEXT":
            msg = "WHATSAPP supports TEXT only in V1"
            raise ValueError(msg)
        return self
