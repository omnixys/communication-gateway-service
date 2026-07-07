
import enum

import strawberry


@strawberry.enum
class ProviderStatusEnum(enum.Enum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    ERROR = "ERROR"
    CONFIGURING = "CONFIGURING"


@strawberry.type
class ProviderStatus:
    provider_type: str
    connected: bool
    health: bool
    last_error: str | None = None
    capabilities: list[str] | None = None


@strawberry.type
class GatewayHealth:
    status: str
    provider_count: int
    healthy_providers: int
