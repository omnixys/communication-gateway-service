from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["attachments"])


@router.post("/attachments/upload")
async def upload_attachment() -> dict[str, Any]:
    msg = "Attachment upload — to be implemented"
    raise NotImplementedError(msg)
