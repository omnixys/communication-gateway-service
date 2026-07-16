from __future__ import annotations

import logging
import ssl
from email.message import EmailMessage

import aiosmtplib

from communication_gateway.application.ports.communication_provider import (
    CommunicationProvider,
)
from communication_gateway.config import StalwartSettings
from communication_gateway.domain.enums import (
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.models.channel_capabilities import (
    ChannelCapabilities,
)
from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
from communication_gateway.domain.models.inbound_message import InboundMessage
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.provider_identity import ProviderIdentity
from communication_gateway.domain.models.provider_metadata import ProviderMetadata
from communication_gateway.domain.models.provider_response import ProviderResponse

logger = logging.getLogger(__name__)


class EmailProvider(CommunicationProvider):
    def __init__(self, settings: StalwartSettings) -> None:
        self._settings = settings
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
                    await smtp.login(self._settings.username, self._settings.password)
                await smtp.send_message(msg)

            return ProviderResponse(
                success=True,
                provider_message_id=message.id,
                status=DeliveryStatus.SENT,
                provider_identity=self._identity,
            )
        except aiosmtplib.SMTPException as e:
            logger.error("SMTP error: %s", e)
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error=f"SMTP_ERROR: {e}",
                provider_identity=self._identity,
            )
        except OSError as e:
            logger.error("SMTP connection error: %s", e)
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error=f"SMTP_CONNECTION_FAILED: {e}",
                provider_identity=self._identity,
            )
        except Exception as e:
            logger.exception("Unexpected email send error")
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error=f"EMAIL_SEND_FAILED: {e}",
                provider_identity=self._identity,
            )

    def _build_mime(self, message: OutboundMessage) -> EmailMessage:
        msg = EmailMessage()
        msg["From"] = self._settings.from_address
        msg["To"] = [message.to]
        subject = (
            message.metadata.get("subject", "No Subject")
            if isinstance(message.metadata, dict)
            else "No Subject"
        )
        msg["Subject"] = subject
        msg["Message-ID"] = f"<{message.id}@omnixys>"

        if message.content_type == "HTML":
            msg.set_content(message.body, subtype="html")
        else:
            msg.set_content(message.body, subtype="plain")

        if message.attachment is not None:
            maintype = (
                message.attachment.type.value.lower() if message.attachment.type else "application"
            )
            subtype = (
                message.attachment.mime_type.split("/")[-1]
                if "/" in message.attachment.mime_type
                else "octet-stream"
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
        except Exception:
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
