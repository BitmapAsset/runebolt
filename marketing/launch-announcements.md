# RuneBolt Launch Announcements

---

## Telegram Announcement

**Channel post:**

⚡ **RuneBolt is LIVE** ⚡

We just launched the first Lightning Deed Protocol for Bitcoin assets.

**What does that mean?**
Transfer Runes, Ordinals, Bitmap & BRC-20 tokens *instantly* over Lightning Network — without giving up custody of your assets.

**How it works:**
Your asset gets deed-locked with a Tapscript. A Lightning payment carries the key. When Lightning settles (milliseconds), the recipient can claim the asset on-chain. No wrapping. No bridges. No trust.

**Key stats:**
- Transfer time: < 1 second
- Cost: 1-10 sats
- Custody: Always yours
- Bridge fee: 0.5%

**Supported wallets:** UniSat, Xverse, Leather, OKX

**Links:**
- App: runebolt.io
- GitHub: github.com/gary-moto/runebolt
- Docs: runebolt.io/docs

Built by Block Genomics. Open source. MIT License.

---

## Discord Announcement

**Channel: #announcements**

```
⚡ RuneBolt Launch ⚡
```

Hey everyone — RuneBolt is officially live.

**TL;DR:** Instant, non-custodial transfers for all Bitcoin-native assets over Lightning Network.

**What can you do right now?**
1. Connect your Bitcoin wallet (UniSat, Xverse, Leather, or OKX)
2. View your Runes, Ordinals, and Bitmap holdings
3. Transfer any asset instantly via the Lightning Deed Protocol
4. Pay 1-10 sats per transfer. That's it.

**How is this different from bridges?**
- No wrapping — you're transferring the *actual* asset
- No custodial risk — RuneBolt never holds your Bitcoin
- No waiting — Lightning settles in milliseconds, not 10+ minutes
- No synthetic tokens — what you send is what they get

**The Lightning Deed Protocol (LDP):**
Instead of moving the asset, LDP transfers the cryptographic *right* to claim it. A Tapscript hash-lock on your UTXO shares a payment hash with a Lightning HTLC. When Lightning settles, the preimage unlocks both. Atomic, trustless, instant.

**Featured assets:** 🐱 BILLY | 🐕 DOG | 🏙️ BITMAP | 🐸 PEPE

**Links:**
- App: <runebolt.io>
- GitHub: <github.com/gary-moto/runebolt>
- MIT Licensed — fully open source

Questions? Drop them in #support. Let's go. ⚡

---

## Reddit Post

**Subreddits:** r/Bitcoin, r/CryptoCurrency, r/ordinals, r/lightningnetwork

**Title:** RuneBolt: Instant, non-custodial transfers for Runes, Ordinals & Bitmap over Lightning Network [Open Source]

**Body:**

We just launched RuneBolt — an open-source protocol for transferring Bitcoin-native assets instantly over Lightning Network without custodial risk.

**The problem:** Moving Runes, Ordinals, or Bitmap inscriptions on Bitcoin means waiting for block confirmations (10+ minutes) or trusting a custodial bridge. Existing solutions either wrap your asset into a synthetic token or require you to trust an intermediary.

**The solution — Lightning Deed Protocol (LDP):**

RuneBolt doesn't move your asset. It transfers the cryptographic *right* to claim it:

1. **Deed-Lock** — The sender creates a Tapscript spending condition on their asset UTXO with a hash-lock (claim path) and a timelock (refund path)
2. **Lightning Transfer** — A Lightning HTLC is created using the same SHA256 payment hash as the deed-lock
3. **Preimage Reveal** — Lightning payment settles in milliseconds, revealing the preimage to the recipient
4. **Claim** — The recipient uses the preimage to spend the deed-locked UTXO, claiming the actual asset on-chain

The key insight: the Bitcoin script and Lightning payment share the same hash. Revealing the preimage on one side unlocks both. Atomicity is guaranteed by timeout ordering.

**Why not just use existing solutions?**

| Feature | RuneBolt (LDP) | Submarine Swaps | Taproot Assets | Relay Bridges |
|---|---|---|---|---|
| Asset types | All Bitcoin assets | BTC only | Wrapped only | Limited |
| Custody | Non-custodial | Non-custodial | Custodial risk | Trusted relay |
| Speed | < 1 second | < 1 second | Variable | Minutes |
| What you get | Actual asset | BTC | Synthetic token | Depends |

**Stats:**
- Transfer time: < 1 second
- Cost: 1-10 sats per transfer
- Bridge fee: 0.5%
- Wallets: UniSat, Xverse, Leather, OKX

**Open source:** MIT License. Full code on GitHub.

- App: runebolt.io
- Code: github.com/gary-moto/runebolt
- Built by Block Genomics (blockgenomics.io)

Happy to answer technical questions in the comments.
