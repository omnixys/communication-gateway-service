from dataclasses import dataclass

from communication_gateway.domain.enums import CommunicationProviderType


@dataclass(frozen=True)
class ProviderIdentity:
    name: str
    provider_type: CommunicationProviderType
    version: str = "0.1.0"
    instance: str = ""
    api_version: str = ""
