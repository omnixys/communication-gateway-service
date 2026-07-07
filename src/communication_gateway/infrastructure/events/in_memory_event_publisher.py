import asyncio
from collections.abc import AsyncGenerator

from communication_gateway.application.ports.event_publisher import OutboundEventPublisher


class InMemoryEventPublisher(OutboundEventPublisher):

    def __init__(self) -> None:
        self._queues: dict[type, dict[str, asyncio.Queue]] = {}

    async def publish(self, event: object) -> None:
        event_type = type(event)
        if event_type not in self._queues:
            return
        for queue in self._queues[event_type].values():
            await queue.put(event)

    async def subscribe(self, event_type: type) -> AsyncGenerator[object]:
        queue_id = str(id(asyncio.current_task()))
        queue: asyncio.Queue = asyncio.Queue()
        self._queues.setdefault(event_type, {})[queue_id] = queue
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            await self.unsubscribe(event_type, queue_id)

    async def unsubscribe(self, event_type: type, queue_id: str) -> None:
        if event_type in self._queues and queue_id in self._queues[event_type]:
            del self._queues[event_type][queue_id]
            if not self._queues[event_type]:
                del self._queues[event_type]
