import ssl
from unittest.mock import AsyncMock, patch

import pytest

from communication_gateway.config import StalwartSettings
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.infrastructure.providers.email.email_provider import (
    EmailProvider,
)


@pytest.fixture
def settings() -> StalwartSettings:
    return StalwartSettings(
        enabled=True,
        host="localhost",
        port=10587,
        tls_enabled=False,
        username="",
        password="",
        from_address="no-reply@omnixys.local",
    )


@pytest.fixture
def provider(settings: StalwartSettings) -> EmailProvider:
    return EmailProvider(settings)


class TestEmailProvider:
    def test_tls_context_can_disable_certificate_verification(
        self,
        provider: EmailProvider,
    ) -> None:
        provider._settings.tls_enabled = True
        provider._settings.tls_verify = False
        context = provider._tls_context()
        assert context is not None
        assert context.verify_mode == ssl.CERT_NONE
        assert context.check_hostname is False

    def test_tls_context_uses_secure_defaults(self, provider: EmailProvider) -> None:
        provider._settings.tls_enabled = True
        provider._settings.tls_verify = True
        context = provider._tls_context()
        assert context is not None
        assert context.verify_mode == ssl.CERT_REQUIRED
        assert context.check_hostname is True

    async def test_provider_type(self, provider: EmailProvider) -> None:
        assert provider.provider_type == CommunicationProviderType.STALWART

    @patch("aiosmtplib.SMTP")
    async def test_send_text_success(
        self,
        mock_smtp: AsyncMock,
        provider: EmailProvider,
    ) -> None:
        smtp_instance = AsyncMock()
        mock_smtp.return_value.__aenter__.return_value = smtp_instance

        message = OutboundMessage(
            id="msg-1",
            channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
            to="user@example.com",
            body="Hello from test",
            content_type="TEXT",
        )
        result = await provider.send(message)

        assert result.success is True
        assert result.status == DeliveryStatus.SENT
        assert result.provider_message_id == "msg-1"
        smtp_instance.send_message.assert_awaited_once()

    @patch("aiosmtplib.SMTP")
    async def test_send_html_success(
        self,
        mock_smtp: AsyncMock,
        provider: EmailProvider,
    ) -> None:
        smtp_instance = AsyncMock()
        mock_smtp.return_value.__aenter__.return_value = smtp_instance

        message = OutboundMessage(
            id="msg-2",
            channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
            to="user@example.com",
            body="<h1>Hello</h1><p>Test</p>",
            content_type="HTML",
            metadata={"subject": "HTML Test"},
        )
        result = await provider.send(message)

        assert result.success is True
        assert result.status == DeliveryStatus.SENT
        assert result.provider_message_id == "msg-2"
        smtp_instance.send_message.assert_awaited_once()

    @patch("aiosmtplib.SMTP")
    async def test_send_smtp_error(
        self,
        mock_smtp: AsyncMock,
        provider: EmailProvider,
    ) -> None:
        import aiosmtplib

        mock_smtp.return_value.__aenter__.return_value.send_message.side_effect = (
            aiosmtplib.SMTPException("Connection refused")
        )

        message = OutboundMessage(
            id="msg-3",
            channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
            to="user@example.com",
            body="Will fail",
        )
        result = await provider.send(message)

        assert result.success is False
        assert result.status == DeliveryStatus.FAILED
        assert "SMTP_ERROR" in (result.error or "")

    @patch("aiosmtplib.SMTP")
    async def test_send_os_error(
        self,
        mock_smtp: AsyncMock,
        provider: EmailProvider,
    ) -> None:
        mock_smtp.return_value.__aenter__.return_value.send_message.side_effect = OSError(
            "Connection refused"
        )

        message = OutboundMessage(
            id="msg-4",
            channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
            to="user@example.com",
            body="Will fail",
        )
        result = await provider.send(message)

        assert result.success is False
        assert result.status == DeliveryStatus.FAILED
        assert "SMTP_CONNECTION_FAILED" in (result.error or "")

    async def test_health_unreachable(self, provider: EmailProvider) -> None:
        ok = await provider.health()
        assert ok is False

    @patch("aiosmtplib.SMTP")
    async def test_health_connected(
        self,
        mock_smtp: AsyncMock,
        provider: EmailProvider,
    ) -> None:
        mock_smtp.return_value.__aenter__.return_value = AsyncMock()
        ok = await provider.health()
        assert ok is True

    async def test_capabilities(self, provider: EmailProvider) -> None:
        caps = await provider.capabilities()
        assert caps.supports_attachments is True
        assert caps.supports_rich_text is True
        assert caps.supports_formatting is True

    async def test_verify_webhook(self, provider: EmailProvider) -> None:
        assert await provider.verify_webhook({}, b"{}") is False

    async def test_handle_webhook(self, provider: EmailProvider) -> None:
        assert await provider.handle_webhook({}, b"{}") is None

    async def test_metadata(self, provider: EmailProvider) -> None:
        meta = provider.metadata
        assert meta.supports_health is True
        assert meta.supports_webhooks is False
        assert meta.identity.provider_type == CommunicationProviderType.STALWART

    @patch("aiosmtplib.SMTP")
    async def test_send_with_login(
        self,
        mock_smtp: AsyncMock,
        provider: EmailProvider,
    ) -> None:
        provider._settings.username = "notification@omnixys.local"
        provider._settings.password = "secret123"

        smtp_instance = AsyncMock()
        mock_smtp.return_value.__aenter__.return_value = smtp_instance

        message = OutboundMessage(
            id="msg-5",
            channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
            to="user@example.com",
            body="Login test",
        )
        result = await provider.send(message)

        assert result.success is True
        smtp_instance.login.assert_awaited_once_with("notification@omnixys.local", "secret123")
        smtp_instance.send_message.assert_awaited_once()
