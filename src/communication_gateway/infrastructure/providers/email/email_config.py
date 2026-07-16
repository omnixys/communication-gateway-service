from __future__ import annotations

from dataclasses import dataclass

from communication_gateway.config import settings
from communication_gateway.infrastructure.providers.base_config import ProviderConfig


@dataclass
class StalwartConfig(ProviderConfig):
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_address: str = ""

    @classmethod
    def from_settings(cls) -> StalwartConfig:
        return cls(
            enabled=settings.stalwart.enabled,
            priority=settings.stalwart.priority,
            timeout=settings.stalwart.timeout,
            host=settings.stalwart.host,
            port=settings.stalwart.port,
            username=settings.stalwart.username,
            password=settings.stalwart.password,
            from_address=settings.stalwart.from_address,
        )
