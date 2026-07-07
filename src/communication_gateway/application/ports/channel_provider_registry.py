from abc import ABC, abstractmethod

from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.application.ports.provider_resolver import ProviderResolver
from communication_gateway.domain.enums import (
    CommunicationProviderType,
)
from communication_gateway.domain.models.communication_channel import CommunicationChannel


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
