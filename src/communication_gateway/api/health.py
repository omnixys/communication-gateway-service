from typing import Any

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from communication_gateway.config import settings
from communication_gateway.database import manager

router = APIRouter(tags=["health"])
_event_forwarder_ready = False


def set_event_forwarder_ready(value: bool) -> None:
    global _event_forwarder_ready
    _event_forwarder_ready = value


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
    ready = all(checks.values())
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ready" if ready else "not_ready", "checks": checks}
