# ⚡ RuneBolt v0.1.0

Lightning Deed Protocol - Instant Bitcoin asset transfers over Lightning Network

## Quick Start

```bash
npm install
npm test
```

## Usage

```typescript
import { createDeedLock } from 'runebolt';

const deed = createDeedLock({
  asset: { type: 'rune', id: 'DOG', amount: 1000 },
  senderPubkey: '...',
  recipientPubkey: '...',
  paymentHash: '...',
  timeoutBlocks: 144
});

console.log('Deed address:', deed.address);
```

## License
MIT