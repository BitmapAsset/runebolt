# ⚡ RuneBolt — Bitcoin Asset Transport over Lightning

**The world's first Rune/Bitmap/BRC-20 transport layer using Lightning Network.**

RuneBolt enables near-instant transfer of Bitcoin-native assets (Runes, Bitmaps, BRC-20 tokens) using Lightning Network for coordination, bypassing slow and expensive on-chain transactions.

## Supported Assets

| Asset Type | Examples | Transfer Method |
|-----------|----------|----------------|
| **Runes** | $DOG, UNCOMMON•GOODS | OP_RETURN Runestone |
| **Bitmap** | 720143.bitmap, 718840.bitmap | Ordinal inscription transfer |
| **BRC-20** | ordi, sats, rats | Inscription-based transfer |

## How It Works (Relay Model)

```
Sender has $DOG on-chain (slow, 10+ min, $2+ fees)
        ↓
RuneBolt creates Lightning invoice (coordination fee)
        ↓
Sender pays invoice (instant, <1 sat fee)
        ↓
RuneBolt sends $DOG from inventory to receiver (on-chain, batched)
        ↓
Sender sends their $DOG to RuneBolt to replenish inventory
        ↓
Receiver gets $DOG in ~seconds instead of ~minutes
```

Lightning is the **coordination layer** — it proves intent, collects fees, and enables near-instant fulfillment from RuneBolt's inventory.

## Architecture

```
[User Wallet] → [RuneBolt API] → [Voltage LND Node] → [Lightning Network]
                      ↓
              [Asset Inventory]
              (DOG, Bitmap, BRC-20)
                      ↓
              [On-chain Transfer]
              (batched, optimized)
```

**No LNbits needed.** RuneBolt talks directly to the LND node via REST API. Custom bridge logic handles asset-specific transfer mechanics that no general-purpose payment processor supports.

## API Endpoints

### Health & Status
- `GET /api/health` — Service health check
- `GET /api/status` — Full bridge + node status

### Lightning (Direct)
- `POST /api/lightning/invoice` — Create invoice `{amount, memo}`
- `POST /api/lightning/pay` — Pay invoice `{paymentRequest}`
- `GET /api/lightning/decode/:payreq` — Decode invoice
- `GET /api/lightning/info` — Node info

### Bridge (Asset Transfers)
- `GET /api/bridge/assets` — List supported assets
- `POST /api/bridge/fee` — Calculate transfer fee `{assetId, amount}`
- `POST /api/bridge/transfer` — Initiate transfer `{assetType, assetId, amount, senderAddress, receiverAddress, subId?}`
- `GET /api/bridge/transfer/:id` — Check transfer status
- `GET /api/bridge/transfers` — List all transfers
- `GET /api/bridge/inventory` — Current inventory
- `POST /api/bridge/inventory` — Add inventory (admin)

## Quick Start

```bash
npm install
cp .env.example .env  # Fill in your Voltage credentials
node src/server.js
```

## Environment Variables

```env
VOLTAGE_REST_URL=https://your-node.m.voltageapp.io
VOLTAGE_MACAROON=<admin-macaroon-hex>
RUNEBOLT_PORT=3141
RUNEBOLT_FEE_RATE=0.003
```

## Lightning Node

- **Provider:** Voltage Cloud (hosted LND)
- **Version:** LND 0.20.0-beta
- **Network:** Bitcoin mainnet
- **Features:** Anchor channels, MPP, AMP, route blinding, wumbo channels

## Roadmap

- [x] LND direct client (no LNbits dependency)
- [x] Asset registry (Runes, Bitmap, BRC-20)
- [x] Bridge relay logic with Lightning coordination
- [x] REST API server
- [ ] API key authentication
- [ ] On-chain Rune transfer (Runestone encoding)
- [ ] On-chain Bitmap transfer (Ordinal protocol)
- [ ] On-chain BRC-20 transfer (inscription + send)
- [ ] Persistent storage (PostgreSQL)
- [ ] Transfer batching (reduce on-chain fees)
- [ ] Production deployment
- [ ] Community liquidity providers (deposit assets, earn fees)

## Part of Block Genomics

RuneBolt is the transport layer for the [Block Genomics](https://blockgenomics.io) ecosystem — enabling verified AI agents to transact with Bitcoin-native assets over Lightning.

## License

BSL 1.1 — See Block Genomics license terms.
