import strawberry
from strawberry.types import Info

from communication_gateway.api.graphql.context import get_registry
from communication_gateway.api.graphql.types.provider import (
    GatewayHealth,
    ProviderStatus,
)


@strawberry.type
class ProviderQuery:

    @strawberry.field
    async def providers(self, info: Info) -> list[ProviderStatus]:
        registry = get_registry(info)
        results: list[ProviderStatus] = []
        for p in registry.list_providers():
            try:
                ok = await p.health()
            except NotImplementedError:
                ok = False
            except Exception:
                ok = False
            caps = await p.capabilities()
            cap_names = [
                k.removeprefix("supports_")
                for k, v in caps.__dict__.items()
                if v
            ]
            results.append(
                ProviderStatus(
                    provider_type=p.provider_type.value,
                    connected=ok,
                    health=ok,
                    capabilities=cap_names,
                )
            )
        return results

    @strawberry.field
    async def provider(self, info: Info, provider_type: str) -> ProviderStatus | None:
        registry = get_registry(info)
        from communication_gateway.domain.enums import CommunicationProviderType

        p = registry.get_by_provider_type(
            CommunicationProviderType(provider_type.upper())
        )
        if p is None:
            return None
        try:
            ok = await p.health()
        except NotImplementedError:
            ok = False
        except Exception:
            ok = False
        caps = await p.capabilities()
        cap_names = [
            k.removeprefix("supports_")
            for k, v in caps.__dict__.items()
            if v
        ]
        return ProviderStatus(
            provider_type=p.provider_type.value,
            connected=ok,
            health=ok,
            capabilities=cap_names,
        )

    @strawberry.field
    async def gateway_health(self, info: Info) -> GatewayHealth:
        registry = get_registry(info)
        providers = registry.list_providers()
        healthy = 0
        for p in providers:
            try:
                if await p.health():
                    healthy += 1
            except Exception:
                pass
        return GatewayHealth(
            status="healthy" if healthy == len(providers) else "degraded",
            provider_count=len(providers),
            healthy_providers=healthy,
        )
