from communication_gateway.domain.enums import CommunicationChannelType, CommunicationProviderType


class GatewayError(Exception):
    """Base error for the Communication Gateway."""


class ProviderNotFoundError(GatewayError):
    def __init__(self, provider_type: CommunicationProviderType) -> None:
        self.provider_type = provider_type
        super().__init__(f"No provider registered for type: {provider_type}")


class ChannelNotFoundError(GatewayError):
    def __init__(self, channel_type: CommunicationChannelType) -> None:
        self.channel_type = channel_type
        super().__init__(f"No channel entry registered for: {channel_type}")


class ProviderNotAvailableError(GatewayError):
    def __init__(self, provider_type: CommunicationProviderType) -> None:
        self.provider_type = provider_type
        super().__init__(f"Provider not available: {provider_type}")


class DeliveryFailedError(GatewayError):
    def __init__(self, provider_type: CommunicationProviderType, reason: str) -> None:
        self.provider_type = provider_type
        self.reason = reason
        super().__init__(f"Delivery failed via {provider_type}: {reason}")


class WebhookVerificationError(GatewayError):
    def __init__(self, provider_type: CommunicationProviderType) -> None:
        self.provider_type = provider_type
        super().__init__(f"Webhook verification failed for provider: {provider_type}")


class ConfigurationError(GatewayError):
    def __init__(self, message: str) -> None:
        super().__init__(f"Configuration error: {message}")
