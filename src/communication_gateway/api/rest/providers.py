from typing import Any

from fastapi import APIRouter, Depends

from communication_gateway.api.auth import require_internal_api_key
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


router = APIRouter(
    prefix="/api/v1",
    tags=["providers"],
    dependencies=[Depends(require_internal_api_key)],
)


@router.get("/providers")
async def list_providers() -> list[dict[str, Any]]:
    registry = get_registry()
    result = []
    for p in registry.list_providers():
        enabled = registry.is_provider_enabled(p.provider_type)
        meta = None
        try:
            meta = p.metadata
        except Exception:
            pass
        entry: dict[str, Any] = {
            "provider_type": p.provider_type.value,
            "enabled": enabled,
        }
        if meta is not None:
            entry["name"] = meta.identity.name
            entry["version"] = meta.identity.version
            entry["instance"] = meta.identity.instance
            entry["api_version"] = meta.identity.api_version
            entry["supports_health"] = meta.supports_health
            entry["supports_webhooks"] = meta.supports_webhooks
        result.append(entry)
    return result


@router.get("/providers/{provider_type}/health")
async def provider_health(provider_type: str) -> dict[str, Any]:
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
