from __future__ import annotations

import asyncio
import contextlib
from typing import TYPE_CHECKING, Any

import httpx

from communication_gateway.domain.events import InboundMessageReceived, MessageDelivered

if TYPE_CHECKING:
    from collections.abc import Mapping
    from uuid import UUID

    from communication_gateway.application.ports.address_resolver import AddressResolver
    from communication_gateway.application.ports.event_publisher import OutboundEventPublisher
    from communication_gateway.application.ports.message_mapping_store import (
        MessageMappingStore,
    )

logger = __import__("structlog").get_logger(__name__)


class HttpEventForwarder:
    def __init__(  # noqa: PLR0913
        self,
        publisher: OutboundEventPublisher,
        chat_service_url: str,
        chat_api_key: str,
        notification_service_url: str,
        notification_api_key: str,
        address_resolver: AddressResolver,
        mapping_store: MessageMappingStore,
        whatsapp_support_event_map: Mapping[str, UUID],
    ) -> None:
        self._publisher = publisher
        self._chat_service_url = chat_service_url.rstrip("/")
        self._notification_service_url = notification_service_url.rstrip("/")
        self._address_resolver = address_resolver
        self._mapping_store = mapping_store
        self._whatsapp_support_event_map = whatsapp_support_event_map
        self._chat_client = httpx.AsyncClient(
            headers={
                "x-api-key": chat_api_key,
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(15.0),
        )
        self._notification_client = httpx.AsyncClient(
            headers={
                "x-internal-token": notification_api_key,
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(15.0),
        )
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run())
        logger.info("http_event_forwarder_started")

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self._chat_client.aclose()
        await self._notification_client.aclose()
        logger.info("http_event_forwarder_stopped")

    async def _run(self) -> None:
        inbound = self._publisher.subscribe(InboundMessageReceived)
        delivery = self._publisher.subscribe(MessageDelivered)

        async def _handle_inbound() -> None:
            async for event in inbound:
                try:
                    if not isinstance(event, InboundMessageReceived):
                        continue
                    await self._forward_inbound(event)
                except Exception:
                    logger.exception("http_event_forwarder_inbound_error")

        async def _handle_delivery() -> None:
            async for event in delivery:
                try:
                    if not isinstance(event, MessageDelivered):
                        continue
                    await self._forward_delivery(event)
                except Exception:
                    logger.exception("http_event_forwarder_delivery_error")

        tasks = [
            asyncio.create_task(_handle_inbound()),
            asyncio.create_task(_handle_delivery()),
        ]
        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            for t in tasks:
                t.cancel()
            raise

    async def _forward_inbound(self, event: InboundMessageReceived) -> None:
        msg = event.message
        event_id = self._whatsapp_support_event_map.get(msg.provider_instance) if msg.provider_instance else None
        if event_id is None:
            logger.warning(
                "whatsapp_support_event_route_missing",
                provider=msg.provider_type.value,
                provider_instance=msg.provider_instance,
                msg_id=msg.message_id,
            )
            return

        support_response = await self._notification_client.post(
            f"{self._notification_service_url}/internal/support/inbound-message",
            json={
                "externalId": msg.message_id,
                "eventId": str(event_id),
                "from": msg.from_,
                "senderName": msg.sender_name,
                "body": msg.body,
                "mediaUrl": msg.attachment.url if msg.attachment else None,
                "mimeType": msg.attachment.mime_type if msg.attachment else None,
            },
        )
        if support_response.is_success:
            logger.info(
                "forward_inbound_support_success",
                msg_id=msg.message_id,
                channel=msg.channel.type.value,
            )
            return
        logger.warning(
            "forward_inbound_support_failed",
            msg_id=msg.message_id,
            status_code=support_response.status_code,
        )

    async def _forward_delivery(self, event: MessageDelivered) -> None:
        receipt = event.receipt
        payload: dict[str, Any] = {
            "provider_message_id": receipt.provider_message_id,
            "status": receipt.status.value,
            "error": receipt.error,
            "timestamp": receipt.timestamp.isoformat() if receipt.timestamp else None,
        }

        mapping = None
        try:
            mapping = await self._mapping_store.get_by_provider_message_id(
                receipt.provider_message_id,
            )
        except Exception:
            logger.exception("mapping_lookup_error", provider_msg_id=receipt.provider_message_id)

        if mapping is not None:
            payload["internal_message_id"] = mapping.internal_id
            payload["conversation_id"] = mapping.conversation_id
        else:
            payload["internal_message_id"] = ""
            payload["conversation_id"] = ""

        logger.info(
            "forward_delivery",
            provider_msg_id=receipt.provider_message_id,
            status=receipt.status.value,
            chat_url=self._chat_service_url,
        )

        response = await self._chat_client.post(
            f"{self._chat_service_url}/api/v1/internal/delivery-status",
            json=payload,
        )

        if response.is_success:
            logger.info("forward_delivery_success", provider_msg_id=receipt.provider_message_id)
        else:
            logger.warning(
                "forward_delivery_failed",
                provider_msg_id=receipt.provider_message_id,
                status_code=response.status_code,
                response_body=response.text[:200],
            )
