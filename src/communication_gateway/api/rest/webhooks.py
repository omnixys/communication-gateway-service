from fastapi import APIRouter, Request

from communication_gateway.application.services.webhook_service import WebhookService
from communication_gateway.domain.enums import CommunicationProviderType

_service: WebhookService | None = None


def set_webhook_service(service: WebhookService) -> None:
    global _service
    _service = service


def get_webhook_service() -> WebhookService:
    if _service is None:
        raise RuntimeError("Webhook service not initialized")
    return _service


router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.post("/{provider_type}")
async def receive_webhook(provider_type: str, request: Request) -> dict:
    service = get_webhook_service()
    ptype = CommunicationProviderType(provider_type.upper())
    body = await request.body()
    headers = dict(request.headers)
    result = await service.process_webhook(ptype, headers, body)
    return {"received": True, "result": str(type(result).__name__) if result else None}


@router.get("/{provider_type}")
async def verify_webhook_challenge(provider_type: str, request: Request) -> dict:
    return {"verified": True}
