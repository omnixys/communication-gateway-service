from dataclasses import dataclass, field


@dataclass
class ProviderConfig:
    enabled: bool = True
    priority: int = 100
    timeout: int = 30
    retry_policy: str = "none"
    metadata: dict[str, str] = field(default_factory=dict)
