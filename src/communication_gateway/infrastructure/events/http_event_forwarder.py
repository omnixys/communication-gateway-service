from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import TYPE_CHECKING, Any

import httpx

from communication_gateway.domain.enums import DeliveryStatus
from communication_gateway.domain.events import InboundMessageReceived, MessageDelivered
from communication_gateway.domain.models.message_mapping import MessageMapping

if TYPE_CHECKING:
    from communication_gateway.application.ports.address_resolver import AddressResolver
    from communication_gateway.application.ports.event_publisher import OutboundEventPublisher
    from communication_gateway.application.ports.message_mapping_store import (
        MessageMappingStore,
    )

logger = logging.getLogger(__name__)


class HttpEventForwarder:
    def __init__(
        self,
        publisher: OutboundEventPublisher,
        chat_service_url: str,
        api_key: str,
        address_resolver: AddressResolver,
        mapping_store: MessageMappingStore,
    ) -> None:
        self._publisher = publisher
        self._chat_service_url = chat_service_url.rstrip("/")
        self._api_key = api_key
        self._address_resolver = address_resolver
        self._mapping_store = mapping_store
        self._client = httpx.AsyncClient(
            headers={
                "x-api-key": api_key,
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(15.0),
        )
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self._client.aclose()

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
        payload: dict[str, Any] = {
            "message_id": msg.message_id,
            "channel": msg.channel.type.value,
            "from_": msg.from_,
            "body": msg.body,
            "content_type": msg.content_type,
        }

        user_id = await self._address_resolver.reverse_lookup(msg.from_)
        payload["user_id"] = user_id or ""

        mapping = None
        try:
            mapping = await self._mapping_store.get_by_provider_message_id(
                msg.message_id,
            )
        except Exception:
            logger.exception("mapping_lookup_error")

        if mapping is not None:
            payload["conversation_id"] = mapping.conversation_id
        else:
            payload["conversation_id"] = None

        logger.info(
            "forward_inbound chat=%s msg=%s user=%s conv=%s",
            self._chat_service_url,
            msg.message_id,
            user_id,
            payload.get("conversation_id"),
        )

        response = await self._client.post(
            f"{self._chat_service_url}/api/v1/internal/inbound-message",
            json=payload,
        )

        if response.is_success:
            logger.info("forward_inbound_success msg=%s", msg.message_id)
            data = response.json()
            mapping = MessageMapping(
                internal_id=str(data["id"]),
                provider_message_id=msg.message_id,
                provider=msg.provider_type,
                channel=msg.channel.type,
                conversation_id=str(data["conversation_id"]),
                sender=msg.from_,
                recipient="",
                status=DeliveryStatus.DELIVERED,
            )
            try:
                await self._mapping_store.save(mapping)
            except Exception:
                # A concurrent duplicate webhook may have persisted the same provider ID.
                logger.info("inbound_mapping_already_exists msg=%s", msg.message_id)
        else:
            logger.warning(
                "forward_inbound_failed msg=%s status=%s body=%s",
                msg.message_id,
                response.status_code,
                response.text[:200],
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
            logger.exception("mapping_lookup_error")

        if mapping is not None:
            payload["internal_message_id"] = mapping.internal_id
            payload["conversation_id"] = mapping.conversation_id
        else:
            payload["internal_message_id"] = ""
            payload["conversation_id"] = ""

        logger.info(
            "forward_delivery msg=%s status=%s chat=%s",
            receipt.provider_message_id,
            receipt.status,
            self._chat_service_url,
        )

        response = await self._client.post(
            f"{self._chat_service_url}/api/v1/internal/delivery-status",
            json=payload,
        )

        if response.is_success:
            logger.info("forward_delivery_success msg=%s", receipt.provider_message_id)
        else:
            logger.warning(
                "forward_delivery_failed msg=%s status=%s body=%s",
                receipt.provider_message_id,
                response.status_code,
                response.text[:200],
            )
