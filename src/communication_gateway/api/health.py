from typing import Any

import httpx
from fastapi import APIRouter, Response, status
from sqlalchemy import text

from communication_gateway.config import settings
from communication_gateway.database import manager

router = APIRouter(tags=["health"])
_event_forwarder_ready = False


def set_event_forwarder_ready(value: bool) -> None:
    global _event_forwarder_ready
    _event_forwarder_ready = value


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


@router.get("/health/ready")
async def readiness(response: Response) -> dict[str, Any]:
    checks: dict[str, bool] = {
        "evolution": bool(settings.evolution.base_url and settings.evolution.api_key),
        "resend": bool(settings.resend.api_key and settings.resend.from_address),
        "chatForwarder": bool(settings.core.chat_service_url and settings.core.chat_service_api_key),
        "eventForwarder": _event_forwarder_ready,
        "internalApiKey": bool(settings.core.internal_api_key),
    }
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
