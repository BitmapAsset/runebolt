# RuneBolt Architecture v1

**Status:** Draft v1 (spec phase — no implementation yet)
**Companion to:** [`SPEC.md`](./SPEC.md)

This document describes the v1 system shape and the build waves. It defines *where things live and
what may depend on what*. Protocol rules live in `SPEC.md` and are not restated here.

---

## 1. Shape

```
                       ┌──────────────────────────────────────────────┐
                       │  Consumers                                    │
                       │  reference storefront · Nexus · third parties │
                       │  agents (via MCP)                             │
                       └───────────────┬──────────────────────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        │              │               │               │              │
   ┌────▼────┐   ┌─────▼─────┐   ┌─────▼──────┐  ┌─────▼─────┐  ┌─────▼─────┐
   │   CLI   │   │    MCP    │   │  SDK (TS)  │  │ storefront│  │  Nexus    │
   │         │   │  server   │   │            │  │ (reference)│ │ (external)│
   └────┬────┘   └─────┬─────┘   └─────┬──────┘  └─────┬─────┘  └─────┬─────┘
        └──────────────┴───────────────┤               │              │
                                       │               │              │
                              ┌────────▼───────────────▼──────────────▼──┐
                              │           SDK core (@runebolt/sdk)        │
                              │  namespaces:  swap · deeds · lightning    │
                              └────────┬─────────────────────┬────────────┘
                                       │                     │
                    ┌──────────────────▼─────┐    ┌──────────▼───────────┐
                    │   listing book service │    │  indexer adapters    │
                    │   (open; anyone runs)  │    │  ord · custom · …    │
                    └──────────────────┬─────┘    └──────────┬───────────┘
                                       │                     │
                                  ┌────▼─────────────────────▼────┐
                                  │        Bitcoin L1 / mempool   │
                                  └───────────────────────────────┘
```

### 1.1 Dependency rules

These are enforced by package boundaries, not by convention.

1. **`swap` never imports `lightning`.** Lightning does not settle swaps (SPEC §12.1); a compile-time
   boundary is the cheapest way to guarantee it stays that way. Violating this should fail the build.
2. **The SDK never depends on a specific book.** A book is a transport. `verifyOffer()` and the
   builders operate on an envelope, so a listing fetched from an `ord` node, a Nostr relay, a
   RuneBolt book, or a file behaves identically.
3. **Nothing in the settlement path holds keys.** The book service, indexer adapters and MCP server
   have no signing capability and no wallet. The only signing happens in the user's wallet.
4. **Indexer reads are always attributed.** Adapters return `{ contents, indexer, indexerVersion,
   blockHeight, observedAt }` (SPEC §8.3). There is no unattributed read API, so an unattributed
   claim cannot be constructed by accident.
5. **Venues get no privilege.** Nexus consumes the same public SDK and the same public book API as
   any third party. If Nexus needs a capability, it is added to the public surface or not at all.

---

## 2. Components

### 2.1 Listing book service

An open, replaceable index of live listings. Anyone may run one; RuneBolt runs one for convenience,
not for authority.

**Responsibilities**
- Accept listing envelopes (SPEC §8.1) and bare PSBTs on the ord-compatible route (SPEC §10.1)
- Validate on ingest: PSBT deserializes, `sighashMode` recognised, invariants I-1…I-6 hold,
  referenced lot is unspent, envelope not already expired
- Serve, filter and paginate listings
- Track spend of listed lots and retire dead listings
- Honour deed cancellations (SPEC §8.5) and propagate NIP-100 kind-5
- Enforce anti-spam, optionally via NWC hold invoices (SPEC §12.2)

**Non-responsibilities** — no custody, no signing, no escrow, no matching engine, no fee capture, no
authority over validity. **A listing served by a book must be fully verifiable without the book.**
If a consumer has to trust the book for anything, that is a design bug.

**Interfaces**
- `POST /offer`, `GET /offers` — ord-compatible, bare base64 PSBT (SPEC §10.1)
- `POST /listings`, `GET /listings` — RuneBolt envelope, richer filtering
- Nostr: publish/subscribe kinds 60018 / 60019 / 5 (SPEC §10.2)

### 2.2 Indexer adapters

A narrow interface over "what does this UTXO contain," implemented per indexer.

```
interface IndexerAdapter {
  name: string
  version(): Promise<string>
  utxoContents(location: Location): Promise<AttributedContents>   // always attributed
  isSpent(location: Location): Promise<boolean>
  runeInfo(runeId: RuneId): Promise<AttributedRuneInfo>
  inscriptionInfo(id: InscriptionId): Promise<AttributedInscriptionInfo>
}
```

`ord` is the reference adapter. The interface exists because bitmap ownership is indexer consensus
rather than Bitcoin consensus (SPEC §8.3, R4) — the system must be able to ask two indexers and
surface disagreement, rather than hard-coding one opinion as truth.

Adapters must handle **negative inscription numbers** (cursed inscriptions are tradeable).

### 2.3 SDK — `@runebolt/sdk` (TypeScript)

The protocol implementation. Everything else is a shell over it.

```
@runebolt/sdk
├── swap/                    ← settlement path. Never imports lightning/.
│   ├── lots                 lot discovery, conformance checks, mixed-UTXO rejection
│   ├── prepare              split (rune) · transfer inscription (BRC-20) · skip detection
│   ├── build                offer PSBT builders, per asset class, per wire format
│   ├── verify               verifyOffer() + pre-sign lint   ← the safety core
│   ├── wallets              native providers: unisat · leather · xverse(legacy) · sparrow(io)
│   └── book                 book clients: ord-http · runebolt-http · nostr
├── deeds/                   ← BIP-322 sign/verify, deed schema, cancellation
└── lightning/               ← NWC (NIP-47), LNURL-pay, opaque destination handles
```

**`swap/verify` is the safety core and gets treated accordingly.** It is a direct port of `ord`'s
`offer/accept.rs` checklist (SPEC §7.2) and is the only module allowed to be paranoid at the expense
of ergonomics. Signing helpers call it unconditionally; there is no bypass flag. Its balance-delta
simulation is the one generic defence in the system, so it carries the densest test coverage,
including adversarial cases built by deliberately misordering outputs.

**Wallet providers are separate modules with a shared type, not a unified abstraction.** Xverse's
legacy-path constraint (SPEC §11.1) and the known Unisat/sats-connect finalization bug are both
provider-specific realities that a common abstraction would paper over.

**`prepare` returns handles, never blocks.** Every prepare operation returns
`{ prepareTxid, estimatedFeeSats, estimatedWait }` immediately and exposes poll + subscribe. An
agent must be able to start a prepare, do something else, and resume from the handle in a later
process.

### 2.4 CLI

Thin shell over the SDK, aimed at power users and cold-key sellers.

```
runebolt lot list                              # conforming lots in the wallet
runebolt prepare split  <rune> <amount>        # → prepareTxid, resumable
runebolt prepare brc20  <ticker> <amount>      # commit + reveal
runebolt list <location> --price <sats> [--expires <dur>]
runebolt offers [--asset-class …] [--book …]
runebolt buy <listing> [--dry-run]             # dry-run prints txid + human diff, signs nothing
runebolt verify <psbt>                         # verifyOffer() standalone
runebolt cancel <listing> [--send-to-self]     # deed cancel; --send-to-self is trustless
runebolt deed sign|verify
```

`--dry-run` is available on every state-changing command and mirrors `ord`'s. The CLI must be usable
in a Sparrow workflow: emit an unsigned PSBT, sign elsewhere, re-ingest.

### 2.5 MCP server

The agent-native surface, and a first-class consumer rather than an afterthought. Tools map to SDK
calls with strict schemas.

- `runebolt_list_offers`, `runebolt_get_offer`
- `runebolt_verify_offer` — returns a structured verdict, never a bare boolean
- `runebolt_build_purchase` — returns an unsigned PSBT for external signing
- `runebolt_prepare_status` — poll a `prepareTxid`
- `runebolt_lightning_payout` — NWC, budget-scoped

**The MCP server never holds a signing key.** It builds and verifies; a human or a wallet signs.
Where an agent needs autonomous payout authority, that authority is an NWC connection with a
wallet-enforced budget and an independently revocable key (SPEC §12.2) — never a raw key held by the
server.

Every tool that touches an amount returns the attribution block, so an agent cannot restate an
indexer opinion as fact.

### 2.6 Reference storefront

A minimal, unbranded web client proving the protocol end-to-end with real wallets. It is a
conformance reference, not a product: if the storefront needs something the SDK does not expose, the
SDK is incomplete.

Mandatory UI obligations, all traceable to spec sections:

- Snipe disclosure on every buy surface, **naming the buyer as the party at risk** (SPEC §9.1)
- Prepare cost and wait shown *before* the seller commits (SPEC §4.3)
- Bitmap scope disclosure — district vs parcels vs content library (SPEC §8.4)
- Indexer name, version and block height displayed alongside every amount (SPEC §8.3)
- Deed cancel vs send-to-self distinction shown honestly (SPEC §8.5)
- `SOLD` only on confirmation, never on broadcast (SPEC §4.1)

### 2.7 Nexus

A premium venue on top of the open book: curation, presentation, discovery, and its own fee model.
It consumes the same public SDK and book API as anyone else and holds no protocol privilege. Its
existence must not make the open path worse.

---

## 3. Build waves

Small and reviewable. Each wave ends in something verifiable; nothing merges on the promise of a
later wave.

| Wave | Scope | Done when |
|---|---|---|
| **W0** | Repo skeleton, TS toolchain, CI, package boundaries (incl. the `swap`↛`lightning` lint) | CI green; boundary violation fails the build |
| **W1** | Types + envelope: `Lot`, `ListingEnvelope`, `Deed`, `AttributedContents`, error enum from SPEC §7.1 | Round-trip encode/decode; unknown `sighashMode` rejected |
| **W2** | Indexer adapter interface + `ord` adapter | Attributed reads against a live ord node; negative inscription numbers handled |
| **W3** | `verifyOffer()` + pre-sign lint | Full SPEC §7.2 checklist; adversarial fixtures for every SILENT-LOSS invariant fail closed |
| **W4** | Inscription/bitmap builders — 2-dummy layout | Signet/testnet swap confirms; sat offset preserved; dummies regenerated |
| **W5** | Wallet providers: Unisat + Leather | Real seller signature at the correct sighash, in-browser |
| **W6** | Book service — ord-compatible routes, ingest validation, spend tracking | A listing published to RuneBolt is consumable by an `ord --accept-offers` node and vice versa |
| **W7** | Rune builders — runestone-free layout | Signet swap confirms; I-1/I-2 adversarial tests pass; exact-balance skip detection works |
| **W8** | Rune prepare (split) — `ord wallet split` semantics | `PREPARING` resumable across process restart |
| **W9** | Deeds — BIP-322 sign/verify, cancellation, NIP-100 kind-5 | Deeds verify across Unisat, Leather, Xverse, Sparrow |
| **W10** | BRC-20 prepare + builders | Commit+reveal prepare, then a confirmed swap |
| **W11** | CLI | Every SDK capability reachable; `--dry-run` everywhere |
| **W12** | MCP server | Agent completes a full dry-run purchase flow with no key access |
| **W13** | Lightning namespace — NWC, LNURL-pay, hold invoices | Payout with a budget-scoped, revocable connection; boundary lint still green |
| **W14** | Reference storefront | End-to-end purchase on mainnet with all §2.6 disclosures present |
| **W15** | Nostr propagation + runes/bitmap product-type extension, proposed upstream | Listing propagates and cancels via relays |
| **W16** | Xverse (legacy path) + Sparrow import/export; **Magic Eden wallet verification (R7)** | R7 closed with evidence, either way |

Waves W4–W7 are the critical path. W3 gates all of them: no builder merges before the verifier that
checks it exists.

---

## 4. Testing posture

- **Adversarial fixtures for every SILENT-LOSS invariant.** For each of I-1, I-2, I-4, I-5 there is a
  test that *deliberately constructs the violation* and asserts the named error. A rule with no
  failing-case test is not implemented.
- **The rune index-0 test is mandatory and non-negotiable** (R3). It builds a swap with a fee output
  at index 0 and asserts `E_RUNE_OUTPUT_INDEX` before anything is signed.
- **Cenotaph test** (I-2): a runestone injected into the swap path is rejected by the buyer-side
  builder, not merely discouraged.
- **Balance-delta property test:** for arbitrary output permutations, `verifyOffer()` accepts only
  those where the signer's net delta equals the asserted price.
- **Signet/testnet integration** before every mainnet claim. A wave is not done on unit tests alone.
- **Wallet conformance suite:** the same seller-signature scenario across every supported provider,
  asserting the actual sighash byte on the produced signature — the only way Xverse regressions to
  the modern path get caught.

---

## 5. Deferred, deliberately

| Item | Why deferred | Precondition |
|---|---|---|
| Protected (all-`SIGHASH_ALL`) listing mode | Needs a coordinator and a liveness model; v1's job is the envelope that makes it additive (SPEC §9.3) | v1 shipped; envelope proven stable |
| Private / direct-pool broadcast | ~250% fee markup, 2–6h waits [reported] — a user choice, not a default | Protected mode shipped |
| Unified wallet abstraction | Provider-specific bugs and API asymmetries are real; abstracting now hides them (SPEC §11.2) | Every target wallet independently proven |
| BOLT12 | Ecosystem still migrating; opaque destination handle makes it a backend swap | NWC path in production |
| Rune buy-offers (bid side) | Upstream `ord` #4282 still open; conventions may change (R8) | #4282 resolved, or a decision to diverge |

---

## 6. Repository layout

```
runebolt/
├── docs/
│   ├── SPEC.md              protocol specification
│   ├── ARCHITECTURE.md      this file
│   └── research/            R0 feasibility research (source of record)
├── legacy/                  archived Taproot-Assets-era design (not maintained)
└── …                        implementation lands from W0 onward
```
