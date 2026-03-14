# RuneBolt FAQ

## General

### What is RuneBolt?
RuneBolt is the first Lightning Deed Protocol (LDP) implementation — a non-custodial, instant transfer protocol for Bitcoin-native assets. It enables you to transfer Runes, Ordinals, Bitmap inscriptions, and BRC-20 tokens over Lightning Network in under one second.

### How is RuneBolt different from a bridge?
Traditional bridges wrap your asset into a synthetic token and require you to trust a custodian. RuneBolt never wraps, never holds, and never touches your assets. The Lightning Deed Protocol transfers the cryptographic *right* to claim an asset using Tapscript hash-locks tied to Lightning HTLCs. You're always transferring the actual asset, not a representation of it.

### Who built RuneBolt?
RuneBolt is built by [Block Genomics](https://blockgenomics.io) and is fully open source under the MIT License.

### Is RuneBolt open source?
Yes. The full codebase is available on [GitHub](https://github.com/gary-moto/runebolt) under the MIT License.

---

## How It Works

### What is the Lightning Deed Protocol (LDP)?
LDP transfers the cryptographic right to claim an asset, not the asset itself. It works in 4 steps:

1. **Deed-Lock** — Sender creates a Tapscript spending condition on their asset UTXO with two paths: a claim path (requires SHA256 preimage + recipient signature) and a refund path (requires timelock expiry + sender signature).
2. **Lightning Transfer** — Sender creates a Lightning HTLC using the same payment hash as the deed-lock script.
3. **Preimage Reveal** — The Lightning payment settles in milliseconds, revealing the preimage to the recipient.
4. **Claim** — Recipient uses the revealed preimage to spend the deed-locked UTXO on Bitcoin, claiming the asset.

### Why is it trustless?
The Bitcoin script and Lightning payment use the same SHA256 hash. The preimage that settles the Lightning payment is the same preimage that unlocks the asset on-chain. Timeout ordering (Lightning expiry happens before the Bitcoin CSV timelock) ensures atomicity — either both sides complete, or neither does.

### What happens if something goes wrong mid-transfer?
If the Lightning payment fails or times out, the sender's refund path activates after the timelock expires. The asset returns to the sender. No funds are lost.

### How fast are transfers?
Transfers settle in under 1 second. The Lightning payment itself settles in milliseconds; the on-chain claim transaction can be broadcast immediately after.

---

## Assets

### What assets does RuneBolt support?
RuneBolt supports all Bitcoin-native asset types:
- **Runes** — UTXO-based fungible tokens (DOG, PEPE, BILLY, etc.)
- **Ordinals** — Bitcoin inscriptions (NFTs)
- **Bitmap** — Digital land parcels representing Bitcoin blocks
- **BRC-20** — Inscription-based fungible tokens

### What are the "Bitcoin Avengers"?
The four featured assets in the RuneBolt interface:
- 🐱 **BILLY** (Billion Dollar Cat) — Purple-themed Rune
- 🐕 **DOG** (Doggotothemoon) — Red-themed Rune
- 🏙️ **BITMAP** (Bitmap Protocol) — Orange-themed digital land
- 🐸 **PEPE** (Rare Pepe) — Green-themed Rune

### Can I transfer any Rune, or only the featured ones?
Any Rune. The featured assets are highlighted in the UI, but RuneBolt works with any UTXO-based Bitcoin asset.

---

## Wallets

### Which wallets are supported?
RuneBolt supports four Bitcoin wallets:

| Wallet | Description |
|--------|-------------|
| **UniSat** | Most popular wallet for Runes & Ordinals |
| **Xverse** | Mobile & desktop with Bitcoin L2 support |
| **Leather** | Stacks & Bitcoin wallet (formerly Hiro) |
| **OKX Wallet** | Multi-chain exchange wallet with Bitcoin support |

### Do I need a Lightning wallet?
No. RuneBolt handles the Lightning side. You only need a Bitcoin wallet that supports PSBT signing (all four supported wallets do).

### Do I need to install anything extra?
Just your preferred Bitcoin wallet browser extension. No additional software needed.

### Can I use a hardware wallet?
Not directly at this time. Hardware wallets that support PSBT signing through one of the supported browser extensions may work, but this is not officially supported yet.

---

## Fees & Costs

### How much does a transfer cost?
- **Bridge fee:** 0.5% of the asset value
- **Lightning routing fees:** Typically 1-10 sats
- **On-chain fees:** Standard Bitcoin network fee for the claim transaction

### Why is there a bridge fee?
The 0.5% bridge fee covers the infrastructure costs of running the Lightning node, indexer services, and protocol maintenance.

### Are there hidden fees?
No. The bridge fee (0.5%) and Lightning routing fees (1-10 sats) are the only fees. On-chain Bitcoin network fees apply to the claim transaction as with any Bitcoin transaction.

---

## Safety & Security

### Is RuneBolt custodial?
No. RuneBolt is fully non-custodial. Your assets are locked in a Tapscript that only you (or the intended recipient) can spend. RuneBolt never holds or controls your Bitcoin or assets.

### What if RuneBolt goes down during a transfer?
If a transfer is in progress and RuneBolt infrastructure becomes unavailable:
- If the Lightning payment hasn't settled, nothing happens — your asset remains deed-locked and will be refundable after the timelock expires.
- If the Lightning payment has settled, the recipient has the preimage and can claim the asset on-chain independently.

### Has RuneBolt been audited?
RuneBolt is open source and available for public review. The cryptographic security relies on Bitcoin Script and Lightning Network HTLCs — battle-tested Bitcoin primitives. For security concerns, contact security@blockgenomics.io.

### Can I lose my assets?
The protocol is designed to be atomic: either the transfer completes fully, or the sender gets a refund via the timelock path. As long as you don't lose access to your wallet before the timelock expires, your assets are safe.

---

## Technical

### What Bitcoin network does RuneBolt use?
RuneBolt operates on Bitcoin mainnet for production transfers. Testnet and regtest environments are available for development.

### What Lightning implementation does RuneBolt use?
RuneBolt integrates with LND (Lightning Network Daemon) via gRPC for all Lightning operations.

### How does RuneBolt discover my assets?
RuneBolt queries the UniSat API (Runes indexer) and your connected wallet to discover your Runes, Ordinals, and other Bitcoin assets.

### Can I run my own RuneBolt node?
Yes. RuneBolt is open source (MIT License). You can deploy your own instance with your own LND node. See the [GitHub repository](https://github.com/gary-moto/runebolt) for setup instructions.

---

## Contact & Community

- **Website:** runebolt.io
- **GitHub:** github.com/gary-moto/runebolt
- **Security:** security@blockgenomics.io
- **Built by:** [Block Genomics](https://blockgenomics.io)
