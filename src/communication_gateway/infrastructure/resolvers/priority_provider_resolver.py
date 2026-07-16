from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.application.ports.provider_resolver import ProviderResolver
from communication_gateway.domain.models.outbound_message import OutboundMessage
from communication_gateway.domain.models.resolution_context import ResolutionContext
from communication_gateway.infrastructure.providers.base_config import ProviderConfig


class PriorityProviderResolver(ProviderResolver):
    def __init__(
        self,
        providers: list[CommunicationProvider],
        fallback_providers: list[CommunicationProvider] | None = None,
    ) -> None:
        self._providers = sorted(
            providers,
            key=_provider_priority,
        )
        self._fallback_providers = fallback_providers or []

    async def resolve(
        self,
        message: OutboundMessage,
        context: ResolutionContext | None = None,
    ) -> CommunicationProvider:
        for provider in self._providers:
            if _is_enabled(provider):
                return provider
        if self._fallback_providers:
            return self._fallback_providers[0]
        raise ValueError("No enabled providers available for this channel")


def _provider_priority(provider: CommunicationProvider) -> int:
    config: ProviderConfig | None = getattr(provider, "_config", None)
    if config is not None:
        return config.priority
    return 100


def _is_enabled(provider: CommunicationProvider) -> bool:
    config: ProviderConfig | None = getattr(provider, "_config", None)
    if config is not None:
        return config.enabled
    return True
