from typing import Any

import pytest
from pydantic import ValidationError

from communication_gateway.api.rest.message_dto import SendMessageRequest


class TestSendMessageRequestSenderId:
    def _base(self) -> dict[str, Any]:
        return {
            "id": "msg-1",
            "channel": "EMAIL",
            "recipientAddress": "person@example.com",
            "body": "Hello",
            "subject": "Welcome",
        }

    def test_sender_id_optional(self) -> None:
        req = SendMessageRequest(**self._base())
        assert req.sender_id is None

    def test_accepts_valid_uuidv7(self) -> None:
        req = SendMessageRequest(**{**self._base(), "senderId": "0192f0a0-3b1c-7a00-8000-000000000001"})
        assert req.sender_id == "0192f0a0-3b1c-7a00-8000-000000000001"

    def test_accepts_uppercase_valid_uuidv7(self) -> None:
        req = SendMessageRequest(**{**self._base(), "senderId": "0192F0A0-3B1C-7A00-8000-000000000001"})
        assert req.sender_id == "0192F0A0-3B1C-7A00-8000-000000000001"

    def test_rejects_uuidv4(self) -> None:
        with pytest.raises(ValidationError):
            SendMessageRequest(**{**self._base(), "senderId": "123e4567-e89b-42d3-a456-426614174000"})

    def test_rejects_non_uuid_string(self) -> None:
        with pytest.raises(ValidationError):
            SendMessageRequest(**{**self._base(), "senderId": "not-a-uuid"})

    def test_rejects_arbitrary_uuidv7_wrong_version_bit(self) -> None:
        with pytest.raises(ValidationError):
            SendMessageRequest(**{**self._base(), "senderId": "0192f0a0-3b1c-6a00-8000-000000000001"})
