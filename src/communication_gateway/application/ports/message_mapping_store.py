from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from communication_gateway.domain.enums import CommunicationProviderType, DeliveryStatus
    from communication_gateway.domain.models.message_mapping import MessageMapping


class MessageMappingStore(ABC):
    @abstractmethod
    async def save(self, mapping: MessageMapping) -> None: ...

    @abstractmethod
    async def get_by_provider_message_id(
        self,
        provider_message_id: str,
    ) -> MessageMapping | None: ...

    @abstractmethod
    async def get_by_internal_id(
        self,
        internal_id: str,
    ) -> MessageMapping | None: ...

    @abstractmethod
    async def find_by_provider_and_provider_message_id(
        self,
        provider: CommunicationProviderType,
        provider_message_id: str,
    ) -> MessageMapping | None: ...

    @abstractmethod
    async def update_status(
        self,
        provider_message_id: str,
        status: DeliveryStatus,
        error: str | None = None,
    ) -> None: ...

    @abstractmethod
    async def increment_retry(
        self,
        internal_id: str,
    ) -> None: ...
