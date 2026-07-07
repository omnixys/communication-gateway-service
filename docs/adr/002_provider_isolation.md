# ADR 002 — Provider Isolation

**Status:** Accepted  
**Date:** 2026-07-07

## Context

The Gateway supports multiple communication providers (Evolution API, SMTP, Twilio, etc.). Each provider has different authentication, API structure, webhook formats, and capabilities. Provider-specific concerns must not leak into the domain or application layers.

## Decision

Enforce strict isolation using a hexagonal architecture:

```
Domain (provider-agnostic models)
    ↑
Application (ports)
    ↑
Infrastructure (concrete providers)
```

### Rules

1. **Provider DTOs stay in infrastructure.** Each provider has its own DTO classes inside its package. These are never imported by domain, application, or API layers.

2. **Domain models are provider-agnostic.** `OutboundMessage`, `InboundMessage`, `DeliveryReceipt` contain no provider-specific fields. Provider IDs (e.g., `whatsappMessageId`) are stored in `provider_message_id: str | None` — a generic field.

3. **Mappers isolate translation.** Each provider has a mapper that converts between provider DTOs and domain models. The mapper is the only component that knows about both.

4. **The `CommunicationProvider` interface is the only cross-boundary contract.** Application services depend on this port. Infrastructure provides implementations. No application service ever imports a concrete provider class.

### Example: Evolution API

```
infrastructure/providers/evolution/
├── evolution_dto.py       ← Evolution-specific JSON shapes
├── evolution_mapper.py    ← DTO ↔ domain model mapping
├── evolution_config.py    ← Evolution-specific settings
└── evolution_provider.py  ← CommunicationProvider implementation
```

### Adding a new provider

1. Create new package under `infrastructure/providers/<name>/`
2. Implement `CommunicationProvider`
3. Create DTOs + Mapper
4. Add configuration
5. Register in composition root

No domain, application, or API changes required.
