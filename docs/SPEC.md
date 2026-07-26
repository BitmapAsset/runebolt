# RuneBolt Protocol Specification v1

**Status:** Draft v1 (spec phase — no implementation yet)
**Date:** 2026-07-26
**Settlement layer:** Bitcoin mainnet, L1
**Source of record:** [`runebolt-feasibility-research.md`](./research/runebolt-feasibility-research.md) (R0)

Claim tags are carried forward from R0 research and are **not** upgraded here:
**[verified]** = read from primary source (spec text, source code, official docs).
**[inferred]** = reasoning from verified primitives, not stated by a source.
**[reported]** = secondary source only.
**[unverified]** = open task, no evidence either way.

---

## 1. Overview and ethos

RuneBolt is a protocol for trading Bitcoin-native assets — ordinals/inscriptions, bitmap districts,
runes and BRC-20 — by exchanging pre-signed Partially Signed Bitcoin Transactions (PSBTs) that
settle as a single Bitcoin L1 transaction.

### 1.1 The four properties

| Property | What it means here |
|---|---|
| **No custody** | No RuneBolt component ever holds, escrows, or co-signs an asset or a payment. The seller signs one input of a transaction; the buyer completes and broadcasts it. Assets move seller→buyer and sats move buyer→seller in the same transaction, or neither moves. |
| **No token** | There is no RuneBolt token, no points, no protocol fee asset. Value is denominated in sats. |
| **No permission** | Listing does not require an account, an approval, or a relationship with any operator. The listing book is open: any node may serve it, mirror it, or ignore it. A listing is a self-contained artifact that is valid without RuneBolt's servers. |
| **L1 settlement** | Trades settle on Bitcoin. Not on a sidechain, not in a hub ledger, not over Lightning. |

### 1.2 What RuneBolt is not

- **Not an escrow.** There is no state in which a third party controls the asset.
- **Not a custodial exchange.** There are no deposits and no withdrawals.
- **Not snipe-proof.** See §9. Open `SIGHASH_SINGLE|ANYONECANPAY` listings are actively
  front-run in production. RuneBolt is trustless; it is not immune to mempool sniping. Any
  RuneBolt surface that claims otherwise is out of spec.
- **Not a consensus authority.** Runes, bitmap and BRC-20 validity are *indexer* facts, not Bitcoin
  consensus facts. RuneBolt reports what a named, versioned indexer says at a named block height
  (§8.3), and never asserts protocol-level validity in its own name.

### 1.3 Layering

```
  Nexus (premium venue)          ← curation, presentation, discovery, fee-taking venue
  ────────────────────────────
  Open listing book              ← anyone may run one; ord-compatible + Nostr propagation
  ────────────────────────────
  RuneBolt protocol (this spec)  ← lot model, PSBT wire formats, invariants, deeds
  ────────────────────────────
  Bitcoin L1                     ← settlement
```

The listing book is open. Nexus is one venue on top of it and receives no protocol-level privilege.

### 1.4 Prior art adopted rather than invented

RuneBolt does not invent a new wire format. It adopts the de-facto standards and cites them so
third parties can interoperate. There is no ratified BIP for PSBT listings; the closest thing to a
standard is the pair of `ordinals/ord` issues plus msigner's deployed layout. [verified]

| Concern | Standard adopted | Reference |
|---|---|---|
| Inscription/bitmap swap layout | 2-dummy layout, PSBT Format v2 | `ord` issue [#4291](https://github.com/ordinals/ord/issues/4291); `me-foundation/msigner` (MIT) |
| Rune swap layout | Async rune sell offer | `ord` issue [#4290](https://github.com/ordinals/ord/issues/4290) |
| Seller-side verification | `ord wallet offer accept` checklist | `ord` `src/subcommand/wallet/offer/accept.rs` |
| Listing book HTTP surface | `POST /offer`, `GET /offers` | `ord` `src/subcommand/server.rs` |
| Rune prepare (split) | `ord wallet split` semantics | `ord` PR #4030, docs PR #4062 |
| Order propagation | NIP-100 kinds 60018 / 60019 / 5 | `ordersproject/nips` |
| Two-call listing creation | unsigned PSBT → sign → submit | Magic Eden BTC API recipe |
| Payout rail | NIP-47 (NWC) | `nostr-protocol/nips` 47 |

---

## 2. Asset-class matrix

| | Inscriptions | Bitmap | Runes | BRC-20 |
|---|---|---|---|---|
| **Status** | ✅ works | ✅ works (identical rail) | ⚠️ works with prepare | ⚠️ works with heavier prepare |
| **Listable unit** | inscription UTXO | district inscription UTXO | rune-holding UTXO (a **lot**) | transfer-inscription UTXO |
| **Wire format** | 2-dummy (§6.1) | 2-dummy (§6.1) | runestone-free (§6.2) | 2-dummy (§6.1) |
| **Seller sighash (v1)** | `SINGLE\|ANYONECANPAY` | `SINGLE\|ANYONECANPAY` | `SINGLE\|ANYONECANPAY` | `SINGLE\|ANYONECANPAY` |
| **Seller input idx** | 2 | 2 | 1 | 2 |
| **Seller payment out idx** | 2 | 2 | 1 | 2 |
| **Buyer asset out idx** | 1 | 1 | **0** | 1 |
| **Buyer dummies required** | 2 | 2 | no | 2 |
| **PREPARING needed** | never | never | only for partial amounts | **always** |
| **Prepare cost** | — | — | 1 tx + confirmation | commit+reveal (2 tx) + confirmation |
| **Ownership authority** | Bitcoin + ord index | **indexer consensus only** | rune indexer | BRC-20 indexer |
| **Snipe exposure** | yes (production) [reported] | yes | yes | yes (AsiaCCS 2025) [verified] |

### 2.1 Bitmap is not a separate rail

A bitmap district is a plain text inscription of the form `{block-height}.bitmap`, claimed
first-come-first-served. [verified] It therefore rides the *identical* PSBT path as any inscription
with zero protocol changes. Everything that differs is semantic, and is handled in the deed
(§8.4), not in the transaction.

---

## 3. The lot model

**RuneBolt lists UTXOs, not balances.** This is the single most load-bearing modelling decision in
the spec and it is forced by the sighash algebra (§6.2.2), not chosen for convenience.

A **lot** is:

```
Lot {
  location:   "<txid>:<vout>"     // the UTXO. THIS is the listed thing.
  priceSats:  <integer>           // asking price in sats, excluding postage
}
```

There is no `amount` field in a listing. The amount is **derived** from a named indexer's view of
that location, and **re-validated at buy time** by both parties (§7). This mirrors the shape every
production marketplace independently arrived at. [verified — Magic Eden BTC create-listing recipe
takes `utxos: [{ location, priceSats }]` and has no amount field]

Consequences that MUST be honoured:

- **A listing that references a spent location is dead**, not repriced. Spend detection cancels.
- **Amounts displayed in a UI are indexer-attributed, not protocol facts.** They carry the indexer
  name, version and block height (§8.3).
- **Divisibility:** lots cannot be split into non-integer amounts. When splitting produces a
  remainder, the **last lot absorbs the indivisible remainder**. [verified — ME help centre,
  recovered via search extraction; R12 applies — re-verify before quoting externally]
- **Mixed UTXOs are not listable** (multiple rune IDs, or runes co-located with an inscription).
  Rejected at listing time with `E_MIXED_UTXO` (§7.2), surfaced to the user as a *split required*
  prompt rather than a failure. [verified — Unisat docs: mixed UTXOs "cannot be listed or
  transferred"]

---

## 4. Listing lifecycle

The premise "the seller signs one PSBT and walks away" holds for **inscriptions and bitmap only**.
For both fungible classes the listable UTXO must be *manufactured first*, on-chain, with a
confirmation wait. `PREPARING` is therefore a **first-class state**, not an implementation detail.

```
  DRAFT ──▶ PREPARING ──▶ READY ──▶ LISTED ──┬──▶ SOLD
              (on-chain,                     ├──▶ CANCELLED
               confirm-wait)                 └──▶ EXPIRED
      └──────────────────────▲
        (skipped when a conforming lot already exists)
```

### 4.1 State definitions

| State | Meaning | Exits |
|---|---|---|
| `DRAFT` | Seller has chosen an asset and a price. Nothing signed, nothing broadcast. | → `PREPARING` if a conforming lot must be manufactured; → `READY` otherwise |
| `PREPARING` | A prepare transaction has been broadcast and is awaiting confirmation. Resumable. | → `READY` on confirmation; → `DRAFT` on drop/replace; → `FAILED_PREPARE` on permanent failure |
| `READY` | A conforming, unspent lot exists. Nothing is signed yet. | → `LISTED` when the seller signs the offer PSBT |
| `LISTED` | A signed offer PSBT exists and has been published to one or more books. | → `SOLD`, `CANCELLED`, `EXPIRED` |
| `SOLD` | The swap transaction is confirmed on L1. | terminal |
| `CANCELLED` | Seller published a BIP-322 cancellation deed (§8.5), and/or spent the lot to self. | terminal |
| `EXPIRED` | `expiresAt` passed. Books MUST stop serving the offer. | terminal |

`SOLD` is defined by **confirmation**, not broadcast. Between broadcast and confirmation the
purchase is snipeable (§9), so no surface may report `SOLD` from a mempool sighting alone.

### 4.2 Prepare requirement, per asset class

| Case | Prepare | Why |
|---|---|---|
| Inscription, bitmap | **none** | The inscription already occupies a UTXO. `DRAFT → READY → LISTED`. |
| Rune, exact-balance UTXO already exists | **none — detect and skip** | A lot conforming to the requested amount already exists. |
| Rune, partial amount | **one split tx** | `ord wallet split` semantics. |
| BRC-20 | **always: commit + reveal** | The listable asset is a transfer inscription that does not yet exist. |

Detecting the skip case is mandatory. A seller who already holds an exact-balance lot MUST NOT be
charged a prepare transaction.

### 4.3 `PREPARING` contract

`PREPARING` MUST expose, before the seller commits to it:

- `estimatedFeeSats` — total prepare cost
- `estimatedWait` — confirmation expectation at the chosen fee rate
- `prepareTxid` — resumable handle, durable across process restarts and client sessions

and MUST be **pollable and subscribable**. An agent calling the SDK must never be forced to block a
call for a confirmation. A dropped or RBF-replaced prepare returns the listing to `DRAFT` with the
reason attached; it does not silently retry.

### 4.4 Rune prepare — split

Adopt `ord wallet split` semantics rather than writing a splitter. [verified — merged in PR #4030,
documented in #4062; the implementation already validates per-output dust thresholds, runestone
payload size against `MAX_STANDARD_OP_RETURN_SIZE`, rune shortfall, and zero-value outputs]

The split transaction *does* carry a runestone with edicts. This is safe because the seller controls
every output of their own split. It is a **separate, confirmed transaction**; the swap transaction
that follows carries no runestone at all (§7.2, `E_RUNESTONE_PRESENT`).

### 4.5 BRC-20 prepare — transfer inscription

BRC-20 balances are split into **Available** and **Transferable**. [verified — Unisat docs] Moving
tokens requires inscribing a `transfer` inscription for an **exact amount** to the seller's own
address (commit + reveal = two transactions), which moves that amount Available → Transferable and
creates the UTXO that is actually listable. A transfer inscription is single-use and amount-fixed;
a different amount needs a different inscription.

Unisat's **Single-Step Transfer** does not remove this step for listings. It fuses inscribe+send
into one user action for a *known recipient*; an open listing has no recipient at listing time.
[inferred, high confidence] Its indexer-consensus treatment is also undocumented, so the BRC-20
listing path MUST NOT be built on it (R9).

---

## 5. Roles

| Role | Holds keys | Trusted with assets | Required |
|---|---|---|---|
| **Seller** | yes | own | yes |
| **Buyer** | yes | own | yes |
| **Book** | no | never | no — a listing is valid without any book |
| **Indexer** | no | never | yes, for asset attribution only |
| **Venue** (e.g. Nexus) | no | never | no |

No role other than seller and buyer signs anything in the settlement path.

---

## 6. Wire formats

All layouts are stated as **index contracts**. Index positions are load-bearing: violating them is
not a validation error at the Bitcoin layer, it is a silent transfer of value to the wrong party.

### 6.1 Inscriptions, bitmap, BRC-20 — 2-dummy layout

Adopted verbatim from `ord` #4291 PSBT Format **v2** and `me-foundation/msigner`. [verified —
source read of `msigner/src/constant.ts` and `src/signer.ts`]

```
 idx │ INPUT                                  │ OUTPUT
─────┼────────────────────────────────────────┼──────────────────────────────────────────────
  0  │ buyer dummy UTXO #1  (SIGHASH_ALL)     │ buyer dummy-recombine
     │                                        │   value = dummy1 + dummy2 + <ordinal sat offset>
  1  │ buyer dummy UTXO #2  (SIGHASH_ALL)     │ ASSET → BUYER  (postage, default 10 000 sat)
  2  │ SELLER ASSET UTXO                      │ SELLER PAYMENT
     │   SIGHASH_SINGLE|ANYONECANPAY          │   value = priceSats + postage
  3+ │ buyer funding UTXOs  (SIGHASH_ALL)     │ platform fee (optional), 2 fresh dummies, change
```

Constants, from msigner: [verified]

```
SELLER_SIGNATURE_INDEX = 2
BUYER_RECEIVE_INDEX    = 1
PLATFORM_FEE_INDEX     = 3
DUMMY_UTXO_VALUE       = 600      // default
DUMMY_UTXO_MIN_VALUE   = 580
DUMMY_UTXO_MAX_VALUE   = 1000
ORDINALS_POSTAGE_VALUE = 10000
```

**Why the dummies exist.** `SIGHASH_SINGLE` signs the output at the *same index* as the signing
input. The seller's input sits at index 2 so that the output it commits to is index 2 — the
seller's payment. The two dummies exist purely to push indices into alignment. [verified from
constants and code; the alignment rationale is [inferred] but is the only reading consistent with
the constants]

**Sat-offset arithmetic.** Output 0 adds the ordinal's offset within its source UTXO
(`location.split(':')[2]`) to the dummy-recombine value, so the inscription lands at **offset 0** of
output 1. Getting this wrong sends the inscription to the wrong output or burns it into fees.
[verified — msigner] msigner explicitly keeps inscriptions at offset `0` with 10k postage to prevent
the ordinal "being accidentally included as other programs' dummy UTXOs, or burn into miner fees."

**Seller payment value = `priceSats + postage`.** The postage rides along with the asset and must be
added back to the seller's payment output, or the seller silently underprices by the postage amount.
[verified — `ord` `offer/create.rs` builds output 1 as `self.amount + postage`]

**Dummy regeneration.** Every purchase MUST emit two fresh dummy UTXOs in the 580–1000 sat band back
to the buyer, so the buyer remains able to buy again. [verified — msigner does this] A buyer with
fewer than two conforming dummies cannot transact at all (R11), so the SDK MUST ship an auto-create
helper and a specific error (§7.2, `E_NO_DUMMY_UTXOS`) rather than a generic funding failure.

#### 6.1.1 The full arrangement exists before the seller signs

**Normative.** A seller offer MUST be signed against the *complete* layout above — at least three
inputs and three outputs, with the seller's input and payment both at index 2 — even though no buyer
exists yet. The buyer's side is stood in for by **placeholders** that the buyer replaces.

This is forced, not stylistic. `SIGHASH_SINGLE` selects the output at the *signing input's* index,
so a seller who signs while their input sits at index 0 has signed a commitment to output 0 — and
when the buyer later inserts the two dummies, the seller's input moves to index 2 while their
signature still refers to output 0. The signature is then either invalid or, worse, valid over an
output that belongs to the buyer. The alignment cannot be created after the fact; it has to be true
at signing time.

What the buyer may change is fixed by the sighash flags and by nothing else:

- `ANYONECANPAY` commits to no other input, so inputs 0, 1 and 3+ may be replaced wholesale.
- `SIGHASH_SINGLE` commits to no other output, so outputs 0, 1 and 3+ may be replaced wholesale.
- Input 2, output 2, the transaction version, the locktime and the seller input's sequence are
  covered by the signature and MUST be carried over byte-for-byte.

Placeholders SHOULD be a deterministic, published identity rather than an arbitrary address, so that
a book, a verifier or a human can tell an unconsumed offer from a completed swap. An implementation
MUST NOT publish an offer whose placeholders remain in the *seller's* control: a placeholder the
seller owns makes the seller's simulated balance delta (§7.2 step 3) wrong, which disables the one
generic defence in the system.

### 6.2 Runes — runestone-free layout

Adopted from `ord` #4290. [verified — issue fetched]

```
 idx │ INPUT                                  │ OUTPUT
─────┼────────────────────────────────────────┼──────────────────────────────────────────────
  0  │ buyer input(s)       (SIGHASH_ALL)     │ RUNES → BUYER          ← MUST be index 0
  1  │ SELLER RUNE UTXO                       │ SELLER PAYMENT
     │   SIGHASH_SINGLE|ANYONECANPAY          │   value = priceSats + input value
  2+ │ buyer funding        (SIGHASH_ALL)     │ buyer change
```

**No runestone. No OP_RETURN. Ever, in the swap path.**

#### 6.2.1 Why no runestone is needed

The Runes specification states: *"If the `Pointer` field is absent, unallocated runes are
transferred to the first non-`OP_RETURN` output."* [verified — docs.ordinals.com/runes/specification]
A runestone-free swap transaction is therefore legal, cheap and deterministic: all input runes land
on output 0, which is the buyer. Index alignment holds independently (seller input 1 ↔ seller
payment output 1).

Two structural rules fall out immediately, both enforced as named invariants in §7.2:

- **Output 0 MUST be the buyer's rune-receive output.** A platform-fee output, a dummy, or change at
  index 0 silently takes the entire rune balance. There is no error message from Bitcoin, from the
  indexer, or from the wallet. [inferred, high confidence — R3]
- **A malformed runestone creates a cenotaph, and per spec "all runes input to a transaction
  containing a cenotaph are burned."** [verified] The seller is still paid (their payment output is
  what they signed), so this is buyer-side risk — which is exactly why the *buyer-side builder* must
  never emit a runestone in the swap path (R10).

#### 6.2.2 Why partial balances cannot be sold in one PSBT

This is the reason for the entire lot model, so it is stated explicitly rather than asserted.

To sell 3,000 of a 10,000-rune UTXO inside the swap transaction, you would need an **edict**
splitting the balance (3,000 → buyer, 7,000 → seller). Edicts live in an OP_RETURN runestone output.
But `SIGHASH_SINGLE|ANYONECANPAY` commits the seller to exactly two things: their own input, and the
single output at the same index — their payment. It commits to **nothing else**: not the output
count, not the other outputs, not any OP_RETURN.

The buyer finalizes the transaction, so the buyer controls the runestone. A malicious buyer writes
an edict (or a `Pointer`) assigning all 10,000 runes to themselves and pays for 3,000. The seller's
rune-change output is not covered by their signature. The seller is paid the listed price and loses
the remainder, with no cryptographic recourse. `SIGHASH_SINGLE` cannot express *"and also this
second output must exist."*

> **A partial-balance rune sale is safe only if the split has already happened, so that the listed
> UTXO holds exactly the amount for sale and no runestone is needed in the swap transaction.**

[inferred — but follows directly from verified sighash and Runes semantics] Every production
marketplace independently arrived at the same two-transaction flow: `ord` docs ("to create an offer
for a non-exact balance, you must first send that balance to yourself and wait for the transaction
to be confirmed") [verified], Magic Eden's lot/split tooling, and Unisat's in-wallet splitter
[verified]. This is not a missing feature. It is a consequence of the sighash algebra.

### 6.3 Sighash-agnostic listing envelope

The listing envelope (§8.1) carries `sighashMode` as an explicit field. v1 ships `SINGLE_ACAP`.
A protected mode (§9.3) ships in v1.x as an additional enum value with no wire break. Implementations
MUST reject unknown `sighashMode` values rather than assuming `SINGLE_ACAP`.

---

## 7. Invariants and errors

Every rule below is normative and has a named error. An implementation that violates an invariant
silently is out of spec. Rules marked **SILENT-LOSS** have no natural failure signal — they must be
asserted in code and covered by a test that deliberately constructs the violation.

### 7.1 Invariant table

| # | Invariant | Error | Class |
|---|---|---|---|
| I-1 | Runes: buyer rune-receive output is at index 0 | `E_RUNE_OUTPUT_INDEX` | **SILENT-LOSS** |
| I-2 | Runes: swap tx contains zero runestones and zero OP_RETURN outputs | `E_RUNESTONE_PRESENT` | **SILENT-LOSS** (cenotaph burns all input runes) |
| I-3 | Listing rejected if the lot is a mixed UTXO (multiple rune IDs, or runes + inscription) | `E_MIXED_UTXO` | listing-time |
| I-4 | Inscriptions/bitmap/BRC-20: seller input index == seller payment output index == 2 | `E_INDEX_MISALIGNED` | **SILENT-LOSS** |
| I-5 | Inscriptions/bitmap/BRC-20: asset→buyer output is at index 1 with exact sat offset preserved | `E_SAT_OFFSET` | **SILENT-LOSS** |
| I-6 | Seller payment output value == `priceSats + postage` | `E_PAYMENT_VALUE` | assert |
| I-7 | Buyer holds ≥2 dummy UTXOs in [580, 1000] sat | `E_NO_DUMMY_UTXOS` | precondition |
| I-8 | Every purchase emits 2 fresh dummy UTXOs back to the buyer | `E_DUMMY_NOT_REGENERATED` | assert |
| I-9 | Exactly one PSBT input is owned by the signer | `E_MULTIPLE_OWNED_INPUTS` | verifyOffer |
| I-10 | The owned input's asset set matches the asserted asset exactly | `E_ASSET_MISMATCH` | verifyOffer |
| I-11 | Simulated net balance delta == asserted price | `E_BALANCE_DELTA` | verifyOffer |
| I-12 | Counterparty inputs are signed; own input is unsigned | `E_SIGNATURE_STATE` | verifyOffer |
| I-13 | Inscription offers: the owned input contains zero runes | `E_RUNES_IN_INSCRIPTION_OFFER` | verifyOffer |
| I-14 | Inscription offers: the owned input contains exactly one inscription, equal to the asserted one | `E_INSCRIPTION_COUNT` | verifyOffer |
| I-15 | The referenced lot is unspent at buy time | `E_LOT_SPENT` | buy-time |
| I-16 | The lot's indexer-reported contents at buy time match those at listing time | `E_LOT_DRIFT` | buy-time |
| I-17 | `sighashMode` is a recognised enum value | `E_UNKNOWN_SIGHASH_MODE` | parse |
| I-18 | Listing has not passed `expiresAt` | `E_EXPIRED` | serve-time |
| I-19 | The seller signature's sighash flags match the envelope's `sighashMode` — `SINGLE_ACAP` means `0x83` | `E_SIGHASH_MISMATCH` | verifyOffer |

I-19 is separate from I-12 on purpose. I-12 asks *who has signed*; I-19 asks *what they signed
over*. A seller signature made with `SIGHASH_ALL` leaves the signature state perfectly correct and
the offer completely unusable — the buyer cannot add a single input without invalidating it — while
`SIGHASH_NONE` leaves the seller's own payment output uncommitted. Both were previously reported as
`E_SIGNATURE_STATE`, which told an integrator to look at the wrong thing. The flags MUST be read
from the signature itself, not from the PSBT's unsigned `sighashType` field: that field is a request
to the wallet, and the whole point of the check is that wallets ignore it (§11.1).

I-13 mirrors `ord`'s own refusal: `ensure!(runes.is_empty(), "outgoing input {} contains runes")`.
[verified — `offer/accept.rs`] Note that this is also why `ord wallet offer accept` cannot be reused
for the rune path (R8).

### 7.2 `verifyOffer()` — mandatory, both sides

`verifyOffer()` is **not optional and not advisory**. Both parties run it before signing, and the
signing call site is the only place it may be invoked from. It is a direct port of `ord`'s
`offer/accept.rs` checklist. [verified — source read]

1. Exactly **one** PSBT input is owned by the signer (`outgoing.len() <= 1`). → I-9
2. That input's **asset set matches the asserted asset exactly**: ≤1 inscription; for runes,
   exactly one rune ID with the asserted amount; for inscription offers, zero runes. → I-10, I-13, I-14
3. **Net balance delta equals the asserted price.** Simulate the unsigned transaction against the
   signer's wallet and require `balance_change == assertedAmount`. → I-11
4. Counterparty inputs signed, own input **unsigned**. → I-12
5. `dryRun` mode returning the txid and a human-readable diff, signing nothing.

> **Step 3 is the single strongest safety primitive available.** It is what stops malicious output
> rearrangement generically, including attacks nobody has enumerated yet. Every other check is a
> specific defence; this one is structural. It MUST NOT be made optional, sampled, or skipped for
> latency.

### 7.3 Pre-sign lint

Ported from Unisat's own wallet signing-screen warnings, which are effectively a free spec.
[verified — Unisat changelog v1.2.9] The lint runs after `verifyOffer()` and surfaces warnings to a
human; it does not block programmatically:

- `SIGHASH_NONE` present anywhere in the PSBT
- asset-burn risk (inscription / BRC-20 / ARC-20 could be destroyed)
- mixed-asset transaction (inscriptions, BRC-20 and ARC-20 combined)
- inscription merge, or inscription output value change
- dust or fee-rate anomalies

### 7.4 Indexer notes

- **Cursed inscriptions are tradeable.** The indexer must handle negative inscription numbers.
  [verified — Unisat added explicit marketplace support] Not a blocker; a data-typing trap.
- **Multi-inscription UTXOs are rejected at listing time**, matching `ord`'s behaviour. → I-3

---

## 8. Listings, deeds and cancellation

### 8.1 Listing envelope

The envelope is the artifact that is published. It is self-contained and independently verifiable —
a listing does not depend on the book that served it.

```jsonc
{
  "v": 1,
  "assetClass": "inscription" | "bitmap" | "rune" | "brc20",
  "sighashMode": "SINGLE_ACAP",          // enum; see §6.3. Reject unknown values.
  "lot": {
    "location": "<txid>:<vout>",
    "priceSats": 250000
  },
  "psbt": "<base64>",                     // seller-signed offer PSBT
  "maker": {
    "address": "<seller address>",
    "publicKey": "<hex>",
    "receiveAddress": "<sats payout address>"
  },
  "expiresAt": "<RFC3339>",
  "attribution": { /* §8.3 */ },
  "disclosure": { /* §8.4, bitmap only */ }
}
```

Notes:

- `assetClass` is declared, but MUST be re-derived from the lot by the verifier. A declared class is
  a hint, never a trusted input.
- No `amount` field, by design (§3).
- `psbt` is a complete offer: a buyer can construct and broadcast the swap from the envelope alone.

### 8.2 Deeds — BIP-322

A **deed** is a BIP-322 signed message asserting control of a key at a point in time. Deeds are used
for listing authorship, cancellation (§8.5), and off-chain attestations of ownership.

BIP-322 is well supported today and deeds are viable now: Unisat (`bip322-simple`), Xverse
(`MessageSigningProtocols.BIP322`), Leather (p2tr), Sparrow ≥1.7.8, `rust-bitcoin/bip322`
(P2TR/P2WPKH/P2SH-P2WPKH), Bitcoin Knots 28.1. [verified]

**Scope the claim precisely.** A deed proves **key control of a UTXO at a point in time**. It does
*not* prove protocol-level validity — bitmap district legitimacy, rune indexer agreement, or BRC-20
balance. Conflating the two is how a "proof" becomes a liability. The schema therefore separates
them structurally: signed fields versus attributed fields.

```jsonc
{
  "signed": {                             // covered by the BIP-322 signature
    "v": 1,
    "type": "listing" | "cancel" | "attestation",
    "location": "<txid>:<vout>",
    "address": "<signer address>",
    "issuedAt": "<RFC3339>",
    "nonce": "<hex>"
  },
  "signature": "<BIP-322>",
  "attributed": { /* §8.3 — NOT covered by the signature */ }
}
```

### 8.3 Attribution block — indexer-attributed fields

Every field describing what a UTXO *contains* is an indexer opinion and MUST carry its provenance.
These fields are **outside** the signed payload: signing them would imply the signer vouches for
them, which they cannot.

```jsonc
"attributed": {
  "indexer":      "ord",                  // implementation name
  "indexerVersion": "0.24.1",
  "blockHeight":  912345,                 // height at which the view was taken
  "observedAt":   "<RFC3339>",
  "contents": {
    "inscriptions": ["<inscription id>"],
    "runes":        [{ "runeId": "1:0", "amount": "10000" }],
    "brc20":        [{ "ticker": "ordi", "amount": "1000", "kind": "transfer" }]
  }
}
```

Two indexers can legitimately disagree — most acutely for bitmap, where ownership is **indexer
consensus, not Bitcoin consensus** (R4). Duplicate claims are void and inscriptions of future blocks
made before those blocks existed are not indexed. [reported, consistent with the bitmap gitbook's
first-to-inscribe framing] A marketplace can therefore list an inscription that one indexer
considers the valid district and another does not. Naming the indexer and version is the honest
minimum.

### 8.4 Bitmap scope disclosure

Bitmap listings MUST carry an explicit scope disclosure. Without it, the UI implies a sale includes
things it does not, and disputes follow (R5).

```jsonc
"disclosure": {
  "districtInscriptionId": "<id>",
  "parcelsIncluded": false,               // parcels are separate inscriptions in separate UTXOs
  "parcelCountAtListing": 12,             // attributed, informational
  "contentLibraryIncluded": false,
  "note": "Sale transfers the district inscription only."
}
```

**Parcels and children do not travel with the district.** Bitmap Phase 2 introduced Parcel
Inscriptions; parcels are child inscriptions under `ord` provenance, and ord's rule is that a child
carries tag 3 with the parent's serialized inscription ID and *"to be recognized as a child, the
parent inscription must be spent as one of the inputs of the inscription transaction."* [verified —
ord provenance docs] Therefore:

- Selling a district transfers the **district inscription** only. Already-inscribed parcels live in
  separate UTXOs and remain with the seller unless separately sold.
- The buyer acquires the **future right to inscribe children**, because they now hold the parent to
  spend.
- An `index.bitmap` front-page and a content library of children may exist and may be economically
  material. Whether they are included is a disclosure, not an inference.

### 8.5 Cancellation

**Cancellation is a BIP-322 signed message, not an on-chain transaction.** This mirrors Magic Eden's
cancel-by-signed-message pattern [verified — ME API surface] and pairs naturally with deeds.

Two mechanisms, with different guarantees, and the difference MUST be stated in the UI:

| Mechanism | Cost | Guarantee |
|---|---|---|
| **Deed cancel** (`type: "cancel"`, §8.2) | free | Cooperating books stop serving the offer. A book that ignores it, or a buyer who already holds a copy of the signed PSBT, can still attempt the swap. |
| **Send-to-self** (spend the lot) | one tx + fee | **Trustless.** The offer PSBT's input is spent and the swap can never confirm. This is the only cancellation that does not depend on anyone's cooperation. |

A deed cancel is a *request*; a send-to-self is *the truth*. Any surface that presents deed cancel as
final is out of spec. Propagate deed cancels as NIP-100 kind-5 `delete_order` (§10.2).

---

## 9. Sniping — disclosure and the path to protection

### 9.1 The exposure, stated plainly

Open `SIGHASH_SINGLE|ANYONECANPAY` listings are **actively exploited in production**, across both
asset families: ordinals (journalistic reporting plus marketplace countermeasures) [reported] and
BRC-20 (AsiaCCS 2025 / arXiv 2501.11942, validated on regtest against Magic Eden, Unisat, Gate.io
and OKX flows) [verified].

Mechanism: once a buyer broadcasts the completed swap, the transaction sits unconfirmed in the open
mempool. Because the seller's signature is `SINGLE|ANYONECANPAY`, it commits only to the seller's
input and the seller's payment output. A third party can therefore replace the transaction with a
higher-fee variant substituting themselves as the buyer.

**The victim is the legitimate buyer**, not the seller. The seller still gets paid — their payment
output is exactly what their signature covers. [inferred from sighash semantics, consistent with all
reporting] This is counter-intuitive and MUST be stated that way in the SDK docs and in any listing
UI, because a naive reading suggests the seller is at risk.

### 9.2 What v1 does

- **Discloses the exposure** in the SDK surface and in every buying UI, naming the buyer as the party
  at risk.
- **Never claims snipe-proof.** RuneBolt v1 is trustless and is not immune to mempool sniping. Both
  halves must appear together.
- **Ships cheap partial mitigations:** short default expiry and tight fee-rate bands, which narrow
  the window and the profit margin without changing the wire format.
- **Does not report `SOLD` on broadcast** — only on confirmation (§4.1).

### 9.3 What v1.x adds — protected mode

v1's job is to make protection a *later flag*, not a *later fork*.

The listing envelope carries `sighashMode` (§6.3). A protected mode adds a value — coordinator-
assisted, **all signatures `SIGHASH_ALL`** — which is the route Magic Eden took with "Total Mempool
Protection" (Tapscript + Schnorr + multi-transaction coordination). [reported] Because all
signatures cover the whole transaction, replacement is impossible; the cost is that the buyer must
be known before the seller signs, which requires a coordination round-trip and reintroduces a
liveness dependency on a coordinator — though **not** a custody dependency.

Private / direct-to-pool broadcast (Mintify's "stealth transactions") is a further option, at
roughly 250% fee markup and a 2–6h confirmation window. [reported] Costly enough to be a user
choice, not a default.

> **v1 architecture decision, v1.x implementation.** No wire-format break is permitted to introduce
> protected mode. If one becomes necessary, the envelope design in §8.1 has failed and should be
> revisited before v1 ships.

---

## 10. Interop surfaces

### 10.1 ord-compatible HTTP

Mirror `ord`'s shipped listing-book primitive rather than inventing a listing envelope for the
minimal case. [verified — `ord` `src/subcommand/server.rs`, gated by `--accept-offers`]

| Route | Body | Notes |
|---|---|---|
| `POST /offer` | raw base64 PSBT | Validates deserialization, inserts into the book |
| `GET /offers` | — | JSON `{ offers: [base64, ...] }` |

Any `ord --accept-offers` node can therefore exchange listings with RuneBolt for the inscription
case, for free. RuneBolt's richer envelope (§8.1) is served on its own route; the ord-compatible
routes carry the bare PSBT.

### 10.2 Nostr propagation — NIP-100, extended

Adopt NIP-100's shape and cancel semantics. [verified — `ordersproject/nips` 100]

| Kind | Meaning |
|---|---|
| `60018` | `set_order` — publish listing (PSBT in `data`) |
| `60019` | `take_order` — carries `psbtRawFinal` + `txId` |
| `5` | `delete_order` — cancellation |

NIP-100 today covers **ordinals and BRC-20 only, with no runes support**. Extending the product-type
enum to cover **runes and bitmap** is RuneBolt's contribution upstream, not a private fork. The
kind-5 cancel pattern maps cleanly onto deed cancellation (§8.5).

### 10.3 Two-call listing creation

Mirror the Magic Eden pattern for familiarity: **request unsigned PSBT → sign → submit signed**.
[verified — ME BTC runes listing recipe] Signing is `SIGHASH_SINGLE | SIGHASH_ANYONECANPAY` (`3 |
128`) with taproot keypair tweaking and Schnorr signatures.

---

## 11. Wallet integration

| Wallet | Per-input `SINGLE\|ANYONECANPAY` | BIP-322 | v1 status |
|---|---|---|---|
| **Unisat** | ✅ `signPsbt(psbtHex, { toSignInputs: [{ sighashTypes: number[] }] })` | ✅ `signMessage(msg, "bip322-simple")` | **ship first** |
| **Leather** | ✅ `signPsbt({ hex, allowedSighash: SignatureHash[], signAtIndex })` | ✅ p2tr | **ship first** |
| **Xverse** | ⚠️ **legacy API only** — see below | ✅ `MessageSigningProtocols.BIP322` | ship, legacy path pinned |
| **Sparrow** | ✅ full manual control | ✅ ≥1.7.8 taproot | import/export only, not web-injectable |
| **Magic Eden wallet** | ⚠️ presumed same constraint as Xverse | presumed BIP-322 | **[unverified] — open R1 task (R7)** |

### 11.1 Xverse — pinned to the legacy path

This is verified, easy to get wrong, and will silently ship a broken listing flow if ignored (R6).

The **modern** JSON-RPC `signPsbt` params are exactly `psbt` (base64), `signInputs`
(address → input indexes), `broadcast`. **There is no sighash field.** Sighash is implicitly
`SIGHASH_ALL`. [verified — `@sats-connect/core@0.16.0` `index.d.ts:734-748`]

Per-input sighash exists only on the **legacy** payload type [verified — `index.d.ts:236-249`]:

```typescript
interface InputToSign { address: string; signingIndexes: number[]; sigHash?: number; }
type PsbtPayload = { psbtBase64: string; inputsToSign?: InputToSign[]; broadcast?: boolean; };
```

used by `signTransaction` / `signMultipleTransactions`, both still exported from `sats-connect@4.2.1`.

> **Normative:** to obtain a `SINGLE|ANYONECANPAY` seller signature from Xverse, RuneBolt MUST call
> the legacy `signTransaction` / `signMultipleTransactions` path. The modern
> `wallet.request('signPsbt')` path cannot express the required sighash. BIP-322 is fine on the
> modern path.

### 11.2 Native providers, not one abstraction

Each wallet is driven through its **own** provider. There is a known interop failure driving Unisat
through sats-connect — `secretkeylabs/sats-connect#166`, *"Not finalized — an error occurred while
signing the PSBT using the UniSat wallet."* [reported] A single unified abstraction is not adopted
in v1; it may be revisited once every target wallet is independently proven.

---

## 12. Lightning module boundary

### 12.1 Lightning never settles an asset swap

**Normative, with the reason.** An L1-asset-for-Lightning-payment swap cannot be made atomic with
PSBTs. Atomicity would require a **scripted contract** — HTLC/PTLC with adaptor signatures, or a
submarine swap — which means the seller locks the asset in a Bitcoin contract that the buyer redeems
via an instant Lightning payment. Portal's ordinal atomic-swap demo does exactly this, and describes
it as *"instead of using PSBT."* [reported]

That phrasing is the whole argument: Lightning settlement **replaces** the swap rail rather than
extending it, and imports channel liquidity, timeout handling and reorg semantics into the trade
path. The original design decision — Lightning for receipts, anti-spam and coordination only — is
correct and now evidence-backed. It stays.

The payout module shares only **identity** with the swap rail: the same Bitcoin key can anchor a
BIP-322 deed and own a bitmap. It shares no transaction, no state machine, and no failure mode.
Separate SDK namespace, enforced (§ARCHITECTURE).

### 12.2 NWC (NIP-47) — the programmable rail

Primary choice for agent-native payouts. [verified — NIP-47 spec]

- URI: `nostr+walletconnect://{pubkey}?relay={url}&secret={hex}&lud16={optional}`
- Kinds: info `13194`, request `23194`, response `23195`, notification `23197`
- Methods: `pay_invoice`, `pay_keysend`, `make_invoice`, `lookup_invoice`, `get_balance`,
  `get_info`, `list_transactions`, and `make_hold_invoice` / `settle_hold_invoice` /
  `cancel_hold_invoice`
- Notifications: `payment_received`, `payment_sent`, `hold_invoice_accepted`
- Encryption negotiated; `nip44_v2` preferred over legacy `nip04`
- Per-connection ephemeral keys, independently revocable, with wallet-enforced constraints surfaced
  as `QUOTA_EXCEEDED`, `RATE_LIMITED`, `RESTRICTED`, `INSUFFICIENT_BALANCE`

**Per-app revocable keys with budgets is precisely the authorization model an agent-native payout
system needs**, and the notification channel removes polling.

**Hold invoices are the anti-spam and receipt primitive.** Pay-to-list where the hold is cancelled if
the listing is withdrawn gives non-custodial spam resistance without putting Lightning anywhere near
settlement.

### 12.3 Receive formats and forward compatibility

- **Lightning Address / LNURL-pay** — the *public receive* format. Every consumer wallet understands
  `user@domain`. Costs: the LNURL server sees the payer's IP absent Tor, and the receiver runs web
  infrastructure alongside their node. [reported] Public format, not the internal rail.
- **BOLT12 offers** — forward-looking. Static reusable payment codes with payer/payee privacy via
  onion messages. [reported] **The payout destination MUST be an opaque handle**, so BOLT12 becomes a
  backend swap rather than a rewrite.
- **keysend** — via `pay_keysend`, for spontaneous no-invoice pushes. Weaker proof-of-payment.
  Secondary.

---

## 13. Open risks

Carried forward from R0 research, unchanged. These are tracked, not resolved.

| # | Risk | Severity | Note |
|---|---|---|---|
| R1 | **Snipe exposure is inherent to the chosen sighash.** Buyers can lose purchases to RBF front-running. | **High** | Production-documented for ordinals, academically for BRC-20. Mitigation requires abandoning `SINGLE\|ANYONECANPAY` or private broadcast. Cannot be fully solved in v1. §9 |
| R2 | **Fungible listing UX carries an unavoidable on-chain prepare cost and confirmation wait.** | **High** | Sellers pay fees and wait *before* the listing is live. Every competitor has this — not a differentiator gap, but it kills the "one signature and walk away" pitch for runes/BRC-20. §4 |
| R3 | **Index-0 rune output rule is a silent, total-loss footgun.** | **High** | No error surfaces if violated. Needs an assertion (I-1) plus a test that deliberately misorders outputs. |
| R4 | **Bitmap ownership is indexer consensus, not Bitcoin consensus.** | Medium | Two indexers can disagree on district validity. Disclosed and version-stamped. §8.3 |
| R5 | **Bitmap parcels/children don't travel with the district.** | Medium | Dispute generator if the UI implies otherwise. Explicit scope disclosure. §8.4 |
| R6 | **Xverse modern `signPsbt` cannot express our sighash.** | Medium | Verified from types. Risk is an engineer reaching for the documented-modern path. Pinned. §11.1 |
| R7 | **Magic Eden wallet compatibility unverified.** | Medium | Open task. [unverified] |
| R8 | **`ord` rune sell-offers are unmerged** (#4280 closed, #4282 open). | Medium | We cannot depend on upstream `ord` for the rune listing path; we maintain our own builder and track #4282 in case it lands with different conventions. |
| R9 | **Unisat "Single-Step Transfer" indexer consensus undocumented.** | Medium | Do not build the BRC-20 listing path on it. §4.5 |
| R10 | **Buyer-side cenotaph risk** — a malformed runestone burns all input runes. | Medium | Buyer-side only (seller is paid). Our builder must never emit a runestone in the swap path. I-2 |
| R11 | **Dummy-UTXO precondition blocks first-time buyers.** | Low–Medium | Auto-create helper + specific error. msigner's regenerate-two-per-purchase keeps it self-sustaining. I-7, I-8 |
| R12 | **Magic Eden help-centre articles 404 on direct fetch.** | Low (research hygiene) | Content recovered via search extraction; corroborated by ord docs, ME's API recipe, and Unisat docs. Conclusion is solid; **re-verify the ME article quotes before quoting them externally.** |
| R13 | **Exa MCP unavailable during R0.** | Low | Findings rest on primary sources, which is stronger than search. A follow-up deep-research pass could still surface non-indexed discussion on rune PSBT edge cases. |

---

## 14. Normative references

**Specifications**
- Runes specification — https://docs.ordinals.com/runes/specification.html
- Ordinals provenance — https://docs.ordinals.com/fil/inscriptions/provenance.html
- BIP-322 — https://bips.dev/322/ · https://github.com/rust-bitcoin/bip322
- NIP-47 Nostr Wallet Connect — https://github.com/nostr-protocol/nips/blob/master/47.md
- NIP-100 Orders — https://github.com/ordersproject/nips/blob/master/100.md

**De-facto wire-format standards**
- ord #4290 — Proposed Specification for Asynchronous Rune Sell Offers — https://github.com/ordinals/ord/issues/4290
- ord #4291 — Proposed Specification for Asynchronous Sell Offers for Inscriptions — https://github.com/ordinals/ord/issues/4291
- `me-foundation/msigner` (MIT) — `src/constant.ts`, `src/signer.ts`

**Implementations read**
- `ordinals/ord` @ `849442680e4bba70b180e1d0cfeb3698f0a9c0ff` — `src/subcommand/wallet/offer/{create,accept}.rs`, `split/splitfile.rs`, `src/subcommand/server.rs`
- ord PRs — #4030 Split, #4062 Document split, #4156 Offers, #4408/#4409 offer submission (merged); #4280 Rune offers (closed), #4282 Rune buy offers (open)
- casey/runestone #46 — https://github.com/casey/runestone/issues/46
- `@sats-connect/core@0.16.0` — `dist/index.d.ts`

**Wallet documentation**
- Unisat — https://docs.unisat.io (`llms-full.txt` §signPsbt, §signMessage)
- Xverse — https://docs.xverse.app/sats-connect/bitcoin-methods/signpsbt
- Leather — https://leather.gitbook.io/developers/bitcoin-methods/signpsbt
- sats-connect #166 — https://github.com/secretkeylabs/sats-connect/issues/166

**Security**
- BRC20 Snipping Attack, AsiaCCS 2025 — https://arxiv.org/abs/2501.11942

**Bitmap**
- Bitmap gitbook — https://gitbook.bitmap.land/
- Bitmap Phase 2 / parcels — https://ordinallabs.medium.com/bitmap-phase-2-a-closer-look-dfb512c59893
