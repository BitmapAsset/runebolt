# Lightning Deed Protocol (LDP)

**Instant, Non-Custodial Transfer of Runes and Bitmap Inscriptions via Lightning Network**

*Version 0.1.0 — RuneBolt Project*

## The Problem

Bitcoin Runes and Bitmap inscriptions live on-chain as UTXOs. Transferring them requires a Bitcoin transaction — 10+ minutes for one confirmation, often more for finality. There is no native way to send Runes through Lightning channels because Lightning operates on payment channels, not arbitrary UTXO transfers.

Existing approaches all compromise on something:

- **Wrapping** (Taproot Assets): Requires minting a synthetic representation of the Rune on a separate protocol layer. This introduces custodial trust, protocol complexity, and the wrapped asset is not the original Rune.
- **Relay/Bridge models**: Require a trusted intermediary to hold assets during transit. If the relay goes offline or acts maliciously, assets are at risk.
- **Submarine swaps**: Solve the Lightning↔on-chain bridge for Bitcoin, but do not handle Rune metadata or inscription preservation. They are also limited to BTC-denominated swaps.

None of these approaches deliver instant, trustless, non-custodial transfer of the actual on-chain Rune or Bitmap inscription.

## The Insight

We do not need to move the asset through Lightning. We only need to transfer the **cryptographic right to claim** the asset. Lightning already has the perfect mechanism for instant, atomic secret revelation: the HTLC payment preimage.

## The Mechanism

### Step 1: Deed-Lock

The sender adds a Tapscript spending condition to their Rune UTXO. This creates a Taproot output with two spending paths:

**Claim path** (for recipient):
```
OP_SHA256 <payment_hash> OP_EQUALVERIFY <recipient_pubkey> OP_CHECKSIG
```

**Recovery path** (for sender, after timeout):
```
<timeout_blocks> OP_CHECKSEQUENCEVERIFY OP_DROP <sender_pubkey> OP_CHECKSIG
```

These two scripts form the leaves of a Taproot script tree. The UTXO is sent to the resulting P2TR address. No asset movement occurs yet — the Rune sits in the deed-locked output, spendable by whoever reveals the preimage.

### Step 2: Lightning Transfer

The sender creates a Lightning HTLC using the **same payment hash** as the deed-lock script. The recipient receives a Lightning payment (1+ sat). Upon settlement, the payment preimage is revealed to the recipient instantly (milliseconds).

This is the critical binding: the Lightning payment hash and the Bitcoin deed-lock hash are identical. Revealing the preimage on one side unlocks both.

### Step 3: Claim

The recipient now holds the preimage. They construct a Bitcoin transaction that spends the deed-locked UTXO via the claim path: provide the preimage (satisfies `OP_SHA256 ... OP_EQUALVERIFY`) and their signature (satisfies `OP_CHECKSIG`). The Rune or Bitmap moves to the recipient's address on-chain.

### Step 4: Atomicity Guarantee

The protocol is atomic because of timeout ordering. The Lightning HTLC **must** expire before the Bitcoin CSV timelock. This means:

- If the Lightning payment succeeds → recipient gets the preimage → they can always claim before the Bitcoin timeout.
- If the Lightning payment fails → preimage is never revealed → sender recovers the UTXO after the timeout.
- If the sender tries to recover early → the CSV timelock prevents it.

The sender cannot double-spend: after deed-locking, the UTXO is committed. They either lose the Lightning sats (if the payment succeeds and the recipient claims) or they wait for the timeout to recover. There is no window where the sender keeps both the sats and the asset.

## Non-Custodial and Trustless

At no point does any third party hold the asset. The deed-lock is a Bitcoin script — enforced by the Bitcoin network itself. The Lightning payment is a standard HTLC — enforced by the Lightning Network. The atomic binding between them is cryptographic (same SHA256 hash), not institutional.

The recipient does not need to trust the sender, a bridge, a relay, or any intermediary. They verify the deed-lock script on-chain, confirm the payment hash matches, and know that receiving the Lightning payment guarantees their ability to claim.

## Why This Is Novel

Taproot hash-locks and Lightning HTLCs both use SHA256 preimages — but nobody has connected them for the purpose of Rune or inscription transfer. Submarine swaps use a similar hash-lock bridge for BTC↔Lightning swaps, but they do not handle Rune protocol metadata or ordinal sat positioning.

LDP extends this pattern to arbitrary Bitcoin-native assets: any UTXO-based asset (Runes, Bitmaps, BRC-20 inscriptions) can be deed-locked and transferred via Lightning preimage revelation. The asset never leaves Bitcoin L1 — only the right to claim it travels at Lightning speed.

## Comparison

| Approach | Speed | Custody | Trust | Actual Asset |
|----------|-------|---------|-------|-------------|
| On-chain transfer | ~10 min | Self | Trustless | Yes |
| Taproot Assets wrap | Instant | Third-party | Protocol trust | No (wrapped) |
| Relay/Bridge | Minutes | Bridge | Bridge trust | Yes |
| **LDP (this protocol)** | **Instant** | **Self** | **Trustless** | **Yes** |

## Conclusion

The Lightning Deed Protocol enables instant transfer of Bitcoin-native assets without wrapping, bridging, or custodial intermediaries. By binding Taproot hash-lock scripts to Lightning payment preimages, LDP transfers the cryptographic right to claim an asset at Lightning speed while the asset itself remains secured by Bitcoin consensus.
