from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, Depends, Header, HTTPException
from security import current_request_context

from communication_gateway.api.auth import require_internal_api_key
from communication_gateway.api.rest.message_dto import SendMessageRequest  # noqa: TC001
from communication_gateway.api.rest.providers import get_dispatcher
from communication_gateway.application.services.gateway_dispatcher import (  # noqa: TC001
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

if TYPE_CHECKING:
    from communication_gateway.application.ports.address_resolver import AddressResolver
    from communication_gateway.application.ports.message_mapping_store import (
        MessageMappingStore,
    )

logger = __import__("structlog").get_logger(__name__)

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
        msg = "Address resolver not initialized"
        raise RuntimeError(msg)
    return _address_resolver


def set_mapping_store(store: MessageMappingStore) -> None:
    global _mapping_store
    _mapping_store = store


def get_mapping_store() -> MessageMappingStore:
    if _mapping_store is None:
        msg = "Mapping store not initialized"
        raise RuntimeError(msg)
    return _mapping_store


@router.post("/messages/send")
async def send_message(
    body: SendMessageRequest,
    dispatcher: GatewayDispatcher = Depends(get_dispatcher),
    x_tenant_id: str | None = Header(default=None, alias="x-tenant-id"),
) -> dict[str, Any]:
    channel_type = CommunicationChannelType(body.channel)
    recipient_id = body.recipient_id or ""

    logger.info(
        "send_message_request",
        message_id=body.id,
        channel=body.channel,
        recipient_id=recipient_id,
    )

    recipient_address = body.recipient_address
    if not recipient_address:
        resolver = get_address_resolver()
        try:
            recipient_address = await resolver.resolve(recipient_id, channel_type)
        except ValueError as exc:
            logger.warning(
                "address_resolution_failed",
                message_id=body.id,
                recipient_id=recipient_id,
                channel=body.channel,
                error=str(exc),
            )
            raise HTTPException(
                status_code=422,
                detail={"code": "ADDRESS_RESOLUTION_FAILED", "message": str(exc)},
            ) from exc

    metadata = dict(body.metadata)
    metadata.pop("tenantId", None)
    if body.subject:
        metadata["subject"] = body.subject
    if body.sender_address:
        metadata["senderAddress"] = body.sender_address
    request_context = current_request_context()
    organization_id = (
        request_context.tenant_id if request_context.is_authenticated and request_context.tenant_id else ""
    )
    if not organization_id and x_tenant_id:
        organization_id = x_tenant_id
    if organization_id:
        metadata["tenantId"] = organization_id

    message = OutboundMessage(
        id=body.id,
        channel=CommunicationChannel(type=channel_type),
        to=recipient_address,
        body=body.body,
        content_type=body.content_type,
        metadata=metadata,
    )
    context = ResolutionContext(
        tenant_id=organization_id,
        metadata=metadata,
    )
    result = await dispatcher.dispatch(message, context)
    provider_type = (
        result.provider_identity.provider_type
        if result.provider_identity is not None
        else (
            CommunicationProviderType.RESEND
            if channel_type is CommunicationChannelType.EMAIL
            else CommunicationProviderType.EVOLUTION
        )
    )

    if not result.success:
        error_code = result.error or "PROVIDER_FAILURE"
        try:
            outcome_store = get_mapping_store()
        except RuntimeError:
            logger.warning("delivery_outcome_store_not_initialized", message_id=body.id)
        else:
            await outcome_store.record_failure(
                internal_id=body.id,
                provider=provider_type,
                channel=channel_type.value,
                organization_id=organization_id,
                error_code=error_code,
            )
        status_code = 504 if "TIMEOUT" in error_code.upper() else 502
        logger.warning(
            "send_message_failed",
            message_id=body.id,
            channel=body.channel,
            error=error_code,
        )
        raise HTTPException(
            status_code=status_code,
            detail={"code": error_code},
        )

    if result.success and result.provider_message_id:
        store = get_mapping_store()
        conv_id = metadata.get("conversationId", "") if isinstance(metadata, dict) else ""
        mapping = MessageMapping(
            internal_id=body.id,
            provider_message_id=result.provider_message_id,
            provider=provider_type,
            channel=channel_type,
            conversation_id=conv_id,
            sender=body.sender_id or "",
            recipient=recipient_address,
            status=result.status,
            tenant_id=organization_id,
            organization_id=organization_id,
        )
        try:
            await store.save(mapping)
        except Exception as exc:
            logger.exception("failed_to_save_message_mapping")
            raise HTTPException(
                status_code=503,
                detail={"code": "DELIVERY_STATE_PERSISTENCE_FAILED"},
            ) from exc

    logger.info(
        "send_message_success",
        message_id=body.id,
        provider_message_id=result.provider_message_id,
        channel=body.channel,
    )

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
