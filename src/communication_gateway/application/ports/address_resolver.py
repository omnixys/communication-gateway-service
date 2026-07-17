from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from communication_gateway.domain.enums import CommunicationChannelType


class AddressResolver(ABC):
    @abstractmethod
    async def resolve(
        self,
        user_id: str,
        channel: CommunicationChannelType,
    ) -> str: ...

    @abstractmethod
    async def reverse_lookup(
        self,
        address: str,
    ) -> str | None: ...
