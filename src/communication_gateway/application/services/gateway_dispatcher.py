from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from communication_gateway.application.ports.channel_provider_registry import (
        ChannelProviderRegistry,
    )
    from communication_gateway.domain.models.outbound_message import OutboundMessage
    from communication_gateway.domain.models.provider_response import ProviderResponse
    from communication_gateway.domain.models.resolution_context import ResolutionContext

logger = __import__("structlog").get_logger(__name__)


class GatewayDispatcher:
    def __init__(self, registry: ChannelProviderRegistry) -> None:
        self._registry = registry

    async def dispatch(
        self,
        message: OutboundMessage,
        context: ResolutionContext | None = None,
    ) -> ProviderResponse:
        logger.info(
            "dispatch_started",
            message_id=message.id,
            channel=message.channel.type.value,
            to=message.to,
        )
        try:
            entry = self._registry.get_by_channel(message.channel)
            provider = await entry.resolver.resolve(message, context)
            result = await provider.send(message)
            logger.info(
                "dispatch_completed",
                message_id=message.id,
                provider=provider.provider_type.value,
                provider_message_id=result.provider_message_id,
                success=result.success,
            )
            return result
        except Exception as exc:
            logger.exception(
                "dispatch_failed",
                message_id=message.id,
                channel=message.channel.type.value,
                error=str(exc),
            )
            raise
