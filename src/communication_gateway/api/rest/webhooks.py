from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, HTTPException, Request

from communication_gateway.domain.enums import CommunicationProviderType
from communication_gateway.domain.errors import WebhookVerificationError

if TYPE_CHECKING:
    from communication_gateway.application.services.webhook_service import WebhookService

_service: WebhookService | None = None


def set_webhook_service(service: WebhookService) -> None:
    global _service
    _service = service


def get_webhook_service() -> WebhookService:
    if _service is None:
        msg = "Webhook service not initialized"
        raise RuntimeError(msg)
    return _service


router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.post("/{provider_type}")
async def receive_webhook(provider_type: str, request: Request) -> dict[str, Any]:
    service = get_webhook_service()
    try:
        ptype = CommunicationProviderType(provider_type.upper())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"code": "UNKNOWN_PROVIDER"}) from exc
    body = await request.body()
    headers = dict(request.headers)
    try:
        result = await service.process_webhook(ptype, headers, body)
    except WebhookVerificationError as exc:
        raise HTTPException(
            status_code=401, detail={"code": "WEBHOOK_VERIFICATION_FAILED"},
        ) from exc
    return {"received": True, "result": str(type(result).__name__) if result else None}


@router.get("/{provider_type}")
async def verify_webhook_challenge(provider_type: str, request: Request) -> dict[str, Any]:
    raise HTTPException(status_code=405, detail={"code": "CHALLENGE_NOT_SUPPORTED"})
