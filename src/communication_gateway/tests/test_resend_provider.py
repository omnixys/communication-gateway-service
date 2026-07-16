import respx
from httpx import Response

from communication_gateway.config import ResendSettings
from communication_gateway.domain.enums import CommunicationChannelType, DeliveryStatus
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.infrastructure.providers.resend.resend_provider import ResendProvider


@respx.mock
async def test_resend_sends_subject_html_and_returns_provider_id() -> None:
    provider = ResendProvider(
        ResendSettings(
            api_key="re_test",
            from_address="Omnixys <no-reply@omnixys.com>",
            base_url="https://api.resend.test",
        )
    )
    route = respx.post("https://api.resend.test/emails").mock(
        return_value=Response(200, json={"id": "email-1"})
    )
    message = OutboundMessage(
        id="notification-1",
        channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
        to="person@example.com",
        body="<p>Hello</p>",
        content_type="HTML",
        metadata={"subject": "Welcome"},
    )
    result = await provider.send(message)
    assert result.success is True
    assert result.status == DeliveryStatus.SENT
    assert result.provider_message_id == "email-1"
    payload = __import__("json").loads(route.calls.last.request.content)
    assert payload["subject"] == "Welcome"
    assert payload["html"] == "<p>Hello</p>"
    await provider.close()


async def test_resend_rejects_missing_configuration() -> None:
    provider = ResendProvider(ResendSettings())
    message = OutboundMessage(
        id="notification-2",
        channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
        to="person@example.com",
        body="Hello",
        metadata={"subject": "Welcome"},
    )
    result = await provider.send(message)
    assert result.success is False
    assert result.error == "RESEND_NOT_CONFIGURED"
    await provider.close()
