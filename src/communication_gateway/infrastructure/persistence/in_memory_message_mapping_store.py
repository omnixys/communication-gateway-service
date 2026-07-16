from datetime import UTC, datetime

from communication_gateway.application.ports.message_mapping_store import (
    MessageMappingStore,
)
from communication_gateway.domain.enums import CommunicationProviderType, DeliveryStatus
from communication_gateway.domain.models.message_mapping import MessageMapping


class InMemoryMessageMappingStore(MessageMappingStore):
    def __init__(self) -> None:
        self._by_provider: dict[str, MessageMapping] = {}
        self._by_internal: dict[str, MessageMapping] = {}
        self._by_composite: dict[tuple[str, str], MessageMapping] = {}

    async def save(self, mapping: MessageMapping) -> None:
        self._by_provider[mapping.provider_message_id] = mapping
        self._by_internal[mapping.internal_id] = mapping
        self._by_composite[(mapping.provider.value, mapping.provider_message_id)] = mapping

    async def get_by_provider_message_id(
        self,
        provider_message_id: str,
    ) -> MessageMapping | None:
        return self._by_provider.get(provider_message_id)

    async def get_by_internal_id(
        self,
        internal_id: str,
    ) -> MessageMapping | None:
        return self._by_internal.get(internal_id)

    async def find_by_provider_and_provider_message_id(
        self,
        provider: CommunicationProviderType,
        provider_message_id: str,
    ) -> MessageMapping | None:
        return self._by_composite.get((provider.value, provider_message_id))

    async def update_status(
        self,
        provider_message_id: str,
        status: DeliveryStatus,
        error: str | None = None,
    ) -> None:
        mapping = self._by_provider.get(provider_message_id)
        if mapping is not None:
            mapping.status = status
            mapping.last_status_change = datetime.now(UTC).replace(tzinfo=None)
            mapping.last_error = error
            mapping.updated_at = datetime.now(UTC).replace(tzinfo=None)

    async def increment_retry(self, internal_id: str) -> None:
        mapping = self._by_internal.get(internal_id)
        if mapping is not None:
            mapping.retry_count += 1
            mapping.updated_at = datetime.now(UTC).replace(tzinfo=None)
