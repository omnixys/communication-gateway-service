from communication_gateway.application.ports.channel_provider_registry import (
    ChannelEntry,
    ChannelProviderRegistry,
)
from communication_gateway.application.ports.communication_provider import CommunicationProvider
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
)
from communication_gateway.domain.errors import ChannelNotFoundError
from communication_gateway.domain.models.communication_channel import CommunicationChannel


class InMemoryChannelProviderRegistry(ChannelProviderRegistry):

    def __init__(self) -> None:
        self._channels: dict[CommunicationChannelType, ChannelEntry] = {}
        self._providers: dict[CommunicationProviderType, CommunicationProvider] = {}

    def register_channel(
        self,
        channel: CommunicationChannel,
        entry: ChannelEntry,
    ) -> None:
        self._channels[channel.type] = entry
        for provider in entry.providers:
            self._providers[provider.provider_type] = provider

    def get_by_channel(self, channel: CommunicationChannel) -> ChannelEntry:
        entry = self._channels.get(channel.type)
        if entry is None:
            raise ChannelNotFoundError(channel.type)
        return entry

    def get_by_provider_type(
        self,
        provider_type: CommunicationProviderType,
    ) -> CommunicationProvider | None:
        return self._providers.get(provider_type)

    def list_channels(self) -> list[CommunicationChannel]:
        return [CommunicationChannel(type=ct) for ct in self._channels]

    def list_providers(self) -> list[CommunicationProvider]:
        return list(self._providers.values())
