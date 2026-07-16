from communication_gateway.domain.enums import DeliveryStatus
from communication_gateway.infrastructure.providers.evolution.evolution_dto import (
    EvolutionApiResponse,
    EvolutionMessageData,
)
from communication_gateway.infrastructure.providers.evolution.evolution_mapper import (
    map_to_inbound_message,
    map_to_provider_response,
)


class TestDtoMapping:
    def test_map_to_provider_response_success(self) -> None:
        api_response = EvolutionApiResponse(
            status="success",
            data={"key": {"id": "ev-msg-1"}, "status": "sent"},
        )
        result = map_to_provider_response(api_response)

        assert result.success is True
        assert result.provider_message_id == "ev-msg-1"
        assert result.status == DeliveryStatus.SENT

    def test_map_to_provider_response_failure(self) -> None:
        api_response = EvolutionApiResponse(
            status="error",
            error="Rate limit exceeded",
        )
        result = map_to_provider_response(api_response)

        assert result.success is False
        assert result.status == DeliveryStatus.FAILED
        assert result.error == "Rate limit exceeded"

    def test_map_to_inbound_message_text(self) -> None:
        data = EvolutionMessageData(
            key={"id": "wh-1", "remoteJid": "1234567890@s.whatsapp.net"},
            push_name="Test User",
            message={"conversation": "Hello!"},
            message_type="conversation",
        )
        result = map_to_inbound_message(data)

        assert result.message_id == "wh-1"
        assert result.from_ == "1234567890"
        assert result.body == "Hello!"
        assert result.content_type == "TEXT"
        assert result.attachment is None

    def test_map_to_inbound_message_with_attachment(self) -> None:
        data = EvolutionMessageData(
            key={"id": "wh-2", "remoteJid": "9876543210@s.whatsapp.net"},
            push_name="Media User",
            message={
                "imageMessage": {
                    "url": "http://example.com/image.jpg",
                    "mimetype": "image/jpeg",
                    "fileLength": "102400",
                    "caption": "Check this out!",
                }
            },
            message_type="imageMessage",
        )
        result = map_to_inbound_message(data)

        assert result.body == "Check this out!"
        assert result.attachment is not None
        assert result.attachment.mime_type == "image/jpeg"
        assert result.attachment.size_bytes == 102400
