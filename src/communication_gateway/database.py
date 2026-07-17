
from typing import TYPE_CHECKING

from omnixys_database import DatabaseSessionManager

from communication_gateway.config import settings

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

    from sqlalchemy.ext.asyncio import AsyncSession

manager = DatabaseSessionManager(
    url=settings.database.url,
    echo=settings.database.echo,
    pool_size=settings.database.pool_size,
    max_overflow=settings.database.max_overflow,
)


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with manager.session_scope() as session:
        yield session
