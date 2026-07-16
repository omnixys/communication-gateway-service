from communication_gateway.application.ports.channel_provider_registry import (
    ChannelProviderRegistry,
)
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.provider_response import ProviderResponse
from communication_gateway.domain.models.resolution_context import ResolutionContext


class GatewayDispatcher:
    def __init__(self, registry: ChannelProviderRegistry) -> None:
        self._registry = registry

    async def dispatch(
        self,
        message: OutboundMessage,
        context: ResolutionContext | None = None,
    ) -> ProviderResponse:
        entry = self._registry.get_by_channel(message.channel)
        provider = await entry.resolver.resolve(message, context)
        return await provider.send(message)
