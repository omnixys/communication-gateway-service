from dataclasses import dataclass

from communication_gateway.config import settings


@dataclass
class EvolutionApiConfig:
    base_url: str
    api_key: str
    instance_name: str
    webhook_secret: str

    @classmethod
    def from_settings(cls) -> "EvolutionApiConfig":
        return cls(
            base_url=settings.evolution.base_url,
            api_key=settings.evolution.api_key,
            instance_name=settings.evolution.instance_name,
            webhook_secret=settings.evolution.webhook_secret,
        )
