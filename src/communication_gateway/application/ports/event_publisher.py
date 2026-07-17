from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator


class OutboundEventPublisher(ABC):
    @abstractmethod
    async def publish(self, event: object) -> None: ...

    @abstractmethod
    async def subscribe(self, event_type: type) -> AsyncGenerator[object]:
        if False:
            yield

    @abstractmethod
    async def unsubscribe(self, event_type: type, queue_id: str) -> None: ...
