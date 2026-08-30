from types import SimpleNamespace
from typing import TYPE_CHECKING, Any, cast

import httpx
import pytest

if TYPE_CHECKING:
    from collections.abc import Callable, Coroutine

from communication_gateway.domain.enums import CommunicationChannelType, CommunicationProviderType
from communication_gateway.domain.events import InboundMessageReceived
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.inbound_message import InboundMessage
from communication_gateway.infrastructure.events.http_event_forwarder import HttpEventForwarder


class RecordingClient:
    def __init__(self, status_code: int, json_body: dict[str, str] | None = None) -> None:
        self.status_code = status_code
        self.json_body = json_body or {}
        self.requests: list[tuple[str, dict[str, object]]] = []

    async def post(self, url: str, *, json: dict[str, object]) -> httpx.Response:
        self.requests.append((url, json))
        return httpx.Response(self.status_code, json=self.json_body)


def create_forwarder() -> HttpEventForwarder:
    return HttpEventForwarder(
        publisher=cast("Any", SimpleNamespace()),
        chat_service_url="http://chat",
        chat_api_key="chat-key",
        notification_service_url="http://notification",
        notification_api_key="notification-key",
        address_resolver=cast("Any", SimpleNamespace(reverse_lookup=lambda _address: None)),
        mapping_store=cast("Any", SimpleNamespace(get_by_provider_message_id=lambda _message_id: None)),
    )


def inbound_event() -> InboundMessageReceived:
    return InboundMessageReceived(
        InboundMessage(
            message_id="evolution-message-1",
            channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            provider_type=CommunicationProviderType.EVOLUTION,
            from_="491701234567@s.whatsapp.net",
            body="Hallo",
        ),
    )


@pytest.mark.asyncio
async def test_known_whatsapp_support_thread_stops_after_notification_accepts() -> None:
    forwarder = create_forwarder()
    notification = RecordingClient(201)
    chat = RecordingClient(201, {"id": "message-1", "conversation_id": "chat-1"})
    forwarder._notification_client = cast("Any", notification)
    forwarder._chat_client = cast("Any", chat)

    await forwarder._forward_inbound(inbound_event())

    assert notification.requests == [
        (
            "http://notification/internal/support/inbound-message",
            {
                "externalId": "evolution-message-1",
                "from": "491701234567@s.whatsapp.net",
                "body": "Hallo",
                "mediaUrl": None,
                "mimeType": None,
            },
        ),
    ]
    assert chat.requests == []


@pytest.mark.asyncio
async def test_unknown_support_contact_continues_through_existing_chat_path() -> None:
    forwarder = create_forwarder()
    notification = RecordingClient(404)
    chat = RecordingClient(201, {"id": "message-1", "conversation_id": "chat-1"})
    forwarder._notification_client = cast("Any", notification)
    forwarder._chat_client = cast("Any", chat)
    forwarder._address_resolver = cast("Any", SimpleNamespace(reverse_lookup=async_value(None)))
    forwarder._mapping_store = cast(
        "Any",
        SimpleNamespace(get_by_provider_message_id=async_value(None), save=async_value(None)),
    )

    await forwarder._forward_inbound(inbound_event())

    assert len(chat.requests) == 1
    assert chat.requests[0][1]["conversation_id"] is None


@pytest.mark.asyncio
async def test_notification_failure_does_not_guess_a_chat_or_event() -> None:
    forwarder = create_forwarder()
    notification = RecordingClient(503)
    chat = RecordingClient(201)
    forwarder._notification_client = cast("Any", notification)
    forwarder._chat_client = cast("Any", chat)

    await forwarder._forward_inbound(inbound_event())

    assert chat.requests == []


def async_value(value: object) -> Callable[..., Coroutine[Any, Any, object]]:
    async def result(*_args: object) -> object:
        return value

    return result
