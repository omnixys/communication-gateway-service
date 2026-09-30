# Communication Gateway V1 contract

The gateway is a NestJS 11 service. It owns the `EMAIL` and `WHATSAPP`
channels, exposes a REST surface under `/api/v1`, an operational surface under
`/health`, provider webhooks under `/webhooks` and an Apollo Federation v2
subgraph on `/graphql`.

Only Evolution (WhatsApp), Resend (email) and Stalwart (SMTP fallback) ship in
V1. The provider placeholders of the former Python runtime — Twilio, Mailu,
Firebase, WhatsApp Cloud API, Signal and Telegram — are not registered.

## Authentication

Internal endpoints require the header `x-internal-api-key` with the value of
`INTERNAL_API_KEY`. The check is fail-closed:

| Situation | Response |
| --- | --- |
| No `INTERNAL_API_KEY` configured | `503 INTERNAL_API_KEY_NOT_CONFIGURED` |
| Header missing or wrong | `401 INVALID_INTERNAL_API_KEY` |
| Production key shorter than 16 characters | the process refuses to start |

Public routes are exactly the liveness probes and the webhook endpoint. The
GraphQL endpoint is protected like every other internal route.

Errors use one envelope:

```json
{
  "statusCode": 422,
  "message": "UNKNOWN_PROVIDER",
  "error": "Unprocessable Entity",
  "correlationId": "3f6a1c2e-0f1a-4a1e-9c3f-9a1b2c3d4e5f"
}
```

The envelope never carries an internal class name.

## Send a message

`POST /api/v1/messages/send`

```json
{
  "id": "notification-or-chat-message-id",
  "channel": "EMAIL",
  "recipientAddress": "person@example.com",
  "body": "<p>Hello</p>",
  "contentType": "HTML",
  "subject": "Hello",
  "senderAddress": "Omnixys <no-reply@omnixys.com>",
  "senderId": "0192f0c4-1f2a-7c3d-8b1e-5a6b7c8d9e0f",
  "metadata": {
    "conversationId": "optional-conversation-id"
  }
}
```

`channel` is `EMAIL` or `WHATSAPP`. WhatsApp accepts `TEXT` only. `subject` is
required for email. New clients must send `recipientAddress`; `recipientId` is
accepted only as a compatibility field and is resolved through
`ADDRESS_MAPPINGS`. `senderId`, when present, must be a UUIDv7. Unknown fields
are rejected rather than ignored.

The response carries the normalized status, the provider message id and the
provider identity:

```json
{
  "success": true,
  "providerMessageId": "3EAAAA0A5-...",
  "status": "SENT",
  "error": null,
  "providerIdentity": {
    "name": "evolution",
    "providerType": "EVOLUTION",
    "version": "v1",
    "instance": "omnixys",
    "apiVersion": "v1"
  }
}
```

Status codes: `422` for a validation failure, an address resolution failure or
an unknown channel, `502 DELIVERY_FAILED` for a provider failure, `504` for a
provider timeout, `409 INVALID_STATUS_TRANSITION` for a webhook that reports a
status the mapping does not allow, `503 NO_PROVIDER_AVAILABLE` when no provider
can serve the channel, and `401` for bad internal credentials.

## Providers

- `GET /api/v1/providers` returns a bare array. `WHATSAPP` always registers
  Evolution; the `EMAIL` chain is built from `EMAIL_PRIMARY` and
  `EMAIL_FALLBACK`, and `EMAIL_PRIMARY=none` registers no email adapter at all.
- `GET /api/v1/providers/:providerType/health` probes one adapter and answers
  `{status, provider, error?}` with `status` one of `ok`, `unavailable`,
  `unknown`, `not_implemented` or `error`. The name is case-insensitive. A name
  that is not a provider type at all — `TWILIO`, for example — is `400`; a valid
  type that is not registered answers `status: "unknown"`.

Each entry exposes `provider_type`, `enabled`, `name`, `version`, `instance`,
`api_version`, `supports_health` and `supports_webhooks`.

## Evolution webhooks

`POST /webhooks/EVOLUTION`

A webhook is accepted when it presents a configured credential: the Evolution
API key in the `apikey`, `x-api-key` or `apiKey` header or in the body
`apikey` field, a bearer token equal to `EVOLUTION_WEBHOOK_SECRET`, or a valid
HMAC in `x-signature` or `x-evolution-signature`. A payload with no credential
is always rejected. `GET` on the route is `405` and a provider type that this
gateway does not ship is `422 UNKNOWN_PROVIDER`.

Inbound messages and delivery receipts are idempotent per provider message id in
every mapping state, including `PENDING` and `FAILED`. Mappings between provider
ids, internal ids and conversation ids are persisted in `message_mappings`.
Inbound messages are forwarded to Chat; delivery events are forwarded to Chat
and published on the Kafka topic.

## Operational endpoints

- `GET /health`, `GET /health/live` and `GET /health/liveness` are public and
  only prove the process is alive.
- `GET /health/ready` and `GET /health/readiness` check database connectivity,
  required provider configuration and initialized forwarding infrastructure. A
  failing check answers `503` with `status: "not_ready"` and a per-dependency
  breakdown.

## GraphQL subgraph

`POST /graphql` is an Apollo Federation v2 subgraph. The SDL is published for
the gateway BFF through `{ _service { sdl } }`, which is what
`IntrospectAndCompose` in `services/gateway` reads. Apollo Server 5 does not
serve the legacy `GET /_service/sdl` route.

Queries:

| Query | Arguments | Result |
| --- | --- | --- |
| `providers` | none | `[ProviderStatus]` with `provider_type`, `connected`, `health`, `last_error`, `capabilities` |
| `provider` | `provider_type: String!` | one `ProviderStatus`, or `null` for a provider that is not registered |
| `gatewayHealth` | none | `status`, `provider_count`, `healthy_providers` |

Field names and capability values stay snake_case because the gateway BFF
depends on them. Capability values are the `supports_` keys without the prefix,
for example `typing`, `read_receipts` and `delivery_status`.

## Events

Delivery status changes are published to `KAFKA_TOPIC_DELIVERY_STATUS`, default
`gateway.delivery.status`. Accepted statuses are `SENT`, `DELIVERED`, `READ`
and `FAILED`. Producing always uses `acks=-1`; the `KAFKA_ACKS` key is accepted
for compatibility and has no effect. An empty `KAFKA_BROKER` disables the event
bus and keeps the process up with cross-service events dropped.

## V1 limits

There are no attachments, media messages, SMS, push notifications, automatic
channel fallback or template rendering in V1. Email falls back from Resend to
Stalwart through `EMAIL_FALLBACK`; channel fallback is not attempted.
