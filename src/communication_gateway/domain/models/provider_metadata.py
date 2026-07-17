from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from communication_gateway.domain.models.provider_identity import ProviderIdentity


@dataclass
class ProviderMetadata:
    identity: ProviderIdentity
    supports_health: bool = False
    supports_webhooks: bool = False
    supports_templates: bool = False
    supports_delivery_receipts: bool = False
    supports_read_receipts: bool = False
    supports_typing: bool = False
