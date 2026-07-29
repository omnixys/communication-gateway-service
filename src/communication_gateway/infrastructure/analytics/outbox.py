from __future__ import annotations

import asyncio
import contextlib
import json
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Protocol
from uuid import uuid4

from sqlalchemy import or_, select

from communication_gateway.infrastructure.persistence.models import AnalyticsOutboxModel

if TYPE_CHECKING:
    from collections.abc import Callable

    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

logger = __import__("structlog").get_logger(__name__)
MAX_RETRIES = 10


class RawKafkaPublisher(Protocol):
    async def publish_raw(
        self,
        topic: str,
        value: bytes,
        key: str | None = None,
        headers: list[tuple[str, bytes]] | None = None,
    ) -> None: ...


class AnalyticsOutboxPublisher:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        producer: RawKafkaPublisher,
        *,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._producer = producer
        self._clock = clock or (lambda: datetime.now(UTC))
        self._instance_id = str(uuid4())

    async def process_batch(self, *, limit: int = 50) -> int:
        ids = await self._claim(limit)
        published = 0
        for event_id in ids:
            if await self._publish(event_id):
                published += 1
        return published

    async def _claim(self, limit: int) -> list[str]:
        now = self._clock()
        stale = now - timedelta(minutes=1)
        async with self._session_factory() as session, session.begin():
            result = await session.execute(
                select(AnalyticsOutboxModel)
                .where(
                    AnalyticsOutboxModel.published_at.is_(None),
                    AnalyticsOutboxModel.dead_lettered_at.is_(None),
                    AnalyticsOutboxModel.next_attempt_at <= now,
                    or_(
                        AnalyticsOutboxModel.locked_at.is_(None),
                        AnalyticsOutboxModel.locked_at < stale,
                    ),
                )
                .order_by(AnalyticsOutboxModel.created_at.asc())
                .limit(limit)
                .with_for_update(skip_locked=True),
            )
            records = list(result.scalars().all())
            for record in records:
                record.locked_at = now
                record.locked_by = self._instance_id
            return [record.id for record in records]

    async def _publish(self, event_id: str) -> bool:
        async with self._session_factory() as session:
            record = await session.get(AnalyticsOutboxModel, event_id)
            if record is None or record.locked_by != self._instance_id:
                return False
            envelope = {
                "eventId": record.id,
                "eventName": record.topic,
                "eventType": "EVENT",
                "eventVersion": "1",
                "service": "communication-gateway",
                "timestamp": record.created_at.isoformat(),
                "payload": record.payload,
            }
            headers = [
                ("x-tenant-id", record.tenant_id.encode()),
                ("x-event-id", record.id.encode()),
                ("x-event-version", b"1"),
                ("x-event-type", b"EVENT"),
                ("x-service", b"communication-gateway"),
            ]
            if record.correlation_id:
                headers.append(("x-correlation-id", record.correlation_id.encode()))
            try:
                await self._producer.publish_raw(
                    topic=record.topic,
                    value=json.dumps(envelope, separators=(",", ":")).encode(),
                    key=record.id,
                    headers=headers,
                )
            except Exception as exc:
                record.attempts += 1
                record.locked_at = None
                record.locked_by = None
                record.last_error = str(exc)[:4000]
                if record.attempts >= MAX_RETRIES:
                    record.dead_lettered_at = self._clock()
                else:
                    record.next_attempt_at = self._clock() + timedelta(
                        seconds=min(300, 2**record.attempts),
                    )
                await session.commit()
                logger.exception("analytics_outbox_publish_failed", event_id=record.id)
                return False
            else:
                record.published_at = self._clock()
                record.locked_at = None
                record.locked_by = None
                record.last_error = None
                await session.commit()
                return True


class AnalyticsOutboxWorker:
    def __init__(self, publisher: AnalyticsOutboxPublisher) -> None:
        self._publisher = publisher
        self._stop = asyncio.Event()
        self._task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._stop.set()
        if self._task is not None:
            with contextlib.suppress(asyncio.CancelledError):
                await self._task

    async def _run(self) -> None:
        while not self._stop.is_set():
            try:
                await self._publisher.process_batch()
            except Exception:
                logger.exception("analytics_outbox_batch_failed")
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=1)
            except TimeoutError:
                continue
