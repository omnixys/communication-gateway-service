from typing import TYPE_CHECKING

from communication_gateway.application.ports.provider_resolver import ProviderResolver

if TYPE_CHECKING:
    from communication_gateway.application.ports.communication_provider import CommunicationProvider
    from communication_gateway.domain.models.outbound_message import OutboundMessage
    from communication_gateway.domain.models.resolution_context import ResolutionContext

logger = __import__("structlog").get_logger(__name__)


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
        for provider in self._providers:
            try:
                if await provider.health():
                    return provider
                logger.warning("provider_unavailable", provider=provider.provider_type.value)
            except Exception as exc:
                logger.warning("provider_health_check_failed", provider=provider.provider_type.value, error=str(exc))

        for provider in self._fallback_providers:
            try:
                if await provider.health():
                    logger.info("using_fallback_provider", provider=provider.provider_type.value)
                    return provider
                logger.warning("fallback_provider_unavailable", provider=provider.provider_type.value)
            except Exception as exc:
                logger.warning(
                    "fallback_provider_health_check_failed",
                    provider=provider.provider_type.value,
                    error=str(exc),
                )

        msg = "No healthy providers available"
        raise ValueError(msg)
