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
from communication_gateway.domain.models.channel_capabilities import ChannelCapabilities
from communication_gateway.domain.models.communication_channel import CommunicationChannel
from communication_gateway.domain.models.provider_metadata import ProviderMetadata


class InMemoryChannelProviderRegistry(ChannelProviderRegistry):
    def __init__(self) -> None:
        self._channels: dict[CommunicationChannelType, ChannelEntry] = {}
        self._providers: dict[CommunicationProviderType, CommunicationProvider] = {}
        self._disabled: set[CommunicationProviderType] = set()

    def register_channel(
        self,
        channel: CommunicationChannel,
        entry: ChannelEntry,
    ) -> None:
        if channel.type in self._channels:
            raise ValueError(f"Channel already registered: {channel.type}")
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
        if provider_type in self._disabled:
            return None
        return self._providers.get(provider_type)

    def list_channels(self) -> list[CommunicationChannel]:
        return [CommunicationChannel(type=ct) for ct in self._channels]

    def list_providers(self) -> list[CommunicationProvider]:
        return list(self._providers.values())

    def enable_provider(
        self,
        provider_type: CommunicationProviderType,
    ) -> None:
        self._disabled.discard(provider_type)

    def disable_provider(
        self,
        provider_type: CommunicationProviderType,
    ) -> None:
        self._disabled.add(provider_type)

    def is_provider_enabled(
        self,
        provider_type: CommunicationProviderType,
    ) -> bool:
        return provider_type not in self._disabled

    def get_providers_by_channel(
        self,
        channel: CommunicationChannel,
    ) -> list[CommunicationProvider]:
        entry = self._channels.get(channel.type)
        if entry is None:
            return []
        return [p for p in entry.providers if p.provider_type not in self._disabled]

    async def get_channel_capabilities(
        self,
        channel: CommunicationChannel,
    ) -> ChannelCapabilities:
        providers = self.get_providers_by_channel(channel)
        merged = ChannelCapabilities()
        for provider in providers:
            try:
                caps = await provider.capabilities()
                merged.supports_attachments = (
                    merged.supports_attachments or caps.supports_attachments
                )
                merged.supports_rich_text = merged.supports_rich_text or caps.supports_rich_text
                merged.supports_formatting = merged.supports_formatting or caps.supports_formatting
                merged.supports_typing = merged.supports_typing or caps.supports_typing
                merged.supports_read_receipts = (
                    merged.supports_read_receipts or caps.supports_read_receipts
                )
                merged.supports_reactions = merged.supports_reactions or caps.supports_reactions
                merged.supports_quoted_replies = (
                    merged.supports_quoted_replies or caps.supports_quoted_replies
                )
                merged.supports_forwarding = merged.supports_forwarding or caps.supports_forwarding
                merged.supports_editing = merged.supports_editing or caps.supports_editing
                merged.supports_deletion = merged.supports_deletion or caps.supports_deletion
                merged.supports_delivery_status = (
                    merged.supports_delivery_status or caps.supports_delivery_status
                )
                merged.supports_presence = merged.supports_presence or caps.supports_presence
                merged.supports_templates = merged.supports_templates or caps.supports_templates
                merged.supports_bulk_messaging = (
                    merged.supports_bulk_messaging or caps.supports_bulk_messaging
                )
            except Exception:
                continue
        return merged

    def get_provider_metadata(
        self,
        provider_type: CommunicationProviderType,
    ) -> ProviderMetadata | None:
        provider = self._providers.get(provider_type)
        if provider is None:
            return None
        try:
            return provider.metadata
        except Exception:
            return None
