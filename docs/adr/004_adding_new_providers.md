# ADR 004 — Adding New Providers

**Status:** Accepted  
**Date:** 2026-07-07  
**Updated:** 2026-09-30 (NestJS migration, `3.0.0`)

## Context

The Gateway must support adding new communication providers without modifying existing code. Providers differ in authentication, API structure, capabilities, and webhook format.

## Decision

Adding a new provider requires exactly 4 steps, and no changes outside the infrastructure layer.

### Step 1: Implement `CommunicationProvider`

Create a folder under `src/infrastructure/providers/<name>/` with a class that implements the port:

```ts
export class NewProvider implements CommunicationProvider {
  public readonly providerType = CommunicationProviderType.NEW_PROVIDER;

  get metadata(): ProviderMetadata { /* ... */ }

  async send(message: OutboundMessage): Promise<ProviderResponse> { /* ... */ }
  async health(): Promise<boolean> { /* ... */ }
  async capabilities(): Promise<ChannelCapabilities> { /* ... */ }
  async verifyWebhook(
    headers: Readonly<Record<string, string>>,
    body: Buffer,
  ): Promise<boolean> { /* ... */ }
  async handleWebhook(
    headers: Readonly<Record<string, string>>,
    body: Buffer,
  ): Promise<WebhookResult> { /* ... */ }
}
```

The port itself lives in
`src/application/ports/communication-provider.port.ts`. `handleWebhook` returns a
discriminated `WebhookResult` (`inboundMessage`, `deliveryReceipt`, `ignored`) so
the application layer stays provider agnostic.

Use `requestJson` and `probeHttp` from `src/shared/http-client.ts` for outbound
calls instead of a new HTTP dependency, and `getLogger('<Class>', 'class')` from
`@omnixys/logger-ts`.

### Step 2: Create DTOs + Mapper

- `<name>.mapper.ts` — bidirectional mapping between the provider's JSON shapes
  and the domain models in `src/domain/models`.
- Keep the provider's wire format out of the domain layer; a mapper is the only
  place that knows both shapes.

### Step 3: Add configuration

- Add the config block to `src/config/configuration.ts` and its type to
  `src/config/config.types.ts`.
- Add the env vars to `.env.example`, including whether an empty value disables
  the provider.
- Mask the value in the redaction map at the bottom of `configuration.ts`.

### Step 4: Register in composition root

`src/infrastructure/providers/provider-registry.factory.ts` builds the channel
registry that `src/app.module.ts` injects under `CHANNEL_PROVIDER_REGISTRY`.
Registration happens there and is conditional: a provider without credentials
must not appear in `GET /api/v1/providers`. `ProviderLifecycle` in
`provider-lifecycle.service.ts` only owns start and stop.

```ts
// provider-registry.factory.ts
registerChannel(
  registry,
  CommunicationChannelType.WHATSAPP,
  [new EvolutionProvider(config.evolution)],
  [], // fallbacks
);
```

The local `registerChannel` helper builds the `ChannelEntry` with a
`DefaultProviderResolver` and delegates to
`InMemoryChannelProviderRegistry.registerChannel`, which throws when a channel
is registered twice. A second provider for the same channel therefore goes
into the `fallbacks` list, not into a second `registerChannel` call.

Whether a provider is listed at all is decided here, not in the controller:
`EMAIL_PRIMARY=none` registers no email adapter, which is what keeps
`GET /api/v1/providers` free of unconfigured entries.

### What does NOT need to change

| Layer | Reason |
|-------|--------|
| Domain models | Provider-agnostic by design |
| Application services | Work against the `CommunicationProvider` port |
| REST API | Endpoints are channel-based, not provider-based |
| GraphQL schema | Queries iterate over the registry dynamically |
| Tests | Fakes implement `CommunicationProvider` — no provider-specific fixtures |
| Migrations | Provider config is stored as JSON — no schema change |

## Tests are part of the step

A new provider ships with a unit suite in `__tests__/unit/` that covers the send
mapping, the health probe, both webhook verification paths and the capability
set, plus an integration case proving the provider appears in
`GET /api/v1/providers` only when it is configured.

## Provider registry structure

The registry is organized by communication channel, not by provider:

```
WHATSAPP channel
    └── providers: [EvolutionProvider]

EMAIL channel
    └── providers: [ResendProvider, StalwartProvider]
```

This allows multiple providers for the same channel — Resend and Stalwart both
serve `EMAIL` — and per-tenant resolution without changing the architecture.
`EMAIL_PRIMARY` and `EMAIL_FALLBACK` order the chain.
