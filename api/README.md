# RuneBolt API Documentation

**Base URL:** `http://64.23.226.113:3141`

## Rate Limits

| Tier | Window | Max Requests |
|------|--------|-------------|
| General API | 15 min | 100 |
| Lightning | 1 min | 20 |
| HTLC | 1 min | 10 |

Rate limit headers (`RateLimit-*`) are included in all responses.

---

## Health & Status

### `GET /api/health`
Health check.

**Response:**
```json
{ "status": "ok", "service": "runebolt", "timestamp": "2025-01-01T00:00:00.000Z" }
```

### `GET /api/status`
Full bridge status including node info, wallet balance, channels, and supported assets.

---

## Runes Indexer

### `GET /api/runes/:address/balances`
Get Runes, Ordinals, and Bitmap balances for a Bitcoin address.

| Param | Type | Description |
|-------|------|-------------|
| `address` | path | Bitcoin address (`bc1`, `tb1`, `bcrt1`) |
| `network` | query | `mainnet` (default) or `testnet` |

**Response:**
```json
{
  "runes": [{ "id": "...", "name": "DOG", "symbol": "D", "amount": "1000", "decimals": 8 }],
  "ordinals": [{ "id": "...", "inscriptionNumber": 123, "contentType": "image/png" }],
  "bitmaps": [{ "blockNumber": 840000, "inscriptionId": "..." }]
}
```

### `GET /api/runes/:address/verify`
Verify asset ownership.

| Param | Type | Description |
|-------|------|-------------|
| `address` | path | Bitcoin address |
| `assetType` | query | `rune`, `ordinal`, or `bitmap` |
| `assetId` | query | Asset identifier |
| `amount` | query | Minimum amount (default: 1) |
| `network` | query | `mainnet` or `testnet` |

### `POST /api/runes/:address/clear-cache`
Clear cached balances for an address (call after transactions).

---

## Lightning

### `POST /api/lightning/invoice`
Create a Lightning invoice.

**Body:**
```json
{ "amount": 1000, "memo": "RuneBolt payment", "expiry": 3600 }
```

**Response:**
```json
{
  "paymentRequest": "lnbc...",
  "paymentHash": "abc123...",
  "expiresAt": "2025-01-01T01:00:00.000Z"
}
```

### `POST /api/lightning/pay`
Pay a Lightning invoice.

**Body:**
```json
{ "paymentRequest": "lnbc...", "feeLimit": 100 }
```

### `GET /api/lightning/decode/:payreq`
Decode a Lightning invoice to inspect details before paying.

### `GET /api/lightning/invoice/:paymentHash`
Check invoice settlement status.

**Response:**
```json
{
  "settled": true,
  "state": "SETTLED",
  "amount": "1000",
  "memo": "RuneBolt payment",
  "paymentHash": "abc123..."
}
```

### `GET /api/lightning/info`
Get LND node info.

**Response:**
```json
{
  "alias": "RuneBolt",
  "pubkey": "02abc...",
  "channels": 5,
  "peers": 12,
  "blockHeight": 840000,
  "synced": true
}
```

---

## HTLC Bridge

### `POST /api/bridge/htlc/create`
Create an HTLC lock address for atomic swaps.

**Body:**
```json
{
  "senderPubkey": "02abc...",
  "recipientPubkey": "03def...",
  "timeoutBlockHeight": 840100,
  "network": "testnet",
  "assetId": "DOG"
}
```

**Response:**
```json
{
  "swapId": "abc123...",
  "htlcAddress": "tb1q...",
  "redeemScript": "63a820...",
  "paymentHash": "abc123...",
  "timeoutBlockHeight": 840100,
  "network": "testnet"
}
```

### `POST /api/bridge/build-lock-tx`
Build a PSBT to fund an HTLC.

**Body:**
```json
{
  "senderAddress": "tb1q...",
  "htlcAddress": "tb1q...",
  "assetAmount": 10000,
  "fundingUTXOs": [{ "txid": "...", "vout": 0, "value": 50000 }],
  "changeAddress": "tb1q...",
  "feeRate": 2,
  "network": "testnet"
}
```

### `POST /api/bridge/build-claim-tx`
Build a PSBT to claim an HTLC with preimage.

**Body:**
```json
{
  "htlcUTXO": { "txid": "...", "vout": 0, "value": 10000 },
  "redeemScript": "63a820...",
  "preimage": "deadbeef...",
  "recipientAddress": "tb1q...",
  "feeRate": 2,
  "network": "testnet"
}
```

### `POST /api/bridge/build-refund-tx`
Build a refund PSBT (spendable after timeout).

### `GET /api/bridge/swap/:swapId`
Get swap status by ID.

### `POST /api/bridge/swap/:swapId/status`
Update swap status.

**Body:**
```json
{ "status": "locked", "txid": "abc123..." }
```

---

## Bridge (Legacy)

### `GET /api/bridge/assets`
List supported assets. Optional `?type=rune|bitmap|brc20` filter.

### `POST /api/bridge/fee`
Calculate transfer fee.

**Body:**
```json
{ "assetId": "DOG", "amount": 1000 }
```

### `POST /api/bridge/transfer`
Initiate an asset transfer.

**Body:**
```json
{
  "assetType": "rune",
  "assetId": "DOG",
  "amount": 1000,
  "senderAddress": "bc1q...",
  "receiverAddress": "bc1q..."
}
```

### `GET /api/bridge/transfer/:id`
Check transfer status.

### `GET /api/bridge/transfers`
List all transfers. Optional `?status=pending|completed|failed` filter.

### `GET /api/bridge/inventory`
Get bridge asset inventory.

### `POST /api/bridge/inventory`
Add inventory (admin).

**Body:**
```json
{ "runeId": "DOG", "amount": 10000 }
```

---

## Error Responses

All errors follow this format:
```json
{ "error": "Error message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / missing parameters |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
