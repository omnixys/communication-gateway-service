from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["attachments"])


@router.post("/attachments/upload")
async def upload_attachment() -> dict[str, Any]:
    raise NotImplementedError("Attachment upload — to be implemented")
