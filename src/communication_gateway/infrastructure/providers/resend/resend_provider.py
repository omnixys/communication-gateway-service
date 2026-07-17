from __future__ import annotations

from typing import TYPE_CHECKING

import httpx

from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.domain.enums import CommunicationProviderType, DeliveryStatus
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities
from communication_gateway.domain.models.provider_identity import ProviderIdentity
from communication_gateway.domain.models.provider_metadata import ProviderMetadata
from communication_gateway.domain.models.provider_response import ProviderResponse

if TYPE_CHECKING:
    from communication_gateway.config import ResendSettings
    from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
    from communication_gateway.domain.models.inbound_message import InboundMessage
    from communication_gateway.domain.models.outbound_message import OutboundMessage


class ResendProvider(CommunicationProvider):
    def __init__(self, config: ResendSettings) -> None:
        self._config = config
        self._identity = ProviderIdentity(
            name="Resend",
            provider_type=CommunicationProviderType.RESEND,
            version="1.0.0",
            instance="resend-email",
            api_version="v1",
        )
        self._client = httpx.AsyncClient(
            base_url=config.base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {config.api_key}"},
            timeout=httpx.Timeout(config.timeout),
        )

    @property
    def provider_type(self) -> CommunicationProviderType:
        return CommunicationProviderType.RESEND

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
        subject = str(message.metadata.get("subject", "")).strip()
        sender = str(message.metadata.get("senderAddress") or self._config.from_address).strip()
        if not self._config.api_key or not sender or not subject:
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error="RESEND_NOT_CONFIGURED",
                provider_identity=self._identity,
            )
        payload: dict[str, object] = {
            "from": sender,
            "to": [message.to],
            "subject": subject,
        }
        payload["html" if message.content_type == "HTML" else "text"] = message.body
        try:
            response = await self._client.post("/emails", json=payload)
            data = response.json() if response.content else {}
            if response.is_success and data.get("id"):
                return ProviderResponse(
                    success=True,
                    provider_message_id=str(data["id"]),
                    status=DeliveryStatus.SENT,
                    provider_identity=self._identity,
                )
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error=f"RESEND_HTTP_{response.status_code}",
                provider_identity=self._identity,
            )
        except httpx.TimeoutException:
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error="RESEND_TIMEOUT",
                provider_identity=self._identity,
            )
        except httpx.HTTPError:
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error="RESEND_UNREACHABLE",
                provider_identity=self._identity,
            )

    async def health(self) -> bool:
        return bool(self._config.api_key and self._config.from_address)

    async def capabilities(self) -> ChannelCapabilities:
        return ChannelCapabilities(supports_rich_text=True, supports_formatting=True)

    async def verify_webhook(self, headers: dict[str, str], body: bytes) -> bool:
        return False

    async def handle_webhook(
        self, headers: dict[str, str], body: bytes,
    ) -> InboundMessage | DeliveryReceipt | None:
        return None

    async def close(self) -> None:
        await self._client.aclose()
