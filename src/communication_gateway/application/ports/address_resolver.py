from abc import ABC, abstractmethod

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
