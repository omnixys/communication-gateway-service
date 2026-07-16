import pytest

from communication_gateway.application.ports.channel_provider_registry import ChannelEntry
from communication_gateway.domain.enums import (
    CommunicationChannelType,
    CommunicationProviderType,
)
from communication_gateway.domain.errors import ChannelNotFoundError
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities
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

    def test_duplicate_channel_registration_raises(self) -> None:
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
        with pytest.raises(ValueError, match="already registered"):
            reg.register_channel(
                CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
                entry,
            )

    def test_disable_provider_hides_from_get_by_type(self) -> None:
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
        assert reg.is_provider_enabled(CommunicationProviderType.EVOLUTION) is True

        reg.disable_provider(CommunicationProviderType.EVOLUTION)
        assert reg.is_provider_enabled(CommunicationProviderType.EVOLUTION) is False
        assert reg.get_by_provider_type(CommunicationProviderType.EVOLUTION) is None

        reg.enable_provider(CommunicationProviderType.EVOLUTION)
        assert reg.is_provider_enabled(CommunicationProviderType.EVOLUTION) is True
        assert reg.get_by_provider_type(CommunicationProviderType.EVOLUTION) is provider

    def test_list_providers_includes_disabled_state(self) -> None:
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
        reg.disable_provider(CommunicationProviderType.EVOLUTION)
        providers = reg.list_providers()
        assert len(providers) == 1

    def test_get_providers_by_channel(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        p1 = MockProvider(CommunicationProviderType.EVOLUTION)
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[p1]),
            providers=[p1],
        )
        reg.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )

        providers = reg.get_providers_by_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
        )
        assert len(providers) == 1
        assert providers[0] is p1

    def test_get_providers_by_channel_excludes_disabled(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        p1 = MockProvider(CommunicationProviderType.EVOLUTION)
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[p1]),
            providers=[p1],
        )
        reg.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )
        reg.disable_provider(CommunicationProviderType.EVOLUTION)

        providers = reg.get_providers_by_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
        )
        assert len(providers) == 0

    @pytest.mark.asyncio
    async def test_get_channel_capabilities_merges(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        p1 = MockProvider(CommunicationProviderType.EVOLUTION)
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[p1]),
            providers=[p1],
        )
        reg.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )

        caps = await reg.get_channel_capabilities(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
        )
        assert isinstance(caps, ChannelCapabilities)
        assert caps.supports_attachments is True

    def test_get_provider_metadata(self) -> None:
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

        meta = reg.get_provider_metadata(CommunicationProviderType.EVOLUTION)
        assert meta is not None
        assert meta.identity.name == "Mock Provider"
        assert meta.supports_health is True

    def test_get_provider_metadata_not_found(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        meta = reg.get_provider_metadata(CommunicationProviderType.TWILIO)
        assert meta is None

    def test_multiple_providers_per_channel(self) -> None:
        reg = InMemoryChannelProviderRegistry()
        p1 = MockProvider(CommunicationProviderType.EVOLUTION)
        p2 = MockProvider(CommunicationProviderType.WHATSAPP_CLOUD)
        entry = ChannelEntry(
            resolver=DefaultProviderResolver(providers=[p1, p2]),
            providers=[p1, p2],
        )
        reg.register_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
            entry,
        )

        providers = reg.get_providers_by_channel(
            CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
        )
        assert len(providers) == 2
