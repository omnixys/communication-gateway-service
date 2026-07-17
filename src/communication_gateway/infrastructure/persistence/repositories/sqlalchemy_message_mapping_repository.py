from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import select, update

from communication_gateway.application.ports.message_mapping_store import (
    MessageMappingStore,
)
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
    DeliveryStatus,
)
from communication_gateway.domain.models.message_mapping import MessageMapping
from communication_gateway.infrastructure.persistence.models import MessageMappingModel

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


class SqlAlchemyMessageMappingRepository(MessageMappingStore):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def save(self, mapping: MessageMapping) -> None:
        model = MessageMappingModel(
            internal_id=mapping.internal_id,
            provider_message_id=mapping.provider_message_id,
            provider=mapping.provider.value,
            channel=mapping.channel.value,
            conversation_id=mapping.conversation_id,
            sender=mapping.sender,
            recipient=mapping.recipient,
            status=mapping.status.value,
            tenant_id=mapping.tenant_id,
            organization_id=mapping.organization_id,
            provider_instance=mapping.provider_instance,
            retry_count=mapping.retry_count,
            last_status_change=mapping.last_status_change,
            last_error=mapping.last_error,
            extra_metadata=mapping.metadata,
            created_at=mapping.created_at or datetime.now(UTC).replace(tzinfo=None),
        )
        async with self._session_factory() as session:
            session.add(model)
            await session.commit()

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
        async with self._session_factory() as session:
            await session.execute(
                update(MessageMappingModel)
                .where(MessageMappingModel.provider_message_id == provider_message_id)
                .values(
                    status=status.value,
                    last_status_change=datetime.now(UTC).replace(tzinfo=None),
                    last_error=error,
                    updated_at=datetime.now(UTC).replace(tzinfo=None),
                ),
            )
            await session.commit()

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
