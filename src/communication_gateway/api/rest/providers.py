from fastapi import APIRouter

from communication_gateway.application.ports.channel_provider_registry import (
    ChannelProviderRegistry,
)
from communication_gateway.domain.enums import CommunicationProviderType

_registry: ChannelProviderRegistry | None = None
_dispatcher: object | None = None


def set_registry(registry: ChannelProviderRegistry) -> None:
    global _registry
    _registry = registry


def get_registry() -> ChannelProviderRegistry:
    if _registry is None:
        raise RuntimeError("Registry not initialized")
    return _registry


def set_dispatcher(dispatcher: object) -> None:
    global _dispatcher
    _dispatcher = dispatcher


def get_dispatcher() -> object:
    if _dispatcher is None:
        raise RuntimeError("Dispatcher not initialized")
    return _dispatcher


router = APIRouter(prefix="/api/v1", tags=["providers"])


@router.get("/providers")
async def list_providers() -> list[dict]:
    registry = get_registry()
    return [
        {
            "provider_type": p.provider_type.value,
            "channel": None,
        }
        for p in registry.list_providers()
    ]


@router.get("/providers/{provider_type}/health")
async def provider_health(provider_type: str) -> dict:
    registry = get_registry()
    provider = registry.get_by_provider_type(CommunicationProviderType(provider_type.upper()))
    if provider is None:
        return {"status": "unknown", "error": f"Provider {provider_type} not found"}
    try:
        ok = await provider.health()
        return {"status": "ok" if ok else "unavailable", "provider": provider_type}
    except NotImplementedError:
        return {"status": "not_implemented", "provider": provider_type}
    except Exception as e:
        return {"status": "error", "provider": provider_type, "error": str(e)}
