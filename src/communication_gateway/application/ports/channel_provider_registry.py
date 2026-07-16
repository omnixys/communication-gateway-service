from abc import ABC, abstractmethod

from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.application.ports.provider_resolver import ProviderResolver
from communication_gateway.domain.enums import (
    CommunicationProviderType,
)
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.provider_metadata import ProviderMetadata


class ChannelEntry:
    def __init__(
        self,
        resolver: ProviderResolver,
        providers: list[CommunicationProvider],
    ) -> None:
        self.resolver = resolver
        self.providers = providers


class ChannelProviderRegistry(ABC):
    @abstractmethod
    def register_channel(
        self,
        channel: CommunicationChannel,
        entry: ChannelEntry,
    ) -> None: ...

    @abstractmethod
    def get_by_channel(self, channel: CommunicationChannel) -> ChannelEntry: ...

    @abstractmethod
    def get_by_provider_type(
        self, provider_type: CommunicationProviderType
    ) -> CommunicationProvider | None: ...

    @abstractmethod
    def list_channels(self) -> list[CommunicationChannel]: ...

    @abstractmethod
    def list_providers(self) -> list[CommunicationProvider]: ...

    @abstractmethod
    def enable_provider(
        self,
        provider_type: CommunicationProviderType,
    ) -> None: ...

    @abstractmethod
    def disable_provider(
        self,
        provider_type: CommunicationProviderType,
    ) -> None: ...

    @abstractmethod
    def is_provider_enabled(
        self,
        provider_type: CommunicationProviderType,
    ) -> bool: ...

    @abstractmethod
    def get_providers_by_channel(
        self,
        channel: CommunicationChannel,
    ) -> list[CommunicationProvider]: ...

    @abstractmethod
    async def get_channel_capabilities(
        self,
        channel: CommunicationChannel,
    ) -> ChannelCapabilities: ...

    @abstractmethod
    def get_provider_metadata(
        self,
        provider_type: CommunicationProviderType,
    ) -> ProviderMetadata | None: ...
