from typing import TYPE_CHECKING, Any

import httpx
from fastapi import APIRouter, Response, status
from sqlalchemy import text

from communication_gateway.config import settings
from communication_gateway.database import manager
from communication_gateway.domain.enums import CommunicationProviderType

if TYPE_CHECKING:
    from communication_gateway.application.ports.channel_provider_registry import (
        ChannelProviderRegistry,
    )

router = APIRouter(tags=["health"])
_event_forwarder_ready = False
_registry: ChannelProviderRegistry | None = None


def set_event_forwarder_ready(value: bool) -> None:
    global _event_forwarder_ready
    _event_forwarder_ready = value


def set_provider_registry(registry: ChannelProviderRegistry) -> None:
    global _registry
    _registry = registry


async def _check_http(name: str, url: str) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=5.0)
        if resp.is_success:
            return {"status": "up"}
        return {"status": "down", "message": f"HTTP {resp.status_code}"}
    except Exception as exc:
        return {"status": "down", "message": str(exc)}


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "communication-gateway", "version": "0.1.0"}


@router.get("/health/live")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


async def _check_resend_api_key() -> bool:
    if not settings.resend.api_key:
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.resend.base_url}/domains",
                headers={"Authorization": f"Bearer {settings.resend.api_key}"},
                timeout=10.0,
            )
        return resp.is_success
    except Exception:
        return False


@router.get("/health/ready")
async def readiness(response: Response) -> dict[str, Any]:
    checks: dict[str, bool] = {}

    if _registry is not None:
        evolution = _registry.get_by_provider_type(CommunicationProviderType.EVOLUTION)
        if evolution is not None:
            checks["evolution"] = await evolution.health()
        else:
            checks["evolution"] = False
    else:
        checks["evolution"] = bool(settings.evolution.base_url and settings.evolution.api_key)

    checks["resend"] = await _check_resend_api_key()

    if _registry is not None:
        stalwart = _registry.get_by_provider_type(CommunicationProviderType.STALWART)
        if stalwart is not None:
            checks["stalwart"] = await stalwart.health()
        else:
            checks["stalwart"] = False
    else:
        checks["stalwart"] = settings.stalwart.enabled and bool(settings.stalwart.host)

    checks["chatForwarder"] = bool(settings.core.chat_service_url and settings.core.chat_service_api_key)
    checks["eventForwarder"] = _event_forwarder_ready
    checks["internalApiKey"] = bool(settings.core.internal_api_key)

    try:
        async with manager.session_factory() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        checks["database"] = False

    if settings.observability.tempo_health_url:
        result = await _check_http("tempo", settings.observability.tempo_health_url)
        checks["tempo"] = result["status"] == "up"
    if settings.observability.prometheus_health_url:
        result = await _check_http("prometheus", settings.observability.prometheus_health_url)
        checks["prometheus"] = result["status"] == "up"

    ready = all(checks.values())
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ready" if ready else "not_ready", "checks": checks}
