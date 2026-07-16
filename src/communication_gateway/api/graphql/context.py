from dataclasses import dataclass, field
from typing import Any

from strawberry.fastapi import BaseContext
from strawberry.types import Info

from communication_gateway.application.ports.channel_provider_registry import (
    ChannelProviderRegistry,
)


@dataclass
class GraphQLContext(BaseContext):
    registry: ChannelProviderRegistry = field(default=None)  # type: ignore[assignment]


def get_registry(info: Info[GraphQLContext, Any]) -> ChannelProviderRegistry:
    ctx: GraphQLContext = info.context
    return ctx.registry
