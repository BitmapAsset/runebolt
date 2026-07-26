# RuneBolt

**Trustless PSBT atomic swaps and an open listing book for Bitcoin-native assets.**
Ordinals · Bitmap · Runes · BRC-20. Settled on Bitcoin L1. No token, no custody, no permission.

> **Status: spec phase.** The protocol specification is written; implementation has not started.
> The previous Taproot-Assets-era codebase is archived under [`legacy/`](./legacy/) and is not maintained.

---

## What it is

A seller signs one input of a Bitcoin transaction that hands their asset to a buyer and their
payment to themselves. A buyer completes that transaction and broadcasts it. Assets move one way and
sats move the other **in the same transaction, or neither moves**.

No component of RuneBolt ever holds an asset, escrows a payment, or co-signs a trade. The listing
book is open — a listing is a self-contained artifact that stays valid without RuneBolt's servers,
and any node may serve it, mirror it, or ignore it.

## Ethos scorecard

| | RuneBolt |
|---|---|
| **Custody** | None. Two signatures, one transaction, no third party in the settlement path. |
| **Token** | None. Priced and settled in sats. |
| **Permission** | None. No account, no approval, no relationship with an operator required to list or buy. |
| **Settlement** | Bitcoin L1. Not a sidechain, not a hub ledger, not Lightning. |
| **Open source** | MIT. |
| **Open book** | Anyone may run one. `ord`-compatible HTTP plus Nostr propagation. |
| **Lightning** | Receipts, anti-spam and coordination only — **never settlement**, and the spec says why. |
| **Agent-native** | SDK, CLI and MCP server are first-class surfaces, not wrappers added later. |
| **Snipe-proof** | **No.** Open `SIGHASH_SINGLE\|ANYONECANPAY` listings can be front-run in the mempool, and the buyer is the party at risk. Disclosed honestly; protected mode designed for in v1, shipped in v1.x. |

That last row stays in the table. RuneBolt is trustless; it is not immune to mempool sniping, and
any surface claiming otherwise is out of spec.

## Documentation

- **[docs/SPEC.md](./docs/SPEC.md)** — protocol specification v1: lot model, listing lifecycle, PSBT
  wire formats per asset class, named invariants, `verifyOffer()`, deeds, cancellation, sniping
  disclosure, wallet matrix, Lightning boundary, interop surfaces, open risks.
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — system shape, dependency rules, build waves,
  testing posture.
- **[docs/research/](./docs/research/)** — the feasibility research the spec is built on, with every
  claim tagged verified / inferred / reported.

## Asset support

| Asset | Status | Note |
|---|---|---|
| Ordinals / inscriptions | works | 2-dummy layout, production-proven pattern |
| Bitmap | works | identical rail; ownership is indexer consensus, and listings say so |
| Runes | works, with a prepare step | the listed unit is a **UTXO**, not an amount; partial sales need an on-chain split first |
| BRC-20 | works, with a heavier prepare step | requires a transfer inscription (commit + reveal) before anything is listable |

The prepare requirement is not a shortcoming of this design — it falls out of the sighash algebra,
and every production marketplace arrived at the same two-transaction flow. `SPEC.md` §6.2.2 shows
the derivation instead of asserting it.

## Standards adopted

RuneBolt does not invent a wire format. It adopts what already works and cites it so third parties
can interoperate:

- `ord` [#4291](https://github.com/ordinals/ord/issues/4291) — inscription sell-offer PSBT format
- `ord` [#4290](https://github.com/ordinals/ord/issues/4290) — rune sell-offer PSBT format
- [`me-foundation/msigner`](https://github.com/me-foundation/msigner) — deployed 2-dummy layout
- `ord` `POST /offer` / `GET /offers` — listing-book HTTP surface
- [NIP-100](https://github.com/ordersproject/nips/blob/master/100.md) — order propagation
  (extending the product-type enum to cover runes and bitmap is our contribution upstream)
- [NIP-47](https://github.com/nostr-protocol/nips/blob/master/47.md) — Nostr Wallet Connect, for payouts
- [BIP-322](https://bips.dev/322/) — signed deeds and cancellation

## Roadmap

Build waves are listed in [ARCHITECTURE.md §3](./docs/ARCHITECTURE.md#3-build-waves). W3 —
`verifyOffer()` — gates every builder: no code that constructs a swap merges before the code that
checks it.

## License

MIT — see [LICENSE](./LICENSE).
