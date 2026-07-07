from dataclasses import dataclass, field


@dataclass
class ResolutionContext:
    tenant_id: str | None = None
    deployment_id: str | None = None
    metadata: dict[str, object] = field(default_factory=dict)
