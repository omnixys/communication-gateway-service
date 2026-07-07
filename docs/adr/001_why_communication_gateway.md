# ADR 001 — Why a Communication Gateway

**Status:** Accepted  
**Date:** 2026-07-07

## Context

The Chat Service and Notification Service both need to send messages through external communication providers (WhatsApp, Email, SMS, Push). Previously this logic lived inside the Chat Service's adapter layer. Managing provider authentication, webhooks, retries, and provider-specific logic across multiple services creates duplication and security risks.

## Decision

Extract all provider integration logic into a dedicated Communication Gateway microservice.

### Responsibilities

| Owned by Gateway | Owned by Chat/Notification Service |
|-----------------|-----------------------------------|
| Provider authentication | Conversations |
| Provider configuration | Messages (as business aggregates) |
| Provider health | Users |
| Outbound delivery | Permissions |
| Inbound webhooks | Business rules |
| Delivery receipts | Routing policies |
| Retry logic | Channel selection |
| Provider-specific IDs | Attachment metadata |
| Capability detection | — |

### Benefits

- **Single responsibility.** Each provider is integrated once and reused by all internal services.
- **Security isolation.** API keys, tokens, and secrets live only in the Gateway.
- **Independent scaling.** Provider-heavy workloads don't affect chat or notification throughput.
- **Provider abstraction.** Internal services send normalized `OutboundMessage` and receive normalized `ProviderResponse`. Adding or replacing a provider requires zero changes outside the Gateway.
- **Webhook normalization.** All inbound webhooks are parsed, verified, and normalized into `InboundMessage` events, then published for consumption.

## Consequences

- The Gateway becomes a critical path for all outbound communication — must be highly available.
- Adding latency for each outbound message (one HTTP hop from Chat Service → Gateway → Provider).
- Provider outages are isolated to the Gateway rather than affecting the Chat Service.
