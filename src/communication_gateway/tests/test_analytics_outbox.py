from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

import pytest
import pytest_asyncio
from database import Base
from security.request_context import RequestContext, reset_request_context, set_request_context
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.models.message_mapping import MessageMapping
from communication_gateway.infrastructure.analytics.outbox import AnalyticsOutboxPublisher
from communication_gateway.infrastructure.persistence.models import (
    AnalyticsOutboxModel,
    DeliveryLogModel,
    MessageMappingModel,
)
from communication_gateway.infrastructure.persistence.repositories.sqlalchemy_message_mapping_repository import (
    SqlAlchemyMessageMappingRepository,
)

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator, Generator

TENANT_ID = "11111111-1111-4111-8111-111111111111"


class FakeProducer:
    def __init__(self) -> None:
        self.records: list[dict[str, Any]] = []

    async def publish_raw(
        self,
        topic: str,
        value: bytes,
        key: str | None = None,
        headers: list[tuple[str, bytes]] | None = None,
    ) -> None:
        self.records.append(
            {
                "topic": topic,
                "value": json.loads(value),
                "key": key,
                "headers": dict(headers or []),
            },
        )


@pytest.fixture(autouse=True)
def _verified_context() -> Generator[None]:
    set_request_context(
        RequestContext(
            user_id="service-user",
            tenant_ids=[TENANT_ID],
            tenant_id=TENANT_ID,
            correlation_id="correlation-1",
            is_authenticated=True,
        ),
    )
    yield
    reset_request_context()


@pytest_asyncio.fixture
async def session_factory() -> AsyncGenerator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite://")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield factory
    await engine.dispose()


async def test_status_and_delivery_fact_share_one_transaction(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repository = SqlAlchemyMessageMappingRepository(session_factory)
    await repository.save(
        MessageMapping(
            internal_id="message-1",
            provider_message_id="provider-1",
            provider=CommunicationProviderType.EVOLUTION,
            channel=CommunicationChannelType.WHATSAPP,
            conversation_id="conversation-1",
            organization_id=TENANT_ID,
            status=DeliveryStatus.PENDING,
        ),
    )

    await repository.update_status("provider-1", DeliveryStatus.DELIVERED)

    async with session_factory() as session:
        mapping = await session.scalar(
            select(MessageMappingModel).where(MessageMappingModel.internal_id == "message-1"),
        )
        fact = await session.scalar(select(AnalyticsOutboxModel))
    assert mapping is not None
    assert mapping.status == DeliveryStatus.DELIVERED.value
    assert fact is not None
    assert fact.topic == "communication.delivery.succeeded.v1"
    assert fact.payload["eventName"] == "MessageDeliverySucceeded"
    assert fact.tenant_id == TENANT_ID


async def test_duplicate_status_does_not_create_duplicate_fact(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repository = SqlAlchemyMessageMappingRepository(session_factory)
    await repository.save(
        MessageMapping(
            internal_id="message-2",
            provider_message_id="provider-2",
            provider=CommunicationProviderType.RESEND,
            channel=CommunicationChannelType.EMAIL,
            conversation_id="conversation-2",
            organization_id=TENANT_ID,
        ),
    )
    await repository.update_status("provider-2", DeliveryStatus.FAILED, "PROVIDER_REJECTED")
    await repository.update_status("provider-2", DeliveryStatus.FAILED, "PROVIDER_REJECTED")

    async with session_factory() as session:
        count = await session.scalar(select(func.count(AnalyticsOutboxModel.id)))
    assert count == 1


async def test_failed_attempt_and_fact_are_persisted_together(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repository = SqlAlchemyMessageMappingRepository(session_factory)

    await repository.record_failure(
        internal_id="message-3",
        provider=CommunicationProviderType.RESEND,
        channel=CommunicationChannelType.EMAIL.value,
        organization_id=TENANT_ID,
        error_code="provider rejected",
    )

    async with session_factory() as session:
        log = await session.scalar(select(DeliveryLogModel))
        fact = await session.scalar(select(AnalyticsOutboxModel))
    assert log is not None
    assert log.error == "PROVIDER_REJECTED"
    assert fact is not None
    properties = fact.payload["properties"]
    assert isinstance(properties, dict)
    assert properties["status"] == DeliveryStatus.FAILED.value


async def test_publisher_uses_outbox_id_for_at_least_once_deduplication(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repository = SqlAlchemyMessageMappingRepository(session_factory)
    await repository.record_failure(
        internal_id="message-4",
        provider=CommunicationProviderType.EVOLUTION,
        channel=CommunicationChannelType.WHATSAPP.value,
        organization_id=TENANT_ID,
        error_code="rejected",
    )
    producer = FakeProducer()
    publisher = AnalyticsOutboxPublisher(session_factory, producer)

    assert await publisher.process_batch() == 1
    assert await publisher.process_batch() == 0
    assert len(producer.records) == 1
    assert producer.records[0]["key"] == producer.records[0]["value"]["eventId"]
    assert producer.records[0]["headers"]["x-tenant-id"] == TENANT_ID.encode()


async def test_unverified_organization_rolls_back_mapping(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repository = SqlAlchemyMessageMappingRepository(session_factory)
    with pytest.raises(ValueError, match="Verified UUID"):
        await repository.save(
            MessageMapping(
                internal_id="message-5",
                provider_message_id="provider-5",
                provider=CommunicationProviderType.EVOLUTION,
                channel=CommunicationChannelType.WHATSAPP,
                conversation_id="conversation-5",
                organization_id="client-controlled-value",
            ),
        )

    async with session_factory() as session:
        assert await session.scalar(select(func.count(MessageMappingModel.id))) == 0
        assert await session.scalar(select(func.count(AnalyticsOutboxModel.id))) == 0
