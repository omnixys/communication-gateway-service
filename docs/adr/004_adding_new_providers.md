# ADR 004 — Adding New Providers

**Status:** Accepted  
**Date:** 2026-07-07

## Context

The Gateway must support adding new communication providers without modifying existing code. Providers differ in authentication, API structure, capabilities, and webhook format.

## Decision

Adding a new provider requires exactly 4 steps, and no changes outside the infrastructure layer.

### Step 1: Implement `CommunicationProvider`

Create a package under `infrastructure/providers/<name>/` with:

```python
class NewProvider(CommunicationProvider):
    @property
    def provider_type(self) -> CommunicationProviderType: ...

    async def send(self, message: OutboundMessage) -> ProviderResponse: ...
    async def health(self) -> bool: ...
    async def capabilities(self) -> ChannelCapabilities: ...
    async def verify_webhook(self, headers, body) -> bool: ...
    async def handle_webhook(self, headers, body) -> InboundMessage | DeliveryReceipt | None: ...
```

### Step 2: Create DTOs + Mapper

- `*_dto.py` — Data transfer objects matching the provider's API JSON shapes.
- `*_mapper.py` — Bidirectional mapping between DTOs and domain models.

### Step 3: Add configuration

- Add settings class to `config.py` with `env_prefix`.
- Add env vars to `.env.example`.

### Step 4: Register in composition root

```python
provider = NewProvider(config)
entry = ChannelEntry(
    resolver=DefaultProviderResolver(providers=[provider]),
    providers=[provider],
)
registry.register_channel(
    CommunicationChannel(type=CommunicationChannelType.WHATSAPP),
    entry,
)
```

### What does NOT need to change

| Layer | Reason |
|-------|--------|
| Domain models | Provider-agnostic by design |
| Application services | Work against `CommunicationProvider` interface |
| REST API | Endpoints are channel-based, not provider-based |
| GraphQL schema | Queries iterate over registry dynamically |
| Tests | Mock `CommunicationProvider` — no provider-specific fixtures |
| Migrations | Provider config is stored as JSON — no schema change |

## Provider registry structure

The registry is organized by communication channel, not by provider:

```
WHATSAPP channel
    ├── ProviderResolver (selects provider)
    └── Providers: [EvolutionProvider, WhatsAppCloudProvider, ...]

EMAIL channel
    ├── ProviderResolver (selects provider)
    └── Providers: [SMTPProvider, MailuProvider, ...]
```

This allows multiple providers for the same channel (e.g., Evolution + Cloud API for WhatsApp) and per-tenant resolution without changing the architecture.
