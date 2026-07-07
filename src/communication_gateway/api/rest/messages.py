from fastapi import APIRouter, Depends

from communication_gateway.api.rest.providers import get_dispatcher
from communication_gateway.application.services.gateway_dispatcher import GatewayDispatcher
from communication_gateway.domain.enums import CommunicationChannelType
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.resolution_context import ResolutionContext

router = APIRouter(prefix="/api/v1", tags=["messages"])


@router.post("/messages/send")
async def send_message(
    body: dict,
    dispatcher: GatewayDispatcher = Depends(get_dispatcher),
) -> dict:
    channel_type = CommunicationChannelType(body.get("channel", "WHATSAPP"))
    message = OutboundMessage(
        id=body["id"],
        channel=CommunicationChannel(type=channel_type),
        to=body["to"],
        body=body.get("body", ""),
        content_type=body.get("content_type", "TEXT"),
        metadata=body.get("metadata", {}),
    )
    context = ResolutionContext(
        tenant_id=body.get("tenant_id"),
        metadata=body.get("metadata", {}),
    )
    result = await dispatcher.dispatch(message, context)
    return {
        "success": result.success,
        "provider_message_id": result.provider_message_id,
        "status": result.status.value if result.status else None,
        "error": result.error,
    }
