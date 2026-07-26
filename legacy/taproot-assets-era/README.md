# RuneBolt

Instant $DOG (Rune) transfers using off-chain payment channels on Bitcoin.

RuneBolt is a hub-based Rune Channel system. Users open channels with RuneBolt (locking DOG in 2-of-2 Taproot multisig on Bitcoin L1), then transfer DOG instantly off-chain. Think "Lightning Network for Runes."

## Architecture

```
runebolt/
├── backend/     # Node.js + Express + TypeScript API server
├── frontend/    # Next.js 14 + Tailwind CSS web app
└── sdk/         # @runebolt/sdk — npm package for integrations
```

### Backend
- **Channel Manager** — Open/close/state management with 2-of-2 Taproot multisig
- **Rune Ledger** — Off-chain double-entry balance tracking
- **Rune Protocol** — Parse and build Runestones for DOG transfers
- **Bitcoin Integration** — mempool.space API for UTXOs and broadcasting
- **WebSocket** — Real-time balance update notifications
- **Auth** — Bitcoin-native authentication (sign challenge with Taproot key)
- **SQLite** — Persistent storage with better-sqlite3

### Frontend
- Premium dark fintech UI (Phantom wallet meets Bloomberg terminal)
- Landing page, Dashboard, Send/Receive, Channel Management, History, Claim Links
- Unisat wallet integration
- Framer Motion animations throughout

### SDK
- `RuneBoltClient` — Simple API for games and apps
- Methods: `initChannel()`, `sendDOG()`, `getBalance()`, `onTransfer(callback)`
- WebSocket real-time balance subscriptions

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Server starts on `http://localhost:3001`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App starts on `http://localhost:3000`

### SDK

```bash
cd sdk
npm install
npm run build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/challenge` | Generate auth challenge |
| POST | `/api/v1/auth/verify` | Verify signed challenge, get JWT |
| POST | `/api/v1/channel/open` | Initiate channel open |
| POST | `/api/v1/channel/activate` | Submit signed funding PSBT |
| POST | `/api/v1/channel/close` | Cooperative channel close |
| GET | `/api/v1/channel/:id` | Get channel state |
| POST | `/api/v1/transfer` | Send DOG transfer |
| GET | `/api/v1/user/:pubkey` | Get user info + channels |
| GET | `/api/v1/history/:pubkey` | Transfer history |
| POST | `/api/v1/claim/create` | Create claim link |
| GET | `/api/v1/claim/:id` | Get claim link details |
| GET | `/.well-known/rune-address/:username` | Resolve RuneBolt address |

## SDK Usage

```typescript
import { RuneBoltClient } from '@runebolt/sdk';

const client = new RuneBoltClient({
  apiUrl: 'https://api.runebolt.io',
  authToken: 'your-jwt-token',
});

// Send DOG instantly
await client.sendDOG({
  fromChannelId: 'channel-123',
  recipientPubkey: '02abc...',
  amount: '100000',
  memo: 'Payment for services',
});

// Subscribe to incoming transfers
const unsubscribe = client.onTransfer((event) => {
  console.log(`Received ${event.transfer.amount} DOG`);
  console.log(`New balance: ${event.newBalance.available}`);
});
```

## DOG Rune Details
- **Rune**: DOG•GO•TO•THE•MOON
- **Rune ID**: `1:0`
- **Network**: Bitcoin Mainnet

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, SQLite, WebSocket
- **Frontend**: Next.js 14, React 18, Tailwind CSS, Framer Motion
- **SDK**: TypeScript, WebSocket
- **Bitcoin**: bitcoinjs-lib, mempool.space API, Taproot/MuSig2

## License

MIT
