import base64
import ssl
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

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

        mock_smtp.return_value.__aenter__.return_value.send_message.side_effect = aiosmtplib.SMTPException(
            "Connection refused",
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
            "Connection refused",
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

    @patch("aiosmtplib.SMTP")
    async def test_send_with_oauthbearer(
        self,
        mock_smtp: AsyncMock,
        provider: EmailProvider,
    ) -> None:
        provider._settings.username = "service@omnixys.com"
        provider._settings.auth_mode = "oauthbearer"
        provider._get_oauth_token = AsyncMock(return_value="access-token")  # type: ignore[method-assign]
        smtp_instance = AsyncMock()
        smtp_instance.execute_command.return_value = SimpleNamespace(code=235, message="accepted")
        mock_smtp.return_value.__aenter__.return_value = smtp_instance

        message = OutboundMessage(
            id="msg-oauth",
            channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
            to="user@example.com",
            body="OAuth test",
        )
        result = await provider.send(message)

        assert result.success is True
        expected_sasl = base64.b64encode(
            b"n,a=service@omnixys.com,\x01auth=Bearer access-token\x01\x01",
        )
        smtp_instance.execute_command.assert_awaited_once_with(b"AUTH", b"OAUTHBEARER", expected_sasl)
        smtp_instance.login.assert_not_awaited()
        smtp_instance.send_message.assert_awaited_once()

    @patch("aiosmtplib.SMTP")
    async def test_oauthbearer_refreshes_rejected_token_once(
        self,
        mock_smtp: AsyncMock,
        provider: EmailProvider,
    ) -> None:
        provider._settings.username = "service@omnixys.com"
        provider._settings.auth_mode = "oauthbearer"
        provider._get_oauth_token = AsyncMock(side_effect=["stale-token", "fresh-token"])  # type: ignore[method-assign]
        smtp_instance = AsyncMock()
        rejected = SimpleNamespace(code=535, message="authentication failed")
        accepted = SimpleNamespace(code=235, message="accepted")
        smtp_instance.execute_command.side_effect = [rejected, accepted]
        mock_smtp.return_value.__aenter__.return_value = smtp_instance

        message = OutboundMessage(
            id="msg-refresh",
            channel=CommunicationChannel(type=CommunicationChannelType.EMAIL),
            to="user@example.com",
            body="OAuth refresh test",
        )
        result = await provider.send(message)

        assert result.success is True
        assert smtp_instance.execute_command.await_args_list[0].args[0:2] == (b"AUTH", b"OAUTHBEARER")
        assert smtp_instance.execute_command.await_args_list[1].args[0:2] == (b"AUTH", b"OAUTHBEARER")
        assert provider._get_oauth_token.await_args_list[1].kwargs == {"force_refresh": True}

    @patch("httpx.AsyncClient")
    async def test_oauth_token_is_fetched_and_cached(
        self,
        mock_client_class: Mock,
        provider: EmailProvider,
    ) -> None:
        provider._settings.oauth_token_url = "https://keycloak.example/token"
        provider._settings.oauth_client_id = "communication-gateway-mail"
        provider._settings.oauth_client_secret = "client-secret"
        response = Mock()
        response.json.return_value = {"access_token": "access-token", "expires_in": 300}
        client = AsyncMock()
        client.post.return_value = response
        mock_client_class.return_value.__aenter__.return_value = client

        first = await provider._get_oauth_token()
        second = await provider._get_oauth_token()

        assert first == second == "access-token"
        client.post.assert_awaited_once_with(
            "https://keycloak.example/token",
            data={
                "grant_type": "client_credentials",
                "client_id": "communication-gateway-mail",
                "client_secret": "client-secret",
            },
        )
        response.raise_for_status.assert_called_once_with()
