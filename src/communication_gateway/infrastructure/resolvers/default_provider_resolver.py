from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.application.ports.provider_resolver import ProviderResolver
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.resolution_context import ResolutionContext


class DefaultProviderResolver(ProviderResolver):
    def __init__(
        self,
        providers: list[CommunicationProvider],
        fallback_providers: list[CommunicationProvider] | None = None,
    ) -> None:
        self._providers = providers
        self._fallback_providers = fallback_providers or []

    async def resolve(
        self,
        message: OutboundMessage,
        context: ResolutionContext | None = None,
    ) -> CommunicationProvider:
        if not self._providers:
            raise ValueError("No providers available for this channel")
        return self._providers[0]
