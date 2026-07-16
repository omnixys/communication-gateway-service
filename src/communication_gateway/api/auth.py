from fastapi import Header, HTTPException, status

from communication_gateway.config import settings


async def require_internal_api_key(
    x_internal_api_key: str = Header(default="", alias="x-internal-api-key"),
) -> None:
    expected = settings.core.internal_api_key
    if not expected:
        return
    if x_internal_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_INTERNAL_API_KEY"},
        )
