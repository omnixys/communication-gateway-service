from __future__ import annotations

import asyncio
import base64
import ssl
import time
from email.message import EmailMessage
from typing import TYPE_CHECKING

import aiosmtplib
import httpx
from observability import get_logger

from communication_gateway.application.ports.communication_provider import (
    CommunicationProvider,
)
from communication_gateway.domain.enums import (
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.models.channel_capabilities import (
    ChannelCapabilities,
)
from communication_gateway.domain.models.provider_identity import ProviderIdentity
from communication_gateway.domain.models.provider_metadata import ProviderMetadata
from communication_gateway.domain.models.provider_response import ProviderResponse

if TYPE_CHECKING:
    from communication_gateway.config import StalwartSettings
    from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
    from communication_gateway.domain.models.inbound_message import InboundMessage
    from communication_gateway.domain.models.outbound_message import OutboundMessage

logger = get_logger(__name__)
_SMTP_AUTH_CHALLENGE = 334
_SMTP_AUTH_SUCCESS = 235


class EmailProvider(CommunicationProvider):
    def __init__(self, settings: StalwartSettings) -> None:
        self._settings = settings
        self._oauth_token = ""
        self._oauth_token_expires_at = 0.0
        self._oauth_lock = asyncio.Lock()
        self._identity = ProviderIdentity(
            name="Stalwart",
            provider_type=CommunicationProviderType.STALWART,
            version="0.1.0",
            instance="stalwart-mail",
            api_version="1.0",
        )

    @property
    def provider_type(self) -> CommunicationProviderType:
        return CommunicationProviderType.STALWART

    @property
    def metadata(self) -> ProviderMetadata:
        return ProviderMetadata(
            identity=self._identity,
            supports_health=True,
            supports_webhooks=False,
            supports_templates=False,
            supports_delivery_receipts=False,
            supports_read_receipts=False,
            supports_typing=False,
        )

    async def send(self, message: OutboundMessage) -> ProviderResponse:
        try:
            msg = self._build_mime(message)
            async with aiosmtplib.SMTP(
                hostname=self._settings.host,
                port=self._settings.port,
                start_tls=self._settings.tls_enabled,
                tls_context=self._tls_context(),
                timeout=self._settings.timeout,
            ) as smtp:
                if self._settings.username:
                    await self._authenticate(smtp)
                await smtp.send_message(msg)

            logger.info("stalwart_send_success", message_id=message.id, to=message.to)
            return ProviderResponse(
                success=True,
                provider_message_id=message.id,
                status=DeliveryStatus.SENT,
                provider_identity=self._identity,
            )
        except aiosmtplib.SMTPException as e:
            logger.exception("smtp_error", provider="stalwart", message_id=message.id, to=message.to, error=str(e))
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error=f"SMTP_ERROR: {e}",
                provider_identity=self._identity,
            )
        except OSError as e:
            logger.exception(
                "smtp_connection_error",
                provider="stalwart",
                message_id=message.id,
                to=message.to,
                error=str(e),
            )
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error=f"SMTP_CONNECTION_FAILED: {e}",
                provider_identity=self._identity,
            )
        except Exception as e:
            logger.exception(
                "email_send_unexpected_error",
                provider="stalwart",
                message_id=message.id,
                to=message.to,
                error=str(e),
            )
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error=f"EMAIL_SEND_FAILED: {e}",
                provider_identity=self._identity,
            )

    async def _authenticate(self, smtp: aiosmtplib.SMTP) -> None:
        if self._settings.auth_mode == "password":
            await smtp.login(self._settings.username, self._settings.password)
            return

        token = await self._get_oauth_token()
        try:
            await self._auth_oauthbearer(smtp, token)
        except aiosmtplib.SMTPAuthenticationError:
            token = await self._get_oauth_token(force_refresh=True)
            await self._auth_oauthbearer(smtp, token)

    async def _auth_oauthbearer(self, smtp: aiosmtplib.SMTP, token: str) -> None:
        await smtp.ehlo()
        sasl = f"n,a={self._settings.username},\x01auth=Bearer {token}\x01\x01"
        encoded = base64.b64encode(sasl.encode("utf-8"))
        response = await smtp.execute_command(b"AUTH", b"OAUTHBEARER", encoded)
        if response.code == _SMTP_AUTH_CHALLENGE:
            response = await smtp.execute_command(b"")
        if response.code != _SMTP_AUTH_SUCCESS:
            raise aiosmtplib.SMTPAuthenticationError(response.code, response.message)

    async def _get_oauth_token(self, *, force_refresh: bool = False) -> str:
        if not force_refresh and self._oauth_token and time.monotonic() < self._oauth_token_expires_at:
            return self._oauth_token

        async with self._oauth_lock:
            if not force_refresh and self._oauth_token and time.monotonic() < self._oauth_token_expires_at:
                return self._oauth_token
            if not all(
                (
                    self._settings.oauth_token_url,
                    self._settings.oauth_client_id,
                    self._settings.oauth_client_secret,
                ),
            ):
                msg = "Stalwart OAUTHBEARER requires token URL, client ID, and client secret"
                raise RuntimeError(msg)

            async with httpx.AsyncClient(timeout=self._settings.timeout) as client:
                response = await client.post(
                    self._settings.oauth_token_url,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self._settings.oauth_client_id,
                        "client_secret": self._settings.oauth_client_secret,
                    },
                )
                response.raise_for_status()
                payload = response.json()

            token = payload.get("access_token")
            if not isinstance(token, str) or not token:
                msg = "OIDC token response did not contain access_token"
                raise RuntimeError(msg)
            expires_in = payload.get("expires_in", 300)
            try:
                lifetime = max(0, int(expires_in))
            except (TypeError, ValueError):
                lifetime = 300
            self._oauth_token = token
            self._oauth_token_expires_at = time.monotonic() + max(0, lifetime - 30)
            return token

    def _build_mime(self, message: OutboundMessage) -> EmailMessage:
        msg = EmailMessage()
        msg["From"] = self._settings.from_address
        msg["To"] = [message.to]
        subject = message.metadata.get("subject", "No Subject") if isinstance(message.metadata, dict) else "No Subject"
        msg["Subject"] = subject
        msg["Message-ID"] = f"<{message.id}@omnixys>"

        if message.content_type == "HTML":
            msg.set_content(message.body, subtype="html")
        else:
            msg.set_content(message.body, subtype="plain")

        if message.attachment is not None:
            maintype = message.attachment.type.value.lower() if message.attachment.type else "application"
            subtype = (
                message.attachment.mime_type.split("/")[-1] if "/" in message.attachment.mime_type else "octet-stream"
            )
            msg.add_attachment(
                message.attachment.url,
                maintype=maintype,
                subtype=subtype,
                filename=message.attachment.filename,
            )

        return msg

    async def health(self) -> bool:
        try:
            async with aiosmtplib.SMTP(
                hostname=self._settings.host,
                port=self._settings.port,
                start_tls=self._settings.tls_enabled,
                tls_context=self._tls_context(),
                timeout=10,
            ):
                return True
        except Exception as exc:
            logger.warning("stalwart_health_check_failed", error=str(exc))
            return False

    def _tls_context(self) -> ssl.SSLContext | None:
        if not self._settings.tls_enabled:
            return None
        context = ssl.create_default_context()
        if not self._settings.tls_verify:
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
        return context

    async def capabilities(self) -> ChannelCapabilities:
        return ChannelCapabilities(
            supports_attachments=True,
            supports_rich_text=True,
            supports_formatting=True,
            supports_quoted_replies=True,
            supports_forwarding=True,
            supports_delivery_status=False,
        )

    async def verify_webhook(self, headers: dict[str, str], body: bytes) -> bool:
        return False

    async def handle_webhook(
        self,
        headers: dict[str, str],
        body: bytes,
    ) -> InboundMessage | DeliveryReceipt | None:
        return None
