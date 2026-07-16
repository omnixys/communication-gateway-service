from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from communication_gateway.api.auth import require_internal_api_key
from communication_gateway.api.rest.message_dto import SendMessageRequest
from communication_gateway.api.rest.providers import get_dispatcher
from communication_gateway.application.ports.address_resolver import AddressResolver
from communication_gateway.application.ports.message_mapping_store import (
    MessageMappingStore,
)
from communication_gateway.application.services.gateway_dispatcher import (
    GatewayDispatcher,
)
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
)
from communication_gateway.domain.models.communication_channel import (
    CommunicationChannel,
)
from communication_gateway.domain.models.message_mapping import MessageMapping
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.resolution_context import ResolutionContext

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1",
    tags=["messages"],
    dependencies=[Depends(require_internal_api_key)],
)

_address_resolver: AddressResolver | None = None
_mapping_store: MessageMappingStore | None = None


def set_address_resolver(resolver: AddressResolver) -> None:
    global _address_resolver
    _address_resolver = resolver


def get_address_resolver() -> AddressResolver:
    if _address_resolver is None:
        raise RuntimeError("Address resolver not initialized")
    return _address_resolver


def set_mapping_store(store: MessageMappingStore) -> None:
    global _mapping_store
    _mapping_store = store


def get_mapping_store() -> MessageMappingStore:
    if _mapping_store is None:
        raise RuntimeError("Mapping store not initialized")
    return _mapping_store


@router.post("/messages/send")
async def send_message(
    body: SendMessageRequest,
    dispatcher: GatewayDispatcher = Depends(get_dispatcher),
) -> dict[str, Any]:
    channel_type = CommunicationChannelType(body.channel)
    recipient_id = body.recipient_id or ""

    recipient_address = body.recipient_address
    if not recipient_address:
        resolver = get_address_resolver()
        try:
            recipient_address = await resolver.resolve(recipient_id, channel_type)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail={"code": "ADDRESS_RESOLUTION_FAILED", "message": str(exc)},
            ) from exc

    metadata = dict(body.metadata)
    if body.subject:
        metadata["subject"] = body.subject
    if body.sender_address:
        metadata["senderAddress"] = body.sender_address
    tenant_id = metadata.get("tenantId", "") if isinstance(metadata, dict) else ""

    message = OutboundMessage(
        id=body.id,
        channel=CommunicationChannel(type=channel_type),
        to=recipient_address,
        body=body.body,
        content_type=body.content_type,
        metadata=metadata,
    )
    context = ResolutionContext(
        tenant_id=tenant_id,
        metadata=metadata,
    )
    result = await dispatcher.dispatch(message, context)

    if not result.success:
        error_code = result.error or "PROVIDER_FAILURE"
        status_code = 504 if "TIMEOUT" in error_code.upper() else 502
        raise HTTPException(
            status_code=status_code,
            detail={"code": error_code},
        )

    if result.success and result.provider_message_id:
        store = get_mapping_store()
        conv_id = metadata.get("conversationId", "") if isinstance(metadata, dict) else ""
        provider_type = CommunicationProviderType.EVOLUTION
        if result.provider_identity is not None:
            provider_type = result.provider_identity.provider_type
        mapping = MessageMapping(
            internal_id=body.id,
            provider_message_id=result.provider_message_id,
            provider=provider_type,
            channel=channel_type,
            conversation_id=conv_id,
            sender=body.sender_id or "",
            recipient=recipient_address,
            tenant_id=tenant_id,
        )
        try:
            await store.save(mapping)
        except Exception:
            logger.exception("failed_to_save_message_mapping")

    provider_identity = None
    if result.provider_identity is not None:
        pi = result.provider_identity
        provider_identity = {
            "name": pi.name,
            "providerType": pi.provider_type.value,
            "version": pi.version,
            "instance": pi.instance,
            "apiVersion": pi.api_version,
        }

    return {
        "success": result.success,
        "providerMessageId": result.provider_message_id,
        "status": result.status.value if result.status else None,
        "error": result.error,
        "providerIdentity": provider_identity,
    }
