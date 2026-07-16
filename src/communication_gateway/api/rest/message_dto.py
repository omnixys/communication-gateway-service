from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SendMessageRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str = Field(min_length=1, max_length=255)
    channel: Literal["EMAIL", "WHATSAPP"]
    recipient_address: str | None = Field(
        default=None, alias="recipientAddress", min_length=1, max_length=500
    )
    recipient_id: str | None = Field(
        default=None, alias="recipientId", min_length=1, max_length=255
    )
    sender_address: str | None = Field(default=None, alias="senderAddress", max_length=500)
    sender_id: str | None = Field(default=None, alias="senderId", max_length=255)
    body: str = Field(min_length=1, max_length=100_000)
    content_type: Literal["TEXT", "HTML"] = Field(default="TEXT", alias="contentType")
    subject: str | None = Field(default=None, min_length=1, max_length=998)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_channel_fields(self) -> "SendMessageRequest":
        if not self.recipient_address and not self.recipient_id:
            raise ValueError("recipientAddress or recipientId is required")
        if self.channel == "EMAIL" and not self.subject:
            raise ValueError("subject is required for EMAIL")
        if self.channel == "WHATSAPP" and self.content_type != "TEXT":
            raise ValueError("WHATSAPP supports TEXT only in V1")
        return self
