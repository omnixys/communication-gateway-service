import json
from typing import TYPE_CHECKING

import httpx

from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.domain.enums import CommunicationProviderType, DeliveryStatus
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities
from communication_gateway.domain.models.provider_identity import ProviderIdentity
from communication_gateway.domain.models.provider_metadata import ProviderMetadata
from communication_gateway.domain.models.provider_response import ProviderResponse
from communication_gateway.infrastructure.providers.evolution.evolution_dto import (
    EvolutionApiResponse,
    EvolutionMessageData,
    EvolutionWebhookPayload,
)
from communication_gateway.infrastructure.providers.evolution.evolution_mapper import (
    map_to_delivery_receipt,
    map_to_inbound_message,
    map_to_provider_response,
)

if TYPE_CHECKING:
    from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
    from communication_gateway.domain.models.inbound_message import InboundMessage
    from communication_gateway.domain.models.outbound_message import OutboundMessage
    from communication_gateway.infrastructure.providers.evolution.evolution_config import (
        EvolutionApiConfig,
    )


class EvolutionProvider(CommunicationProvider):
    def __init__(self, config: EvolutionApiConfig) -> None:
        self._config = config
        self._client = httpx.AsyncClient(
            base_url=config.base_url.rstrip("/"),
            headers={
                "apiKey": config.api_key,
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(30.0),
        )

    @property
    def provider_type(self) -> CommunicationProviderType:
        return CommunicationProviderType.EVOLUTION

    @property
    def metadata(self) -> ProviderMetadata:
        return ProviderMetadata(
            identity=ProviderIdentity(
                name="Evolution API",
                provider_type=CommunicationProviderType.EVOLUTION,
                version="0.1.0",
                instance=self._config.instance_name,
                api_version="2.3.7",
            ),
            supports_health=True,
            supports_webhooks=True,
            supports_templates=False,
            supports_delivery_receipts=True,
            supports_read_receipts=True,
            supports_typing=True,
        )

    async def send(self, message: OutboundMessage) -> ProviderResponse:
        if message.attachment is not None:
            return await self._send_media(message)
        return await self._send_text(message)

    async def _send_text(self, message: OutboundMessage) -> ProviderResponse:
        response = await self._client.post(
            f"/message/sendText/{self._config.instance_name}",
            json={
                "number": message.to,
                "text": message.body,
            },
        )
        return self._parse_response(response)

    async def _send_media(self, message: OutboundMessage) -> ProviderResponse:
        att = message.attachment
        response = await self._client.post(
            f"/message/sendMedia/{self._config.instance_name}",
            json={
                "number": message.to,
                "mediatype": att.type.value.lower() if att else "document",
                "media": att.url if att else "",
                "caption": message.body,
            },
        )
        return self._parse_response(response)

    async def health(self) -> bool:
        try:
            response = await self._client.get(
                f"/instance/connectionState/{self._config.instance_name}",
            )
            if response.is_success:
                data = response.json()
                instance = data.get("instance", {})
                state = instance.get("state", "") if isinstance(instance, dict) else ""
                return state == "open"
            return False
        except Exception:
            return False

    async def capabilities(self) -> ChannelCapabilities:
        return ChannelCapabilities(
            supports_attachments=True,
            supports_rich_text=False,
            supports_formatting=False,
            supports_typing=True,
            supports_read_receipts=True,
            supports_reactions=False,
            supports_quoted_replies=True,
            supports_forwarding=False,
            supports_editing=False,
            supports_deletion=False,
            supports_delivery_status=True,
            supports_presence=True,
        )

    async def verify_webhook(self, headers: dict[str, str], body: bytes) -> bool:
        api_key = headers.get("apiKey") or headers.get("apikey") or headers.get("x-api-key") or ""
        expected = self._config.api_key
        if expected and api_key == expected:
            return True
        if self._config.webhook_secret:
            return self._verify_signature(headers, body, self._config.webhook_secret)
        return False

    async def handle_webhook(
        self, headers: dict[str, str], body: bytes,
    ) -> InboundMessage | DeliveryReceipt | None:
        raw = json.loads(body)
        payload = EvolutionWebhookPayload(
            event=raw.get("event", ""),
            instance=raw.get("instance", ""),
            data=raw.get("data", {}),
        )
        return self._process_event(payload)

    def _process_event(
        self, payload: EvolutionWebhookPayload,
    ) -> InboundMessage | DeliveryReceipt | None:
        if payload.event == "messages.upsert":
            messages = payload.data if isinstance(payload.data, list) else [payload.data]
            for msg_data in messages:
                message_data = EvolutionMessageData(
                    key=msg_data.get("key", {}),
                    push_name=msg_data.get("pushName", ""),
                    message=msg_data.get("message"),
                    message_type=msg_data.get("messageType"),
                )
                return map_to_inbound_message(message_data)

        elif payload.event == "messages.update":
            message_data = EvolutionMessageData(
                key=payload.data.get("key", {}),
                push_name="",
                message_type=payload.data.get("status", ""),
            )
            return map_to_delivery_receipt(message_data)

        elif payload.event in {"connection.update", "qr"}:
            return None

        return None

    def _parse_response(self, response: httpx.Response) -> ProviderResponse:
        try:
            data = response.json()
            api_response = EvolutionApiResponse(
                status="success" if response.is_success else "error",
                data=data if isinstance(data, dict) else None,
                error=data.get("error", str(response.text)) if not response.is_success else None,
            )
            pr = map_to_provider_response(api_response)
            pr.provider_identity = self.metadata.identity
            return pr
        except Exception:
            return ProviderResponse(
                success=False,
                status=DeliveryStatus.FAILED,
                error=f"HTTP {response.status_code}: {response.text[:200]}",
                provider_identity=self.metadata.identity,
            )

    def _verify_signature(self, headers: dict[str, str], body: bytes, secret: str) -> bool:
        import hmac

        signature = headers.get("x-signature", headers.get("X-Signature", ""))
        if not signature:
            return False
        expected = hmac.new(secret.encode(), body, "sha256").hexdigest()
        return hmac.compare_digest(expected, signature)

    async def close(self) -> None:
        await self._client.aclose()
