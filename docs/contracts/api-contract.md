# Communication Gateway V1 contract

V1 supports only Resend email and Evolution API WhatsApp text messages. Internal
endpoints require `x-internal-api-key`. Evolution webhooks require the configured
Evolution API key or a valid HMAC signature.

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
  "metadata": {
    "conversationId": "optional-conversation-id"
  }
}
```

`channel` is `EMAIL` or `WHATSAPP`. WhatsApp accepts `TEXT` only. `subject` is
required for email. New clients must send `recipientAddress`; `recipientId` is
accepted only as a compatibility field and is resolved through the configured
address mapping.

Successful responses include `providerMessageId`, normalized status and provider
identity. Validation errors return `422`, missing or wrong internal credentials
return `401`, provider failures return `502`, and provider timeouts return `504`.

## Evolution webhooks

`POST /api/v1/webhooks/EVOLUTION`

Inbound messages and delivery receipts are idempotent by provider message ID.
Mappings between provider IDs, internal IDs and conversation IDs are persisted.
Inbound messages are forwarded to Chat; delivery events are forwarded to Chat
and the configured event publisher.

Unknown providers return `422`. Missing or invalid webhook credentials return
`401`.

## Operational endpoints

- `GET /health/live` checks only that the process is alive.
- `GET /health/ready` checks database connectivity, required provider config and
  initialized forwarding infrastructure.
- `/api/v1/providers` and provider health endpoints require the internal API key.

## V1 limits

There are no attachments, media messages, SMS, push notifications, SMTP fallback
or automatic channel fallback in V1.
