from datetime import UTC, datetime

from communication_gateway.domain.enums import (
    AttachmentType,
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.models.attachment_reference import AttachmentReference
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.delivery_receipt import DeliveryReceipt
from communication_gateway.domain.models.inbound_message import InboundMessage
from communication_gateway.domain.models.provider_response import ProviderResponse
from communication_gateway.infrastructure.providers.evolution.evolution_dto import (
    EvolutionApiResponse,
    EvolutionMessageData,
)


def map_to_provider_response(
    api_response: EvolutionApiResponse,
) -> ProviderResponse:
    if api_response.status == "success" and api_response.data:
        provider_message_id = (
            api_response.data.get("key", {}).get("id")
            if isinstance(api_response.data, dict)
            else None
        )
        return ProviderResponse(
            success=True,
            provider_message_id=str(provider_message_id) if provider_message_id else None,
            status=DeliveryStatus.SENT,
            raw=api_response.data if isinstance(api_response.data, dict) else None,
        )
    return ProviderResponse(
        success=False,
        status=DeliveryStatus.FAILED,
        error=api_response.error or "Unknown error",
        raw=api_response.data if isinstance(api_response.data, dict) else None,
    )


def map_to_inbound_message(
    message_data: EvolutionMessageData,
) -> InboundMessage:
    message_id = message_data.key.get("id", "")
    from_number = message_data.key.get("remoteJid", "").replace("@s.whatsapp.net", "")
    body = _extract_body(message_data)
    attachment = _extract_attachment(message_data)

    return InboundMessage(
        message_id=str(message_id),
        channel=CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
        provider_type=CommunicationProviderType.EVOLUTION,
        from_=str(from_number),
        body=body,
        content_type="TEXT" if attachment is None else attachment.type.value,
        attachment=attachment,
        received_at=datetime.now(UTC),
    )


def map_to_delivery_receipt(
    message_data: EvolutionMessageData,
) -> DeliveryReceipt | None:
    message_id = message_data.key.get("id", "")
    status_str = message_data.message_type or ""

    status_map = {
        "read": DeliveryStatus.READ,
        "delivered": DeliveryStatus.DELIVERED,
        "failed": DeliveryStatus.FAILED,
        "sent": DeliveryStatus.SENT,
    }
    status = status_map.get(status_str, DeliveryStatus.UNKNOWN)

    return DeliveryReceipt(
        message_id=str(message_id),
        provider_message_id=str(message_id),
        provider_type=CommunicationProviderType.EVOLUTION,
        status=status,
        timestamp=datetime.now(UTC),
    )


def _extract_body(data: EvolutionMessageData) -> str:
    if data.message is None:
        return ""
    msg = data.message
    if "conversation" in msg:
        return str(msg["conversation"])
    if "extendedTextMessage" in msg:
        return str(msg["extendedTextMessage"].get("text", ""))
    if "imageMessage" in msg:
        return str(msg["imageMessage"].get("caption", ""))
    if "videoMessage" in msg:
        return str(msg["videoMessage"].get("caption", ""))
    if "documentMessage" in msg:
        return str(msg["documentMessage"].get("caption", ""))
    return ""


def _extract_attachment(data: EvolutionMessageData) -> AttachmentReference | None:
    if data.message is None:
        return None
    msg = data.message

    media_mapping = [
        ("imageMessage", AttachmentType.IMAGE),
        ("videoMessage", AttachmentType.VIDEO),
        ("audioMessage", AttachmentType.AUDIO),
        ("documentMessage", AttachmentType.DOCUMENT),
    ]

    for key, att_type in media_mapping:
        if key in msg:
            media = msg[key]
            return AttachmentReference(
                attachment_id=str(data.key.get("id", "")),
                type=att_type,
                url=str(media.get("url", "")),
                filename=str(media.get("fileName", "unknown")),
                mime_type=str(media.get("mimetype", "application/octet-stream")),
                size_bytes=int(media.get("fileLength", 0)),
            )

    return None
