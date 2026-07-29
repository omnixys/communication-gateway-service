from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import UUID

from security import current_request_context
from sqlalchemy import select

from communication_gateway.application.ports.message_mapping_store import (
    MessageMappingStore,
)
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.models.message_mapping import MessageMapping
from communication_gateway.infrastructure.persistence.models import (
    AnalyticsOutboxModel,
    DeliveryLogModel,
    MessageMappingModel,
    generate_uuid,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

logger = __import__("structlog").get_logger(__name__)


class SqlAlchemyMessageMappingRepository(MessageMappingStore):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def save(self, mapping: MessageMapping) -> None:
        organization_id = _verified_organization_id(mapping.organization_id or mapping.tenant_id)
        model = MessageMappingModel(
            internal_id=mapping.internal_id,
            provider_message_id=mapping.provider_message_id,
            provider=mapping.provider.value,
            channel=mapping.channel.value,
            conversation_id=mapping.conversation_id,
            sender=mapping.sender,
            recipient=mapping.recipient,
            status=mapping.status.value,
            tenant_id=organization_id,
            organization_id=organization_id,
            provider_instance=mapping.provider_instance,
            retry_count=mapping.retry_count,
            last_status_change=mapping.last_status_change,
            last_error=mapping.last_error,
            extra_metadata=mapping.metadata,
            created_at=mapping.created_at or datetime.now(UTC).replace(tzinfo=None),
        )
        try:
            async with self._session_factory() as session:
                session.add(model)
                await _enqueue_delivery_fact(
                    session,
                    model=model,
                    status=mapping.status,
                )
                await session.commit()
            logger.debug(
                "mapping_save",
                internal_id=mapping.internal_id,
                provider=mapping.provider.value,
                provider_message_id=mapping.provider_message_id,
            )
        except Exception as exc:
            logger.exception(
                "mapping_save_failed",
                internal_id=mapping.internal_id,
                provider=mapping.provider.value,
                error=str(exc),
            )
            raise

    async def get_by_provider_message_id(
        self,
        provider_message_id: str,
    ) -> MessageMapping | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(MessageMappingModel).where(
                    MessageMappingModel.provider_message_id == provider_message_id,
                ),
            )
            model = result.scalar_one_or_none()
            return self._to_domain(model) if model else None

    async def get_by_internal_id(
        self,
        internal_id: str,
    ) -> MessageMapping | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(MessageMappingModel).where(MessageMappingModel.internal_id == internal_id),
            )
            model = result.scalar_one_or_none()
            return self._to_domain(model) if model else None

    async def find_by_provider_and_provider_message_id(
        self,
        provider: CommunicationProviderType,
        provider_message_id: str,
    ) -> MessageMapping | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(MessageMappingModel).where(
                    MessageMappingModel.provider == provider.value,
                    MessageMappingModel.provider_message_id == provider_message_id,
                ),
            )
            model = result.scalar_one_or_none()
            return self._to_domain(model) if model else None

    async def update_status(
        self,
        provider_message_id: str,
        status: DeliveryStatus,
        error: str | None = None,
    ) -> None:
        try:
            async with self._session_factory() as session:
                result = await session.execute(
                    select(MessageMappingModel)
                    .where(MessageMappingModel.provider_message_id == provider_message_id)
                    .with_for_update(),
                )
                model = result.scalar_one_or_none()
                if model is None:
                    return
                model.status = status.value
                model.last_status_change = datetime.now(UTC).replace(tzinfo=None)
                model.last_error = error
                model.updated_at = datetime.now(UTC).replace(tzinfo=None)
                await _enqueue_delivery_fact(session, model=model, status=status)
                await session.commit()
            logger.debug(
                "mapping_update_status",
                provider_message_id=provider_message_id,
                status=status.value,
            )
        except Exception as exc:
            logger.exception(
                "mapping_update_status_failed",
                provider_message_id=provider_message_id,
                status=status.value,
                error=str(exc),
            )
            raise

    async def increment_retry(self, internal_id: str) -> None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(MessageMappingModel).where(MessageMappingModel.internal_id == internal_id),
            )
            model = result.scalar_one_or_none()
            if model is not None:
                model.retry_count += 1
                model.updated_at = datetime.now(UTC).replace(tzinfo=None)
                await session.commit()

    async def record_failure(
        self,
        *,
        internal_id: str,
        provider: CommunicationProviderType,
        channel: str,
        organization_id: str,
        error_code: str,
    ) -> None:
        tenant_id = _verified_organization_id(organization_id)
        normalized_error = _normalize_error_code(error_code)
        async with self._session_factory() as session:
            session.add(
                DeliveryLogModel(
                    id=generate_uuid(),
                    message_id=internal_id,
                    provider_type=provider.value,
                    status=DeliveryStatus.FAILED.value,
                    error=normalized_error,
                    attempts=1,
                    tenant_id=tenant_id,
                ),
            )
            await _add_outbox(
                session,
                deduplication_key=f"{tenant_id}:{internal_id}:{DeliveryStatus.FAILED.value}",
                tenant_id=tenant_id,
                topic="communication.delivery.failed.v1",
                event_name="MessageDeliveryFailed",
                aggregate_id=internal_id,
                properties={
                    "channel": channel,
                    "provider": provider.value,
                    "status": DeliveryStatus.FAILED.value,
                },
            )
            await session.commit()

    def _to_domain(self, model: MessageMappingModel) -> MessageMapping:
        return MessageMapping(
            internal_id=model.internal_id,
            provider_message_id=model.provider_message_id,
            provider=CommunicationProviderType(model.provider),
            channel=CommunicationChannelType(model.channel),
            conversation_id=model.conversation_id,
            sender=model.sender,
            recipient=model.recipient,
            status=DeliveryStatus(model.status),
            tenant_id=model.tenant_id,
            organization_id=model.organization_id,
            provider_instance=model.provider_instance,
            retry_count=model.retry_count,
            last_status_change=model.last_status_change,
            last_error=model.last_error,
            metadata=model.extra_metadata,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )


def _verified_organization_id(value: str) -> str:
    try:
        return str(UUID(value))
    except ValueError as exc:
        message = "Verified UUID organization context is required for delivery facts"
        raise ValueError(message) from exc


def _normalize_error_code(value: str) -> str:
    normalized = "".join(char if char.isalnum() else "_" for char in value.upper())
    return normalized[:100] or "PROVIDER_FAILURE"


async def _enqueue_delivery_fact(
    session: AsyncSession,
    *,
    model: MessageMappingModel,
    status: DeliveryStatus,
) -> None:
    if status not in {DeliveryStatus.DELIVERED, DeliveryStatus.READ, DeliveryStatus.FAILED}:
        return
    succeeded = status in {DeliveryStatus.DELIVERED, DeliveryStatus.READ}
    tenant_id = _verified_organization_id(model.organization_id or model.tenant_id)
    await _add_outbox(
        session,
        deduplication_key=f"{tenant_id}:{model.internal_id}:{status.value}",
        tenant_id=tenant_id,
        topic=("communication.delivery.succeeded.v1" if succeeded else "communication.delivery.failed.v1"),
        event_name="MessageDeliverySucceeded" if succeeded else "MessageDeliveryFailed",
        aggregate_id=model.internal_id,
        properties={
            "channel": model.channel,
            "conversationId": model.conversation_id,
            "provider": model.provider,
            "status": status.value,
        },
    )


async def _add_outbox(  # noqa: PLR0913
    session: AsyncSession,
    *,
    deduplication_key: str,
    tenant_id: str,
    topic: str,
    event_name: str,
    aggregate_id: str,
    properties: dict[str, object],
) -> None:
    existing = await session.scalar(
        select(AnalyticsOutboxModel.id).where(
            AnalyticsOutboxModel.deduplication_key == deduplication_key,
        ),
    )
    if existing is not None:
        return
    context = current_request_context()
    session.add(
        AnalyticsOutboxModel(
            id=generate_uuid(),
            deduplication_key=deduplication_key,
            tenant_id=tenant_id,
            topic=topic,
            correlation_id=context.correlation_id,
            payload={
                "producer": "communication-gateway",
                "eventName": event_name,
                "aggregateId": aggregate_id,
                "aggregateType": "message-delivery",
                "properties": properties,
                "occurredAt": datetime.now(UTC).isoformat(),
            },
        ),
    )
    await session.flush()
