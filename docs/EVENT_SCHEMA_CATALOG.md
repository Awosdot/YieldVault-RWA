# YieldVault-RWA Event Schema Catalog

## Table of Contents

1. [Overview](#overview)
2. [Two Event Families — Don't Mix Them Up](#two-event-families--dont-mix-them-up)
3. [Webhook Delivery Envelope](#webhook-delivery-envelope)
4. [Event Catalog](#event-catalog)
   - [`transaction.deposit.created`](#transactiondepositcreated)
   - [`transaction.withdrawal.created`](#transactionwithdrawalcreated)
5. [HTTP Delivery Contract](#http-delivery-contract)
6. [Endpoint Verification Challenge](#endpoint-verification-challenge)
7. [Dead-Letter Record Schema](#dead-letter-record-schema)
8. [Webhook Management API Schemas](#webhook-management-api-schemas)
9. [Validating Payloads Against These Schemas](#validating-payloads-against-these-schemas)
10. [Versioning](#versioning)

---

## Overview

This catalog is the single, machine-readable reference for every schema a **webhook consumer** will
encounter when integrating with YieldVault-RWA's outbound webhook system: the envelope, each event
type's payload, delivery headers, the endpoint-verification handshake, and the admin registration
API. Every schema below has a corresponding [JSON Schema](https://json-schema.org/) file under
[`docs/schemas/`](./schemas/) that can be used directly for programmatic validation.

The schemas here are generated from, and kept in sync with, the backend's runtime types and Zod
validators — not from prose descriptions:

| Concept | Source of truth |
|---|---|
| Envelope shape, payload fields, event type enum | `backend/src/webhookDelivery.ts` (`WebhookEnvelope`, `TransactionEventPayload`, `TransactionEventType`) |
| Event type allow-list used by the admin API | `backend/src/middleware/validate.ts` (`WEBHOOK_EVENT_TYPES`) |
| Dead-letter record shape | `backend/src/webhookDelivery.ts` (`WebhookDeadLetterRecord`) |

## Two Event Families — Don't Mix Them Up

YieldVault-RWA has two independent ways to observe vault activity, and this catalog covers only
the second one:

1. **On-chain Soroban contract events** (`deposit`, `pndwdraw`, `withdraw`, `feechg`, `mindepchg`) —
   emitted directly by the smart contract and read by polling the Stellar RPC API. These are
   documented in the [Webhook Integration Guide](./WEBHOOK_INTEGRATION.md#event-catalog).
2. **Off-chain webhook deliveries** (`transaction.deposit.created`, `transaction.withdrawal.created`) —
   HTTP POST requests YieldVault's backend sends to endpoints registered via the admin webhook API.
   **This catalog documents these.**

The two are related (a deposit webhook is dispatched after the corresponding on-chain `deposit`
event is observed) but have distinct payload shapes, transports, and reliability guarantees. A
consumer that only registers an HTTP webhook endpoint never sees the on-chain event shapes, and
vice versa.

## Webhook Delivery Envelope

Every webhook delivery body is a single JSON object with this shape:

```json
{
  "schemaVersion": 1,
  "eventType": "transaction.deposit.created",
  "sentAt": "2026-07-27T10:30:00.000Z",
  "payload": {
    "transactionId": "tx_deposit_abc123",
    "amount": "1000000000",
    "asset": "USDC",
    "walletAddress": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
    "transactionHash": "abc123def456",
    "status": "completed",
    "timestamp": "2026-07-27T10:29:55.000Z"
  }
}
```

JSON Schema: [`schemas/webhook-envelope.schema.json`](./schemas/webhook-envelope.schema.json)

| Field | Type | Description |
|---|---|---|
| `schemaVersion` | `integer` | Monotonically increasing integer for the envelope shape. Bump only on breaking changes. Current value: `1`. |
| `eventType` | `string` (enum) | One of the event types in the [Event Catalog](#event-catalog) below. |
| `sentAt` | `string` (ISO 8601) | When this delivery attempt was dispatched. |
| `payload` | `object` | Event-specific data. Currently identical in shape for both event types — see below. |

> **Note:** `schemaVersion` is a plain integer counter, not a semantic-version string. Do not
> parse it as `MAJOR.MINOR.PATCH` — compare it with `>=`/`<` against the version your integration
> was written for. See [Versioning](#versioning) for how this relates to the SemVer-based schema
> evolution policy in [`WEBHOOK_PAYLOAD_EVOLUTION.md`](./WEBHOOK_PAYLOAD_EVOLUTION.md).

## Event Catalog

Both current event types share the same payload shape (`TransactionEventPayload`).

JSON Schema: [`schemas/transaction-event-payload.schema.json`](./schemas/transaction-event-payload.schema.json)

| Field | Type | Required | Description |
|---|---|---|---|
| `transactionId` | `string` | yes | Unique identifier for the transaction record. |
| `amount` | `string` | yes | Amount in the asset's smallest unit (stroops; `10^6` = 1 USDC), encoded as a decimal string to avoid precision loss. |
| `asset` | `string` | yes | Asset code, e.g. `"USDC"`. |
| `walletAddress` | `string` | yes | Stellar account address (`G...`) of the depositor/withdrawer. |
| `transactionHash` | `string` | yes | Hash of the on-chain Stellar transaction that triggered this event. |
| `status` | `string` | yes | Current transaction status (e.g. `"pending"`, `"completed"`). |
| `timestamp` | `string` (ISO 8601) | yes | When the transaction was recorded. |

### `transaction.deposit.created`

Dispatched to every enabled, verified endpoint subscribed to this event type after a user deposit
is recorded.

```json
{
  "schemaVersion": 1,
  "eventType": "transaction.deposit.created",
  "sentAt": "2026-07-27T10:30:00.000Z",
  "payload": {
    "transactionId": "tx_deposit_abc123",
    "amount": "1000000000",
    "asset": "USDC",
    "walletAddress": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
    "transactionHash": "abc123def456",
    "status": "completed",
    "timestamp": "2026-07-27T10:29:55.000Z"
  }
}
```

### `transaction.withdrawal.created`

Dispatched to every enabled, verified endpoint subscribed to this event type after a withdrawal is
initiated or completed.

```json
{
  "schemaVersion": 1,
  "eventType": "transaction.withdrawal.created",
  "sentAt": "2026-07-27T10:30:00.000Z",
  "payload": {
    "transactionId": "tx_withdraw_xyz789",
    "amount": "950000000",
    "asset": "USDC",
    "walletAddress": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
    "transactionHash": "xyz789abc123",
    "status": "completed",
    "timestamp": "2026-07-27T10:29:58.000Z"
  }
}
```

## HTTP Delivery Contract

Every delivery is a `POST` request with `Content-Type: application/json` and the envelope above as
the raw request body. These headers accompany every attempt:

| Header | Always present | Description |
|---|---|---|
| `Content-Type` | yes | Always `application/json`. |
| `User-Agent` | yes | `YieldVault-Webhook-Delivery/1.0`. |
| `X-YieldVault-Event` | yes | Same value as `payload.eventType` in the body — usable for routing before parsing the body. |
| `X-YieldVault-Delivery-Id` | yes | Unique ID for this delivery *attempt* (changes on each retry of the same logical event). |
| `X-Correlation-ID` | when available | Correlation ID propagated from the request that produced this event, for cross-service tracing. |
| `X-Request-ID` | when available | Request ID propagated the same way. |
| `X-YieldVault-Signature` | only if the endpoint has a `secret` configured | `HMAC-SHA256` hex digest of the exact raw request body, keyed with the endpoint's shared secret. See [Webhook Signature Verification](../backend/docs/WEBHOOK_SIGNATURES.md) for the verification algorithm. |

On a non-2xx response or a timeout, YieldVault retries with exponential backoff and jitter
(`calculateBackoffDelay` in `backend/src/webhookDelivery.ts`), up to `WEBHOOK_MAX_ATTEMPTS`
(default 3) attempts, before moving the delivery to the [dead-letter](#dead-letter-record-schema)
store.

## Endpoint Verification Challenge

Before an endpoint receives real events, YieldVault probes it with a one-time verification
request to confirm the URL is reachable and controlled by the registrant.

JSON Schema: [`schemas/webhook-verification-challenge.schema.json`](./schemas/webhook-verification-challenge.schema.json)

Request sent to the registered `url`:

```http
POST <endpoint url> HTTP/1.1
Content-Type: application/json
X-YieldVault-Challenge: <challenge token>

{"type": "webhook.verification", "challenge": "<challenge token>"}
```

To pass verification, the consumer's response must echo the same `challenge` value back, either
as the `X-YieldVault-Challenge` response header or as `{"challenge": "<challenge token>"}` in the
response body. The endpoint's `verificationStatus` becomes `"verified"` on a match, or `"failed"`
if the challenge is not echoed correctly or expires (`WEBHOOK_CHALLENGE_TTL_SECONDS`, default 900s)
before a response arrives. Real event deliveries are only dispatched to `"verified"` endpoints
(unless `WEBHOOK_ALLOW_UNVERIFIED=true`, which is only intended for local/test environments).

## Dead-Letter Record Schema

Deliveries that exhaust all retry attempts are recorded for inspection and manual replay via the
admin dead-letter API.

JSON Schema: [`schemas/webhook-dead-letter-record.schema.json`](./schemas/webhook-dead-letter-record.schema.json)

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Dead-letter record ID. |
| `endpointId` | `string` | The webhook endpoint this delivery was destined for. |
| `endpointUrl` | `string` | The URL that was targeted. |
| `eventType` | `string` (enum) | Same enum as the [Event Catalog](#event-catalog). |
| `payload` | `object` | The original event payload (`TransactionEventPayload`). |
| `attempts` | `integer` | Number of delivery attempts made before dead-lettering. |
| `lastError` | `string` | Error message from the final attempt, if any. |
| `originalDeliveryId` | `string` | The delivery ID of the last attempt. |
| `status` | `string` (enum) | `"dead-letter"`, `"requeued"`, or `"delivered"`. |
| `createdAt` / `updatedAt` / `retriedAt` | `string` (ISO 8601) | Timestamps. |

## Webhook Management API Schemas

Registering and updating webhook endpoints is done through the admin API, validated by the same
Zod schemas that define `WEBHOOK_EVENT_TYPES` used throughout this catalog.

- `POST /admin/webhooks` — JSON Schema: [`schemas/webhook-register-request.schema.json`](./schemas/webhook-register-request.schema.json)
- `PATCH /admin/webhooks/:id` — same fields as registration, all optional, at least one required.

| Field | Type | Notes |
|---|---|---|
| `url` | `string` | Required on registration. Must be a valid `http://` or `https://` URL, ≤2048 chars. |
| `eventTypes` | `array<string>` | Subset of the [event type enum](#event-catalog). Defaults to all known types if omitted. |
| `enabled` | `boolean` | Optional. |
| `secret` | `string` | Optional, 8–256 chars. Used to sign deliveries — see [HTTP Delivery Contract](#http-delivery-contract). |

## Validating Payloads Against These Schemas

The JSON Schema files in [`docs/schemas/`](./schemas/) are self-contained and reference each other
by relative `$ref`. Example using [`ajv`](https://ajv.js.org/):

```ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import envelopeSchema from './docs/schemas/webhook-envelope.schema.json';
import eventTypeSchema from './docs/schemas/transaction-event-type.schema.json';
import payloadSchema from './docs/schemas/transaction-event-payload.schema.json';

const ajv = new Ajv({ schemas: [envelopeSchema, eventTypeSchema, payloadSchema] });
addFormats(ajv);

const validate = ajv.getSchema(envelopeSchema.$id)!;
const ok = validate(receivedWebhookBody);
if (!ok) {
  console.error(validate.errors);
}
```

## Versioning

This catalog describes the **current, implemented** envelope and payload shapes (`schemaVersion: 1`).
For the policy governing how these schemas are allowed to change over time — backward
compatibility guarantees, deprecation timelines, and the consumer migration guide for future major
versions — see [`WEBHOOK_PAYLOAD_EVOLUTION.md`](./WEBHOOK_PAYLOAD_EVOLUTION.md). If the two ever
disagree on the current shape, this catalog and the JSON Schema files under `docs/schemas/` are
authoritative, since they are the ones expected to be updated alongside `backend/src/webhookDelivery.ts`.

## Additional Resources

- [Webhook Integration Guide](./WEBHOOK_INTEGRATION.md) — on-chain Soroban event catalog and consumer setup
- [Webhook Payload Evolution Guide](./WEBHOOK_PAYLOAD_EVOLUTION.md) — schema change policy
- [Webhook Signature Verification](../backend/docs/WEBHOOK_SIGNATURES.md)
- [Example TypeScript consumer](./examples/webhook_consumer.ts)
- [Example Python consumer](./examples/webhook_consumer.py)
