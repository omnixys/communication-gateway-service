from abc import ABC, abstractmethod

from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.resolution_context import ResolutionContext


class ProviderResolver(ABC):

    @abstractmethod
    async def resolve(
        self,
        message: OutboundMessage,
        context: ResolutionContext | None = None,
    ) -> CommunicationProvider: ...
