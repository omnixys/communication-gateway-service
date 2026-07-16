from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class EvolutionTextMessageRequest:
    number: str
    text: str
    delay: int = 0


@dataclass
class EvolutionMediaMessageRequest:
    number: str
    mediatype: str
    media: str
    caption: str = ""
    delay: int = 0


@dataclass
class EvolutionApiResponse:
    status: str
    data: dict[str, Any] | None = None
    error: str | None = None


@dataclass
class EvolutionWebhookPayload:
    event: str
    instance: str
    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvolutionMessageData:
    key: dict[str, Any]
    push_name: str
    message: dict[str, Any] | None = None
    message_type: str | None = None


@dataclass
class EvolutionConnectionState:
    instance: str
    state: str
    status_reason: str | None = None
