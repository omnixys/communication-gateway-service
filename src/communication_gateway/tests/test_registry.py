import pytest

from communication_gateway.application.ports.channel_provider_registry import ChannelEntry
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
)
from communication_gateway.domain.errors import ChannelNotFoundError
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.infrastructure.persistence.in_memory_registry import (
    InMemoryChannelProviderRegistry,
)
from communication_gateway.infrastructure.resolvers.default_provider_resolver import (
    DefaultProviderResolver,
)
from communication_gateway.tests.conftest import MockProvider


class TestRegistry:

    def test_register_and_get_by_channel(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        provider = MockProvider()
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[provider]),
            providers=[provider],
        )
        channel = CommunicationChannel(type=CommunicationChannelType.WHATSAPP)
        reg.register_channel(channel, entry)

        result = reg.get_by_channel(channel)
        assert result is entry

    def test_get_by_channel_not_found_raises(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        channel = CommunicationChannel(type=CommunicationChannelType.EMAIL)
        with pytest.raises(ChannelNotFoundError):
            reg.get_by_channel(channel)

    def test_get_by_provider_type(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        provider = MockProvider(CommunicationProviderType.EVOLUTION)
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[provider]),
            providers=[provider],
        )
        reg.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )

        result = reg.get_by_provider_type(CommunicationProviderType.EVOLUTION)
        assert result is provider

    def test_get_by_provider_type_not_found(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        result = reg.get_by_provider_type(CommunicationProviderType.TWILIO)
        assert result is None

    def test_list_channels(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        provider = MockProvider()
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[provider]),
            providers=[provider],
        )
        reg.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )
        channels = reg.list_channels()
        assert len(channels) == 1
        assert channels[0].type == CommunicationChannelType.WHATSAPP

    def test_list_providers(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        provider = MockProvider(CommunicationProviderType.EVOLUTION)
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[provider]),
            providers=[provider],
        )
        reg.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )
        providers = reg.list_providers()
        assert len(providers) == 1
        assert providers[0].provider_type == CommunicationProviderType.EVOLUTION
