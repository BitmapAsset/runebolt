# RuneBolt v0.1.0

**Non-custodial instant Bitcoin asset transfers over Lightning Network**

RuneBolt is the first implementation of the Lightning Deed Protocol (LDP). It enables trustless, millisecond-speed transfers of Runes, Ordinals, Bitmap inscriptions, and BRC-20 tokens without moving assets through custodial bridges.

Built by [Block Genomics](https://blockgenomics.io).

---

## How It Works

1. **Sender deed-locks** their asset using a Tapscript that requires a SHA-256 preimage
2. **Lightning invoice** is created with the same payment hash
3. **Recipient pays** the Lightning invoice — receives the preimage
4. **Preimage unlocks** the deed-locked asset on-chain

Either both sides complete or neither does. Assets never leave Bitcoin L1.

## Supported Assets

| Asset | Type | Example |
|-------|------|---------|
| **Runes** | Fungible tokens | DOG, UNCOMMON-GOODS |
| **Ordinals** | Bitcoin NFTs | Any inscription |
| **Bitmap** | Block ownership | Metaverse parcels |
| **BRC-20** | Inscription tokens | ORDI, SATS |

## Quick Start

### Prerequisites

- Node.js 20+
- Lightning node (Voltage LND recommended)
- Bitcoin wallet (UniSat, Xverse, Leather, or OKX)

### Backend Setup

```bash
git clone https://github.com/block-genomics/runebolt.git
cd runebolt
npm install
cp .env.example .env
# Edit .env with your LND credentials
npm run build
node src/server.js
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API URL
npm run dev     # development
npm run build   # static export to dist/
```

### Docker Deployment

```bash
cp .env.example .env
# Edit .env with production credentials
docker compose up -d
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)             │
│  Landing Page │ Asset Pages │ Wallet Connect │ 3D UI │
└──────────────────────┬──────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────────┐
│                  RuneBolt API (Express 5)            │
│  Health │ Indexer │ Lightning │ HTLC Bridge │ Swaps  │
└───────┬──────────────┬──────────────────────────────┘
        │              │
┌───────▼───────┐ ┌────▼─────────────┐
│  Unisat API   │ │  Voltage LND     │
│  (Indexing)   │ │  (Lightning)     │
└───────────────┘ └──────────────────┘
```

### Backend (`src/`)

| Module | Purpose |
|--------|---------|
| `server.js` | Express REST API (26 endpoints) |
| `indexer.ts` | Unisat API integration for Runes/Ordinals balances |
| `wallet/psbt.ts` | HTLC PSBT construction (lock, claim, refund) |
| `bridge.js` | Relay transfer model and fee calculation |
| `lightning.ts` | Lightning invoice and payment operations |
| `security/` | Rate limiting, input validation, audit logging |
| `core/` | RuneBolt orchestrator |

### Frontend (`frontend/`)

| Module | Purpose |
|--------|---------|
| `app/page.tsx` | Landing page with hero, features, asset showcase |
| `app/components/` | Visual effects (lightning, particles, glitch, 3D cards) |
| `lib/wallets.ts` | Wallet connection (UniSat, Xverse, Leather, OKX) |
| `lib/api.ts` | Type-safe API client with retry logic |

### Themed Asset Pages

| Page | Asset | Theme |
|------|-------|-------|
| `/bdc.html` | Billy (Billion Dollar Cat) | Cyan neon, cat animations |
| `/dog.html` | DOG (Doggotothemoon) | Gold/orange, moon pulse |
| `/bitmap.html` | Bitmap | Bitcoin orange, block grid |
| `/brc20.html` | BRC-20 tokens | Multi-color, inscription glow |

Each page includes a 6-step transfer wizard, real-time balances, fee calculator, QR codes, and wallet connection.

## API Reference

### Health & Status
```
GET  /api/health                      → { status: "ok" }
GET  /api/status                      → Full bridge + node status
GET  /api/lightning/info              → Node alias, pubkey, channels
```

### Runes Indexer
```
GET  /api/runes/:address/balances     → Real Runes/Ordinals balances (Unisat)
     ?network=testnet|mainnet
GET  /api/runes/:address/verify       → Verify asset ownership
     ?assetType=rune&assetId=DOG
POST /api/runes/:address/clear-cache  → Clear cached balances
```

### Lightning
```
POST /api/lightning/invoice           → Create Lightning invoice
POST /api/lightning/pay               → Pay Lightning invoice
GET  /api/lightning/decode/:payreq    → Decode invoice details
GET  /api/lightning/invoice/:hash     → Check invoice payment status
```

### HTLC Bridge (Lightning Deed Protocol)
```
POST /api/bridge/htlc/create          → Create HTLC address (P2WSH)
POST /api/bridge/build-lock-tx        → Build lock PSBT for wallet signing
POST /api/bridge/build-claim-tx       → Build claim PSBT (requires preimage)
POST /api/bridge/build-refund-tx      → Build refund PSBT (after timeout)
GET  /api/bridge/swap/:swapId         → Get swap status
POST /api/bridge/swap/:swapId/status  → Update swap status
```

### Legacy Bridge (Relay Model)
```
GET  /api/bridge/assets               → List supported assets
POST /api/bridge/fee                  → Calculate transfer fee
POST /api/bridge/transfer             → Initiate relay transfer
GET  /api/bridge/transfer/:id         → Check transfer status
GET  /api/bridge/transfers            → List all transfers
GET  /api/bridge/inventory            → Get bridge inventory
```

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VOLTAGE_REST_URL` | Yes | Voltage LND REST endpoint |
| `VOLTAGE_MACAROON` | Yes | Admin macaroon (hex-encoded) |
| `NODE_PUBKEY` | Yes | Lightning node public key |
| `NODE_ALIAS` | Yes | Lightning node alias |
| `NETWORK` | Yes | `mainnet` or `testnet` |
| `RUNEBOLT_PORT` | No | API port (default: `3141`) |
| `RUNEBOLT_FEE_RATE` | No | Fee rate (default: `0.003` / 0.3%) |
| `UNISAT_API_KEY` | No | Unisat Open API key |
| `CORS_ORIGINS` | No | Allowed CORS origins (comma-separated) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_RUNEBOLT_API_URL` | Yes | Backend API URL |
| `NEXT_PUBLIC_NETWORK` | Yes | `testnet` or `mainnet` |

## Tech Stack

**Backend**: Node.js 20, Express 5, TypeScript, bitcoinjs-lib, Zod, Pino
**Frontend**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Radix UI
**Lightning**: Voltage LND (REST API)
**Indexing**: Unisat Open API
**Deployment**: Docker, Docker Compose, Vercel (frontend)

## Documentation

- [Lightning Deed Protocol Whitepaper](docs/LDP-WHITEPAPER.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Security & Threat Model](docs/SECURITY.md)
- [Launch Checklist](LAUNCH-CHECKLIST.md)
- [Changelog](CHANGELOG.md)

## Security

RuneBolt is non-custodial by design. Assets stay on Bitcoin L1; only cryptographic rights travel through Lightning.

See [SECURITY.md](docs/SECURITY.md) for the full threat model, input validation details, and responsible disclosure policy.

**Report vulnerabilities**: security@blockgenomics.io

## License

MIT

---

*Built with lightning by [Block Genomics](https://blockgenomics.io)*
