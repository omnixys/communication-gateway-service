# ADR 003 — Chat Service Boundary

**Status:** Accepted  
**Date:** 2026-07-07

## Context

The Chat Service previously contained placeholder adapters for WhatsApp, Email, SMS. These needed to be wired to real providers. The Communication Gateway is the new integration layer. The boundary between the two services must be clearly defined.

## Decision

The Chat Service and Communication Gateway communicate through a well-defined REST API and shared event contract.

### Outbound flow

```
ChatService Adapter
    │  POST /api/v1/messages/send { channel, to, body, ... }
    ▼
Communication Gateway
    │  ProviderResolver → CommunicationProvider → External API
    ▼
ProviderResponse { success, provider_message_id, status }
```

The Chat Service never knows which concrete provider delivered the message. It specifies only the `channel` (WHATSAPP, EMAIL, SMS). Provider selection is internal to the Gateway.

### Inbound flow

```
External API (WhatsApp, Email, etc.)
    │  Webhook POST /api/v1/webhooks/{provider_type}
    ▼
Communication Gateway
    │  verify → parse → normalize → publish event
    ▼
OutboundEventPublisher (InMemory → Kafka later)
    │
    └── Chat Service consumes event
```

### Contract rules

1. **Chat Service uses generic `ChannelAdapter` interface.** The adapter calls the Gateway's REST API. No Gateway code lives in Chat Service.
2. **Gateway returns generic `ProviderResponse`.** Provider-specific fields (e.g., Evolution message ID) travel inside `provider_message_id` only.
3. **No shared domain models.** Each service has its own copy of transport-agnostic types (`OutboundMessage`, `InboundMessage`). No shared package.
4. **Event contract is versioned.** The `InboundMessage` structure is the contract between Gateway and consumers. Breaking changes require a new event version.

## Consequences

- Chat Service's adapters become thin HTTP clients — easy to test and maintain.
- Gateway can evolve independently (add providers, change retry logic) without Chat Service changes.
- A future event bus (Kafka) will decouple the services further and enable buffering/replay.
