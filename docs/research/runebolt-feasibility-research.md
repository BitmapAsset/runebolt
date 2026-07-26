# RuneBolt R0 — Real-World Feasibility Research (Pre-Spec Verdict)

**Date:** 2026-07-26
**Scope:** Does the proposed RuneBolt v1 mechanism (non-custodial PSBT atomic swap + open listing book, BIP-322 deeds, Lightning for receipts/coordination only, agent-native SDK/CLI/MCP) actually work TODAY, per asset class?
**Status:** Research only. No code changes. Input to Wave R1 spec.

---

## 0. Method & tooling note

**Exa MCP tools were NOT available in this session.** `ToolSearch` for `exa`, `deep_researcher_start`, and related names returned no matching deferred tools. Research was therefore conducted with `WebSearch` + `WebFetch`, supplemented by **direct primary-source inspection**, which turned out to be stronger than search for the hard questions:

- `git clone` + source read of `me-foundation/msigner` (Magic Eden's open-source PSBT signer)
- Sparse `git clone` of `ordinals/ord` at master (`849442680e4bba70b180e1d0cfeb3698f0a9c0ff`, 2026-07-15) — read `src/subcommand/wallet/offer/{create,accept}.rs`, `src/subcommand/server.rs`
- `npm pack @sats-connect/core@0.16.0` + TypeScript declaration read (Xverse wallet API surface)
- `docs.unisat.io/llms-full.txt` (full doc corpus, 301KB) and `docs.magiceden.io/llms.txt` + recipe pages
- `gh` API for PR/issue merge states

Claim tags used throughout: **[verified]** = read from primary source (spec text, source code, official docs). **[inferred]** = my reasoning from verified primitives, not stated by a source. **[reported]** = secondary/journalistic source only.

---

## 1. Executive verdict table

| Asset class | Verdict | Key caveat |
|---|---|---|
| **Ordinals / inscriptions** | ✅ **WORKS** | Production-proven. Needs 2 padding ("dummy") UTXOs to align SIGHASH_SINGLE index, and exact sat-offset handling. Listings are actively RBF-sniped in the wild. |
| **Bitmap** | ✅ **WORKS** (identical rail) | Bitmap is a plain text inscription — same PSBT path, zero protocol changes. Ownership is *indexer consensus only*, not consensus-enforced. Parcels/children are separate inscriptions and do NOT travel with the district. |
| **Runes** | ⚠️ **WORKS-WITH-CAVEATS** | **The unit of listing is the UTXO, not an amount.** Partial-balance sales require a *separate, confirmed, on-chain split transaction first*. Cannot be done in one pre-signed PSBT safely. Confirmed by ord docs, Magic Eden, and Unisat independently. |
| **BRC-20** | ⚠️ **WORKS-WITH-CAVEATS** — but needs a mandatory prepare pre-step (i.e. **NEEDS-DIFFERENT-MECHANISM for a one-shot listing flow**) | Seller must inscribe a *transfer inscription* for the exact amount first (commit+reveal = 2 txs, confirmations). Only then is there a UTXO to list. Same snipe exposure (documented academically, AsiaCCS 2025). |
| **Bitcoin/sats payouts over Lightning** | ✅ **WORKS — as a separate module** | Correct primitive is **NWC (NIP-47)** for agent-native programmable payouts, **Lightning Address / LNURL-pay** for interop, **BOLT12** forward-looking. Lightning **cannot** atomically settle an L1 asset swap without a scripted contract (adaptor sigs / HTLC). Keep it out of the swap. |
| **Wallet compatibility** | ⚠️ **WORKS-WITH-CAVEATS** | Unisat ✅ full per-input sighash + BIP-322. Leather ✅ `allowedSighash` + BIP-322 (p2tr). Xverse ⚠️ per-input sighash only via the **legacy** `signTransaction` API — the modern `signPsbt` JSON-RPC method has **no sighash field at all**. |

**Single biggest spec-changing finding:** *For both fungible asset classes, the listable thing is a UTXO, not a quantity.* Every fungible listing needs a **prepare phase that is itself a confirmed on-chain transaction**. RuneBolt v1 must model listing as a two-phase lifecycle (`PREPARING → LISTED`) as a first-class state machine, not an afterthought — otherwise the whole "seller signs one PSBT and walks away" UX premise breaks for Runes and BRC-20.

---

## 2. Ordinals / inscriptions — ✅ WORKS

### 2.1 Maturity: production-proven, multiple independent implementations

The PSBT atomic-swap sale is the *de facto* standard for inscription trading and has been since 2023.

**Magic Eden's `msigner` is open source and readable.** [verified — source read of `github.com/me-foundation/msigner`]

Seller signing, `src/signer.ts:77-78`:
```
bitcoin.Transaction.SIGHASH_SINGLE |
bitcoin.Transaction.SIGHASH_ANYONECANPAY,
```

The **"2-dummy algorithm"** index constants, `src/constant.ts:2-4`:
```typescript
export const BUYING_PSBT_SELLER_SIGNATURE_INDEX = 2; // based on 2-dummy algo
export const BUYING_PSBT_BUYER_RECEIVE_INDEX = 1;    // based on 2-dummy algo
export const BUYING_PSBT_PLATFORM_FEE_INDEX = 3;     // based on 2-dummy algo
export const DUMMY_UTXO_VALUE = Number(process.env.DUMMY_UTXO_VALUE ?? 600);
export const DUMMY_UTXO_MIN_VALUE = Number(process.env.DUMMY_UTXO_MIN_VALUE ?? 580);
export const ORDINALS_POSTAGE_VALUE = Number(process.env.ORDINALS_POSTAGE_VALUE ?? 10000);
```

Finalized transaction layout, read directly from `generateUnsignedBuyingPSBTBase64` (`src/signer.ts:340-500`) [verified]:

| idx | Input | Output |
|---|---|---|
| 0 | buyer dummy UTXO #1 (600 sat) | buyer dummy-recombine: `dummy1 + dummy2 + ordinal sat offset` |
| 1 | buyer dummy UTXO #2 (600 sat) | **inscription → buyer** (10 000 sat postage) |
| 2 | **seller inscription UTXO** (`SINGLE\|ANYONECANPAY`) | **seller payment** |
| 3+ | buyer payment UTXOs (`SIGHASH_ALL`) | platform fee, 2 new dummy UTXOs, change |

**Why the dummies exist:** `SIGHASH_SINGLE` signs *the output at the same index as the signing input*. The seller's input sits at index 2 so the output it commits to is index 2 = the seller's payment. The two 600-sat dummies exist purely to push the indices into alignment. [verified from constants + code; the index-alignment rationale is [inferred] but is the only reading consistent with the constants]

Note the sat-offset arithmetic in output 0: `Number(listing.seller.ordItem.location.split(':')[2])`. The ordinal's offset within its UTXO is added to the dummy-recombine output so the inscription lands at **offset 0** of output 1. Getting this wrong sends the inscription to the wrong output or into fees.

### 2.2 What `ord` itself supports (and doesn't)

**`ord` has merged inscription offers, but they are BUY offers, not seller-side listings.** [verified — source]

`src/subcommand/wallet/offer/create.rs` takes `--inscription` and `--amount`, builds:
- input 0: the seller's inscription outpoint (unsigned)
- output 0: `postage` → buyer's change address (buyer receives the inscription)
- output 1: `self.amount + postage` → seller's address

then funds + signs the *buyer's* inputs via `wallet_process_psbt` (default `SIGHASH_ALL`). Note the seller's output value is **asking price + postage** — the postage rides along and must be added back. [verified]

Merged PRs: `#4156 Offers` (2025-01-11), `#4408 Add offer submission endpoint` (2025-09-16), `#4409 Allow submitting offers with ord wallet offer create` (2025-09-18). [verified via `gh search prs --merged`]

`ord` also ships a **listing-book HTTP surface** — `src/subcommand/server.rs:256-257` [verified]:
```rust
.route("/offer", post(Self::offer))
.route("/offers", get(Self::offers))
```
`POST /offer` accepts a base64 PSBT body, validates it deserializes, and calls `index.insert_offer(offer)`; `GET /offers` (JSON only) returns `{ offers: [base64...] }`. Gated by `server_config.accept_offers`. This is a real, shipped "PSBT listing book" primitive we should interoperate with rather than invent around.

**The seller-side verification checklist in `offer/accept.rs` is the single most valuable thing to copy.** [verified] It enforces:
1. Exactly **one** PSBT input owned by the wallet (`outgoing.len() <= 1`).
2. That input contains **no runes** (`ensure!(runes.is_empty(), "outgoing input {} contains runes")`).
3. That input contains **exactly one inscription**, and it equals the asserted one.
4. `wallet.simulate_transaction(&psbt.unsigned_tx)` → `balance_change == self.amount` — the seller asserts the *net sat delta* and the tool refuses if it differs. **This is the real anti-rug primitive.**
5. Seller's input must be **unsigned**; every buyer input must be **signed**.
6. `--dry-run` support.

### 2.3 Known pitfalls

**RBF / mempool sniping — real, exploited, and it is an attack on exactly our proposed design.** [reported, corroborated across three sources]

> "when you list something on an ordinals marketplace you sign a Partially Signed Bitcoin Transaction (PSBT) … and since the buyer could be anyone that part of the PSBT is signable by anyone using SIGHASH_SINGLE. Once that PSBT is revealed in the open mempool and unconfirmed, savvy users can replace that transaction with a higher-fee one of their own, just with themselves as the 'buyer'."

The victim is the **legitimate buyer** (their purchase is replaced; the sniper gets the asset). The seller still gets paid — their payment output is what `SIGHASH_SINGLE` commits to. [inferred from sighash semantics, consistent with all reporting]

Deployed mitigations:
- **Magic Eden "Total Mempool Protection" / Sniping Protection:** Tapscript + Schnorr + multi-tx coordination such that **all signatures are `SIGHASH_ALL`** — i.e. they *abandoned* `SINGLE|ANYONECANPAY` for protected listings. [reported]
- **Mintify "stealth transactions":** private mempool / direct mining-pool submission; ~2–6h confirmation window, ~250% fee markup. [reported]

Other pitfalls:
- **Padding/dummy UTXO management** is a real UX tax: the buyer must hold ≥2 UTXOs in the 580–1000 sat band, and msigner regenerates two fresh dummies in every purchase to keep the flywheel going. A buyer with no dummies cannot buy. [verified from source]
- **Sat selection / offset:** inscription must be at a known offset; mishandling burns it to fees. msigner explicitly keeps inscriptions "at location offset `0` with postage 10k sats" to prevent the ordinal "being accidentally included as other programs' dummy UTXOs, or burn into miner fees." [verified — README]
- **Cursed inscriptions** are tradeable — Unisat Marketplace added support explicitly. [verified — Unisat changelog] Not a blocker, but the indexer must handle negative inscription numbers.
- **Multi-inscription UTXOs** must be rejected at listing time (ord does exactly this).
- Unisat's wallet signing screen warns on: `SIGHASH_NONE` risks, risk of burning inscriptions/brc20/ARC20, mixing inscriptions/brc20/ARC20 in one transaction, and inscription merges/value changes. [verified — Unisat changelog v1.2.9] That warning list is effectively a free spec for our own pre-sign lint.

---

## 3. Bitmap — ✅ WORKS (same rail, different trust model)

**Bitmap is an ordinals text inscription of the form `{block-height}.bitmap`, claimed first-come-first-served.** [verified — gitbook.bitmap.land] Therefore it rides the *identical* PSBT swap rail as any inscription. No protocol work needed. This is the easiest asset in the set.

The gotchas are not mechanical, they are **semantic**:

1. **Ownership is indexer consensus, not Bitcoin consensus.** Bitmap "is an open-source standard protocol … with the purpose of establishing a consensus on metaverse land," where validity depends on indexers agreeing: duplicate claims are void, and "any inscriptions of future blocks before their existence are considered void and will not be indexed." [reported/secondary, consistent with the gitbook's first-to-inscribe framing] A marketplace can therefore list an inscription that one indexer considers the valid district and another does not. **RuneBolt must name its indexer and version in the listing record.**

2. **Parcels and children do not travel with the district.** Bitmap Phase 2 introduced *Parcel Inscriptions*. Parcels are child inscriptions under ord provenance, and ord's provenance rule is: child inscriptions carry tag 3 with the parent's serialized inscription ID, and **"to be recognized as a child, the parent inscription must be spent as one of the inputs of the inscription transaction."** [verified — ord provenance docs] Consequences for a marketplace:
   - Selling a bitmap district transfers the *district* inscription. Already-inscribed parcels are separate inscriptions living in separate UTXOs and stay with the seller unless separately sold.
   - The buyer acquires the *future* right to inscribe children (they now hold the parent to spend).
   - A `index.bitmap` metaprotocol front-page and a content library of children may exist and be economically material.
   **The listing UI/deed must disclose district vs. parcel vs. content-library scope, or we will ship disputes.**

3. **Reinscription / duplicate-claim disputes** are resolved by indexer rules, not by us. Deeds (BIP-322) prove *key control of the UTXO*, which is the right thing to prove; they do not adjudicate protocol validity. Keep those two claims separate in the deed schema.

---

## 4. Runes — ⚠️ WORKS-WITH-CAVEATS (the hard question, answered)

### 4.1 The swap mechanism itself is sound — for a whole UTXO

The canonical rune sell-offer spec is `ordinals/ord` issue **#4290, "Proposed Specification for Asynchronous Rune Sell Offers"** (joshdoman). [verified — issue fetched]

Sell offer = single input / single output PSBT. Input holds the offered runes; output value = input value + selling price; seller signs `SIGHASH_SINGLE | ANYONECANPAY`. Finalized layout:

```
INPUT  0: buyer's input(s)         OUTPUT 0: RUNE_OUTPUT  (buyer receives runes)
INPUT  1: seller's rune input      OUTPUT 1: BTC_OUTPUT   (seller's payment)
          (SINGLE|ANYONECANPAY)    OUTPUT 2: buyer change
INPUT  2+: buyer funding
```

**Why no OP_RETURN runestone is needed.** From `runestone` issue #46 [verified]: *"Since the completed transaction has no runestone, all input runes transfer to the first output by default"* — the "first-output rule." This is grounded in the Runes spec itself [verified — docs.ordinals.com/runes/specification.html]:

> "If the `Pointer` field is absent, unallocated runes are transferred to the first non-`OP_RETURN` output."

So a runestone-free swap tx is legal, cheap, and deterministic: everything lands on output 0 = the buyer. Index alignment holds (seller input 1 ↔ seller output 1). **This is elegant and it works.** [verified mechanism]

Two structural constraints fall out immediately [inferred, high confidence]:
- **Output 0 must be the buyer's rune-receive output.** Any platform-fee output, dummy output, or change output placed at index 0 silently steals the entire rune balance. This is a footgun with no error message.
- A malformed runestone added by the buyer creates a **cenotaph**, and per spec *"All runes input to a transaction containing a cenotaph are burned."* The seller is still paid (their output is what they signed), so this is buyer-side risk only — but our buyer-side builder must never emit a runestone at all in the swap path.

### 4.2 Partial balances: **cannot** be done in one pre-signed PSBT

This was the critical question. **Answer: no — a separate, confirmed, on-chain split transaction is required first.** Three independent primary sources agree.

**(a) `ord`'s own documentation.** From PR #4280 "Rune Offers (Buy & Sell)" [verified, verbatim]:

> "By default, you may only offer to sell an amount of runes `<DECIMAL:RUNE>` that equals the exact rune balance in a UTXO in your wallet."
>
> "To create an offer for a non-exact balance, you must first send that balance to yourself and wait for the transaction to be confirmed."

With two escape-hatch flags, neither of which avoids the on-chain step:
- `--allow-multiple-utxos` — bundle several *exact-balance* UTXOs as sub-offers summing to the target, priced `AMOUNT / DECIMAL` rounded up to the nearest sat.
- `--allow-partial` — offer the largest exact balance at or below the target.

**(b) Magic Eden requires an explicit user-facing split step.** Runes are traded in **"lots"** (= UTXOs). Their help center: *"In order to list a portion of Runes on Magic Eden, you need to split the lot to other UTXOs"*; the Split tool on the Runes Portfolio page *"allows you to break up the lot and create a new lot that holds a smaller portion"*; and *"you wait until the transaction confirms, and your Runes will now be split."* Also: *"Lots cannot be split into a non-integer, and if you proceed, your last lot would contain any extra indivisible runes."* [verified — ME help center content via search extraction; direct article URLs 404'd, see §7]

**(c) Magic Eden's own API recipe proves the listing unit is the UTXO.** [verified — `docs.magiceden.io/recipes/btc-create-and-submit-runes-listing-order.md`] The create-listing request body:

```javascript
{
  side: "sell",
  rune: firstAvailableUTXO.rune,
  makerRunesPublicKey, makerRunesAddress, makerReceiveAddress,
  utxos: [ { location: firstAvailableUTXO.location, priceSats: listingSatsPrice } ],
  expiresAt
}
```

**There is no `amount` field.** You list a `location` (a UTXO) at a `priceSats`. The amount is whatever that UTXO happens to hold. Signing is `SIGHASH_SINGLE | SIGHASH_ANYONECANPAY` (3 | 128) with taproot keypair tweaking + Schnorr. That is the entire answer to "can you list 3,000 of 10,000 DOG" — not through this interface, no.

**(d) Unisat independently ships the same workaround** in-wallet: *"Splitting Runes — Allow splitting Runes by sending a specified amount to yourself (for Runes that cannot be listed or transferred due to being mixed with others)."* [verified — Unisat docs corpus] Note the parenthetical: **mixed UTXOs cannot be listed at all.** Unisat's split tooling covers auto-split (to one address) and manual split (multiple addresses, custom amounts).

### 4.3 *Why* it cannot work in one PSBT — the security argument

Sources state the requirement but don't explain it. The reason matters for the spec, so here it is explicitly. [inferred — but follows directly from verified sighash and Runes semantics]

To sell 3,000 of a 10,000-rune UTXO inside the swap tx you would need an **edict** splitting the balance (3,000 → buyer, 7,000 → seller), and edicts live in an **OP_RETURN runestone output**. But `SIGHASH_SINGLE|ANYONECANPAY` commits the seller **only** to (i) their own input and (ii) the single output at the same index — their payment. It commits to *nothing else*: not the output count, not the other outputs, not any OP_RETURN.

So the buyer, who finalizes the transaction, controls the runestone. A malicious buyer simply writes an edict (or a `Pointer`) assigning **all 10,000** runes to themselves and pays only for 3,000. The seller's "rune change" output is not covered by their signature, so there is no cryptographic protection. The seller is paid the listed price and loses the remainder.

`SIGHASH_SINGLE` cannot express "and also this second output must exist." Therefore:

> **A partial-balance rune sale is only safe if the split has already happened, so that the listed UTXO holds exactly the amount for sale, and no runestone is needed in the swap tx.**

Pre-splitting converts a *cryptographically unsafe* one-shot into a *safe two-transaction* flow. Every production marketplace independently arrived at this. It is not a missing feature — it's a consequence of the sighash algebra.

### 4.4 What `ord` will and won't do for you today

- **`ord wallet offer accept` explicitly refuses runes.** `offer/accept.rs` [verified, verbatim]: `ensure! { runes.is_empty(), "outgoing input {} contains runes", outgoing, }`. The merged offer flow is inscriptions-only.
- Rune sell offers are **not merged**: PR **#4280 CLOSED** (unmerged), PR **#4282 "Rune buy offers" OPEN**, issue #4290 is a proposal. [verified via `gh`]
- **`ord wallet split` IS merged and shipped** — PR **#4030 "Split"** (2024-10-30), documented in **#4062**. `src/subcommand/wallet/split/splitfile.rs` exists on master; the implementation validates dust thresholds per output, runestone payload size against `MAX_STANDARD_OP_RETURN_SIZE`, rune shortfall, and zero-value outputs. [verified — source]

**Implication:** we cannot simply wrap `ord wallet offer` for runes. But `ord wallet split` gives us the prepare-step primitive for free, with the validation already written.

---

## 5. BRC-20 — ⚠️ WORKS-WITH-CAVEATS, and the one-shot listing flow does NOT work

### 5.1 The two-step transfer model is the whole problem

BRC-20 balances are split into **Available** and **Transferable**. [verified — Unisat docs] Moving tokens requires:

1. **Inscribe a `transfer` inscription** for an *exact amount*, **to your own address** — this moves that amount from Available → Transferable. Inscribing is itself commit + reveal (two transactions).
2. **Send that transfer inscription** to the recipient. The indexer credits the amount to whoever receives it.

The listable asset is therefore **the transfer inscription's UTXO**, not "1,000 of my ORDI." And a transfer inscription is single-use for a fixed amount — a different amount needs a *different* inscription.

The AsiaCCS 2025 paper describes the live marketplace flow consistently [verified — arXiv 2501.11942]: the seller broadcasts selling intent as a partially-signed PSBT; *"a buyer responds to the listing and completes the full signature of the PSBT to finalize the transfer inscription and token transaction."*

So: **BRC-20 works on our rail, but only after a prepare step that is strictly heavier than Runes'** — Runes needs one split tx; BRC-20 needs a commit+reveal inscription pair. Confirmations and inscription fees land on the seller *before* they can list.

### 5.2 Unisat's "Single-Step Transfer" does not rescue the listing flow

Unisat shipped Single-Step Transfer, which *"combines what used to be a two-step process — inscribing a transfer and sending it — into a single, seamless action."* [verified — Unisat docs]

But this is a **wallet UX convenience for direct sends**, not a marketplace primitive: it fuses inscribe+send into one user action for a *known recipient*. A PSBT listing has no known recipient at listing time — that's the entire point of an open book. The seller must still end up holding a signable transfer-inscription UTXO. [inferred, high confidence] Unisat's own docs do not address indexer consensus for this feature, which is a further reason not to build the listing path on it.

### 5.3 BRC-20 snipe exposure is documented academically

**"BRC20 Snipping Attack," AsiaCCS 2025 / arXiv 2501.11942** [verified]: the attack *"targets the BRC20 buying process (i.e., transfer) by injecting a front-running transaction to complete the full signature of the PSBT,"* exploiting fee-based mempool selection to *"snipe the victim transaction, replicate metadata, and front-run the legitimate transaction."* Affected platforms named: **Magic Eden, Unisat, Gate.io, OKX**. Validated on regtest; *"the attacker consistently replaces legitimate transactions by submitting higher-fee PSBTs."* Responsible disclosure was made; the abstract does not publish a mitigation.

This is the same root cause as ordinals sniping. One mitigation strategy covers both.

### 5.4 Verdict nuance

- **As "can BRC-20 be sold via our PSBT rail?"** → yes, WORKS-WITH-CAVEATS.
- **As "does our one-shot listing flow work for BRC-20?"** → **no. NEEDS-DIFFERENT-MECHANISM.** The spec must introduce an explicit `prepare-transfer` step with its own state, cost estimate, and confirmation wait. Treating BRC-20 like an inscription will produce a listing UI that cannot list anything.

---

## 6. Bitcoin/sats payouts over Lightning — ✅ WORKS, as a strictly separate module

### 6.1 Lightning must not be inside the atomic swap — confirmed

An L1-asset-for-LN-payment swap cannot be done with PSBTs alone. Making it atomic requires a **scripted contract** — HTLC/PTLC with adaptor signatures, or a submarine swap. Portal's ordinal atomic-swap demo does exactly this: *"Instead of using PSBT, the seller will lock the asset in a Bitcoin contract and the buyer will be able to redeem it through an instant Lightning network payment."* [reported] Submarine swaps are the general on-chain↔off-chain HTLC bridge. [reported]

Note the phrasing: **"instead of using PSBT."** Adding Lightning settlement means *replacing* the swap rail with a contract-based one, plus liquidity, timeouts, and reorg handling. **The original design decision — Lightning for receipts / anti-spam / coordination only — is correct and is now evidence-backed.** Keep it.

### 6.2 Right primitive for instant sats payouts (metaverse experiences)

For "visitor plays a game on someone's bitmap block, earns sats instantly," the primitives rank as:

**1. NWC — Nostr Wallet Connect (NIP-47) — primary choice for agent-native payouts.** [verified — NIP-47 spec]
- URI: `nostr+walletconnect://{pubkey}?relay={url}&secret={hex}&lud16={optional}`
- Event kinds: info `13194`, request `23194`, response `23195`, notification `23197`
- Methods: `pay_invoice`, `pay_keysend`, `make_invoice`, `lookup_invoice`, `get_balance`, `get_info`, `list_transactions`, plus **`make_hold_invoice` / `settle_hold_invoice` / `cancel_hold_invoice`**
- Notifications: `payment_received`, `payment_sent`, `hold_invoice_accepted`
- Encryption negotiated, `nip44_v2` preferred over legacy `nip04`
- Per-connection ephemeral keys, independently revocable, with wallet-enforced constraints surfaced as `QUOTA_EXCEEDED`, `RATE_LIMITED`, `RESTRICTED`, `INSUFFICIENT_BALANCE`; architecture explicitly supports *"different keys for different applications"* with *"arbitrary constraints (eg. budgets)."*

This is the best fit by a wide margin: **per-app revocable keys with budgets** is precisely the authorization model an agent-native payout system needs, and the notification channel removes polling. The **hold-invoice** methods also give us a clean, non-custodial coordination/escrow primitive for listing anti-spam and receipts — pay-to-list where the hold is cancelled if the listing is withdrawn — without putting Lightning anywhere near settlement.

**2. Lightning Address / LNURL-pay — for interoperability.** Every consumer wallet understands `user@domain`. Cost: the LNURL server sees the payer's IP absent Tor, and the receiver must run web infrastructure alongside their node — extra attack surface and ops burden. [reported] Use it as the *public receive* format, not the internal rail.

**3. BOLT12 offers — forward-looking.** Static reusable payment codes with built-in payer/payee privacy via onion messages; one code per player forever, no invoice-refresh dance. [reported] Migration is expected to be gradual with both coexisting, and some implementations resolve Lightning Addresses to BOLT12 offers. [reported] **Recommendation: design the payout interface so the destination is an opaque handle, then BOLT12 is a backend swap, not a rewrite.**

**4. keysend** — available via NWC `pay_keysend`, useful for spontaneous no-invoice pushes (podcasting-2.0 style streaming sats) but weaker on proof-of-payment. Secondary.

**Composition verdict:** the payout module shares only *identity* with the swap rail (the same Bitcoin key can anchor a BIP-322 deed and own a bitmap). It shares no transaction, no state machine, no failure mode. Keep them as separate modules behind separate SDK namespaces. ✅

---

## 7. Wallet compatibility matrix

| Wallet | PSBT signing | Per-input `SIGHASH_SINGLE\|ANYONECANPAY` | BIP-322 sign | Can our web page hand it a listing PSBT today? |
|---|---|---|---|---|
| **Unisat** | `unisat.signPsbt(psbtHex, opts)` | ✅ **Yes** — `toSignInputs[].sighashTypes: number[]` | ✅ **Yes** — `signMessage(msg, "bip322-simple")` | ✅ **Yes, best support** |
| **Leather** | `signPsbt({hex, ...})` | ✅ **Yes** — `allowedSighash: SignatureHash[]`, `signAtIndex` | ✅ **Yes** — BIP-322 used for ordinals/p2tr addresses | ✅ Yes |
| **Xverse** | sats-connect | ⚠️ **Legacy API only** — see below | ✅ Yes — `protocol: MessageSigningProtocols.BIP322` | ⚠️ Yes, but must use the legacy call |
| **Magic Eden wallet** | sats-connect-compatible provider | ⚠️ Presumed same constraint as Xverse | Presumed BIP-322 | [inferred] — **verify in Wave R1** |
| **Sparrow** | Desktop PSBT (file/QR/clipboard) | ✅ Full manual control | ✅ BIP-322 taproot message signing since v1.7.8 | ⚠️ Not injectable from a web page — manual import/export only |

**The Xverse finding matters and is easy to get wrong.** [verified — `@sats-connect/core@0.16.0` type declarations]

Modern JSON-RPC `signPsbt` params (`index.d.ts:734-748`) are exactly: `psbt` (base64), `signInputs` (record of address → input indexes), `broadcast`. **There is no sighash field.** Sighash is implicitly `SIGHASH_ALL`.

Per-input sighash exists only on the **legacy** payload type (`index.d.ts:236-249`):
```typescript
interface InputToSign {
  address: string;
  signingIndexes: number[];
  sigHash?: number;
}
type PsbtPayload = { psbtBase64: string; inputsToSign?: InputToSign[]; broadcast?: boolean; };
```
used by `signTransaction` and `signMultipleTransactions` — both still exported from `sats-connect@4.2.1`.

**So: to get a `SINGLE|ANYONECANPAY` seller signature out of Xverse today, RuneBolt must call the legacy `signTransaction` / `signMultipleTransactions` path, not the modern `wallet.request('signPsbt')` path.** BIP-322 is fine on the modern path — `signMessage` takes `protocol?: MessageSigningProtocols` where `enum MessageSigningProtocols { ECDSA = "ECDSA", BIP322 = "BIP322" }`, defaulting to BIP-322 for taproot addresses. [verified]

There is also a known interop issue: `secretkeylabs/sats-connect#166` — *"Not finalized — an error occurred while signing the PSBT using the UniSat wallet"* when driving Unisat through sats-connect. [reported] **Talk to each wallet through its native provider, not through a single abstraction, until proven otherwise.**

---

## 8. Prior art to adopt instead of invent

| Thing | Source | Adopt? |
|---|---|---|
| **2-dummy padding layout + index alignment** | `me-foundation/msigner` (MIT, source read) | ✅ **Adopt as-is** for inscriptions/bitmap. Battle-tested, and matches ord issue #4291 "PSBT Format v2". |
| **Async sell-offer PSBT formats** | ord issue **#4291** (inscriptions): v1 = 1 buyer dummy (seller input 1 / output 1); v2 = 2 buyer dummies (seller input 2 / output 2, buyer cardinal out 0, inscription out 1). ord issue **#4290** (runes): buyer input 0 / rune output 0, seller input 1 / payment output 1, no runestone. | ✅ **Adopt these as the wire formats.** Cite them in the spec so third parties can interop. |
| **Seller-side pre-sign verification checklist** | `ord` `offer/accept.rs` — one wallet input, no runes, ≤1 inscription, asserted-amount `simulate_transaction` balance check, buyer-inputs-signed/seller-input-unsigned, dry-run | ✅ **Adopt verbatim.** This is the SDK's `verifyOffer()`. The net-balance-delta assertion is the strongest single safety primitive available. |
| **PSBT listing-book HTTP shape** | `ord` `POST /offer` (raw base64 PSBT body) + `GET /offers` (JSON `{offers:[base64]}`), gated by `--accept-offers` | ✅ **Adopt/mirror.** Free interop with any `ord` node; do not invent a new listing envelope for the minimal case. |
| **Nostr order propagation** | **NIP-100** (`ordersproject/nips`): kind **60018** `set_order`, kind **60019** `take_order` (carries `psbtRawFinal` + `txId`), kind **5** `delete_order`; fields incl. platform id, SHA256 order id, maker address, product type, order type (sell=1/buy=2), signature, PSBT in `data`. Supports **ordinals + BRC-20**; **no runes support**. | ⚠️ **Adopt shape, extend for runes.** Good decentralized-book prior art and the cancel-by-kind-5 pattern is clean. Runes support would be our contribution. |
| **`ord wallet split`** (merged #4030, documented #4062) | ord source: dust-threshold, runestone-size, shortfall and zero-value validation already implemented | ✅ **Adopt as the rune prepare-step engine.** Don't write our own splitter. |
| **Marketplace API surface shape** | Magic Eden: `POST /v2/ord/btc/runes/psbt/order/create` → sign → `POST /v2/ord/btc/runes/order/create`; cancel via **signed message**, not a tx | ✅ **Mirror the two-call create pattern** (unsigned PSBT → sign → submit). Note cancel-by-signed-message — that pairs naturally with our BIP-322 deeds. |
| **OpenOrdex** | Original zero-fee trustless PSBT marketplace; homepage documents the concept but not sighash/layout details | ℹ️ Historical reference; msigner and ord #4291 are the better specs. |
| **Sniping mitigations** | ME Total Mempool Protection (Tapscript + Schnorr, all-`SIGHASH_ALL`); Mintify private-mempool broadcast | ⚠️ **Design for this in v1, ship in v1.x.** See §9. |

**There is no ratified BIP for PSBT listings.** The de facto standard is the ord issue #4290/#4291 pair plus msigner's layout. Citing them is the closest thing to standards compliance available.

---

## 9. Spec implications for Wave R1

Ranked by how much they change the design.

### 9.1 Listing must be a two-phase lifecycle — **the headline change**

The premise "seller signs one PSBT and walks away" holds for inscriptions and bitmaps only. For both fungible classes, the listable unit is a UTXO that **must be manufactured first**.

Required listing state machine:

```
DRAFT → PREPARING(on-chain, awaiting confirmation) → READY → LISTED → { SOLD | CANCELLED | EXPIRED }
                    └── only for Runes (split) and BRC-20 (transfer inscription)
```

- Inscriptions / Bitmap: `DRAFT → READY → LISTED`. No prepare.
- Runes, exact-balance UTXO exists: `DRAFT → READY → LISTED`. No prepare. **Detect and skip.**
- Runes, partial amount: `PREPARING` = one split tx (`ord wallet split` semantics), wait for confirmation.
- BRC-20: `PREPARING` = inscribe transfer inscription (commit + reveal), wait for confirmation.

`PREPARING` must expose: estimated fee, estimated wait, and a resumable handle. An agent calling the SDK needs to poll or subscribe, not block.

### 9.2 Model assets as UTXO-scoped "lots", not as balances

Adopt Magic Eden's vocabulary because it reflects reality: a rune listing references a `location` (`txid:vout`) and a `priceSats`, not an amount. The API must accept and return locations. Amounts are *derived* from the indexer's view of that location and must be re-validated at buy time. Copy the "lots cannot be split into a non-integer; the last lot absorbs indivisible remainder" rule for divisibility handling.

### 9.3 Hard structural rules the builder must enforce

- **Runes: buyer's rune-receive output MUST be index 0.** No platform fee, dummy, or change output may occupy index 0. Assert this in code with a named error — a silent violation gifts the entire balance to the wrong party.
- **Runes: the swap tx MUST contain no runestone / no OP_RETURN.** Rely on the first-non-`OP_RETURN`-output rule. Never let a buyer-side builder add one (cenotaph ⇒ all input runes burned).
- **Runes: reject mixed UTXOs at listing time** (multiple rune IDs, or runes + inscription). Unisat's own docs say mixed UTXOs "cannot be listed or transferred." Surface a "split required" prompt instead of a failure.
- **Inscriptions/Bitmap: seller input index MUST equal seller payment output index.** Implement ord #4291 v2 / msigner 2-dummy layout: buyer dummies at inputs 0–1, seller at input 2, seller payment at output 2, inscription to buyer at output 1.
- **Seller payment output value = asking price + postage** (per ord `offer/create.rs`). Don't lose the postage.
- **Buyer dummy UTXO requirement (580–1000 sat × 2)** must be a first-class precondition with an auto-create helper, and every purchase should regenerate two fresh dummies (msigner does this).
- **Preserve exact sat offset** for inscriptions so the asset lands at offset 0 of its destination output.

### 9.4 `verifyOffer()` is mandatory, not optional — port ord's checklist

Both sides must run it before signing:
1. exactly one input owned by the signer;
2. that input's asset set matches the asserted asset exactly (≤1 inscription; for runes: exactly one rune ID and the asserted amount; for inscription offers: zero runes);
3. **net balance delta equals the asserted price** (ord's `simulate_transaction` check) — this is the primitive that stops malicious output rearrangement;
4. counterparty inputs signed, own input unsigned;
5. `dryRun` mode returning the txid and a human-readable diff.

Also port Unisat's signing-screen warning set as a pre-sign lint: `SIGHASH_NONE` present, asset-burn risk, mixed-asset transaction, dust/fee anomalies, inscription merge or value change.

### 9.5 Sniping must be answered in the spec, even if mitigated in v1.x

`SIGHASH_SINGLE|ANYONECANPAY` open listings are *actively exploited in production* across both asset families (ordinals: journalistic + marketplace responses; BRC-20: AsiaCCS 2025). Magic Eden's answer was to abandon that sighash for protected listings in favour of Tapscript + Schnorr + all-`SIGHASH_ALL` multi-tx coordination.

RuneBolt v1 should:
- **Document the exposure honestly** in the SDK and the listing UI — the *buyer* is the party at risk.
- **Design the listing envelope to be sighash-agnostic** so a protected mode (all-`SIGHASH_ALL`, coordinator-assisted) can ship later without a wire-format break. This is a v1 architecture decision with a v1.x implementation.
- Consider **short expiry + tight fee-rate bands** as cheap partial mitigation, and treat private/direct broadcast as a later option (Mintify's ~250% fee markup and 2–6h waits show the cost).
- **Do not claim "trustless and safe" without qualification.** It is trustless; it is not snipe-proof.

### 9.6 Wallet integration plan

- **Ship Unisat and Leather first.** Both expose per-input sighash cleanly (`sighashTypes` / `allowedSighash`) and both do BIP-322.
- **Xverse: use the legacy `signTransaction` / `signMultipleTransactions` path** with `inputsToSign[].sigHash`. The modern `signPsbt` RPC cannot express our sighash. Pin this in the spec or an engineer will reach for the modern method and ship a broken listing flow.
- **Talk to each wallet via its native provider**, not one abstraction (see sats-connect#166 Unisat finalization bug).
- **Sparrow: support import/export only** (file/QR/clipboard) for power users and cold-key sellers. Not web-injectable.
- **Magic Eden wallet: unverified.** Add a Wave R1 task to test it directly.

### 9.7 BIP-322 deeds — scope the claim precisely

BIP-322 is well supported (Unisat `bip322-simple`, Xverse `MessageSigningProtocols.BIP322`, Leather p2tr, Sparrow ≥1.7.8, `rust-bitcoin/bip322` for P2TR/P2WPKH/P2SH-P2WPKH, Bitcoin Knots 28.1). Deeds are viable today.

But a deed proves **key control of a UTXO at a point in time**. It does *not* prove protocol-level validity (bitmap district legitimacy, rune indexer agreement, BRC-20 balance). Keep those as separate, indexer-attributed fields in the deed schema, each stamped with indexer name + version + block height. Conflating them is how a "proof" becomes a liability.

Magic Eden's cancel-by-signed-message pattern maps neatly onto deeds — **use BIP-322 for listing cancellation** rather than an on-chain tx.

### 9.8 Lightning module boundary

Separate SDK namespace. NWC (NIP-47) as the programmable rail — per-app revocable keys with budgets is the right agent-native authorization model. Lightning Address/LNURL-pay as the public receive format. Opaque destination handle so BOLT12 is a backend swap later. Hold invoices (`make_hold_invoice`/`settle_hold_invoice`/`cancel_hold_invoice`) for listing anti-spam and receipts. **Explicitly state in the spec that Lightning never settles an asset swap**, with the reason (would require replacing PSBTs with a scripted HTLC/adaptor contract).

### 9.9 Interop surface

Mirror `ord`'s `POST /offer` + `GET /offers` so any `ord --accept-offers` node can exchange listings with us. Adopt NIP-100 event kinds (60018/60019/kind-5) for the decentralized book, extending the product-type enum to cover runes and bitmap (NIP-100 today covers ordinals + BRC-20 only). Mirror ME's two-call PSBT create pattern for familiarity.

---

## 10. Open risks

| # | Risk | Severity | Note |
|---|---|---|---|
| R1 | **Snipe exposure is inherent to the chosen sighash.** Buyers can lose purchases to RBF front-running. | **High** | Documented in production for ordinals and academically for BRC-20. Mitigation requires abandoning `SINGLE\|ANYONECANPAY` (ME's route) or private broadcast (Mintify's route). Cannot be fully solved in v1. |
| R2 | **Fungible listing UX carries an unavoidable on-chain prepare cost and confirmation wait.** | **High** | Sellers pay fees and wait *before* their listing is live. Every competitor has this; it is not a differentiator gap, but it destroys the "one signature and walk away" pitch for Runes/BRC-20. Set expectations in the spec. |
| R3 | **Index-0 rune output rule is a silent, total-loss footgun.** | **High** | No error surfaces if violated — the runes simply go to whoever holds output 0. Needs an assertion plus a test that deliberately misorders outputs. |
| R4 | **Bitmap ownership is indexer consensus, not Bitcoin consensus.** | Medium | Two indexers can disagree on district validity. Must be disclosed and version-stamped in listings and deeds. |
| R5 | **Bitmap parcels/children don't travel with the district.** | Medium | Dispute generator if the UI implies otherwise. Requires explicit scope disclosure. |
| R6 | **Xverse modern `signPsbt` cannot express our sighash.** | Medium | Verified from types. Risk is an engineer using the documented-modern path and shipping broken listings. Pin the legacy path in the spec. |
| R7 | **Magic Eden wallet compatibility unverified.** | Medium | Open Wave R1 task. |
| R8 | **`ord` rune sell-offers are unmerged** (#4280 closed, #4282 open). | Medium | We cannot depend on upstream `ord` for the rune listing path and must maintain our own builder — and possibly track upstream churn if #4282 lands with different conventions. |
| R9 | **Unisat "Single-Step Transfer" indexer consensus undocumented.** | Medium | Don't build the BRC-20 listing path on it. |
| R10 | **Buyer-side cenotaph risk** — a malformed runestone burns all input runes. | Medium | Buyer-side only (seller is paid), but our builder must never emit a runestone in the swap path. |
| R11 | **Dummy-UTXO precondition blocks first-time buyers.** | Low–Medium | Needs an auto-create helper and clear error messaging; msigner's regenerate-two-per-purchase pattern keeps it self-sustaining. |
| R12 | **Magic Eden help-center articles 404 on direct fetch.** | Low (research hygiene) | Both candidate URLs returned 404 to `WebFetch`; content was recovered via search-engine extraction. Evidence is corroborated independently by ord's docs, ME's own API recipe (fetched successfully), and Unisat's docs — so the *conclusion* is solid, but re-verify the ME article quotes before quoting them externally. |
| R13 | **Exa MCP unavailable this session.** | Low | Findings rest on primary sources (source code, specs, official docs), which is stronger than search. A follow-up Exa deep-research pass could still surface non-indexed discussion (Discord/X threads) on rune PSBT edge cases. |

---

## 11. Sources

**Primary — source code / specs read directly**
- `github.com/me-foundation/msigner` — `src/constant.ts`, `src/signer.ts` (cloned & read)
- `github.com/ordinals/ord` @ `849442680e4bba70b180e1d0cfeb3698f0a9c0ff` — `src/subcommand/wallet/offer/create.rs`, `offer/accept.rs`, `split/splitfile.rs`, `src/subcommand/server.rs` (sparse clone & read)
- `@sats-connect/core@0.16.0` — `dist/index.d.ts` (npm pack & read)
- Runes specification — https://docs.ordinals.com/runes/specification.html
- Ordinals provenance — https://docs.ordinals.com/fil/inscriptions/provenance.html
- NIP-47 (Nostr Wallet Connect) — https://raw.githubusercontent.com/nostr-protocol/nips/master/47.md
- NIP-100 (Orders) — https://raw.githubusercontent.com/ordersproject/nips/master/100.md
- Unisat full doc corpus — https://docs.unisat.io/llms-full.txt
- Magic Eden API index + recipe — https://docs.magiceden.io/llms.txt , https://docs.magiceden.io/recipes/btc-create-and-submit-runes-listing-order.md

**Primary — issues / PRs**
- ord #4290 Proposed Specification for Asynchronous Rune Sell Offers — https://github.com/ordinals/ord/issues/4290
- ord #4291 Proposed Specification for Asynchronous Sell Offers for Inscriptions — https://github.com/ordinals/ord/issues/4291
- ord #4280 Rune Offers (Buy & Sell) [CLOSED] — https://github.com/ordinals/ord/pull/4280
- ord #4282 Rune buy offers [OPEN] — https://github.com/ordinals/ord/pull/4282
- ord #4030 Split / #4062 Document split command / #4156 Offers / #4408 / #4409 (merged)
- casey/runestone #46 Figure out how PSBTs work — https://github.com/casey/runestone/issues/46
- sats-connect #166 (Unisat PSBT finalization) — https://github.com/secretkeylabs/sats-connect/issues/166

**Academic**
- BRC20 Snipping Attack, AsiaCCS 2025 — https://arxiv.org/abs/2501.11942 · https://dl.acm.org/doi/10.1145/3708821.3736200

**Wallet docs**
- Unisat `signPsbt` / `signMessage` — https://docs.unisat.io (llms-full.txt §signPsbt, §signMessage)
- Xverse `signPsbt` — https://docs.xverse.app/sats-connect/bitcoin-methods/signpsbt
- Leather `signPsbt` — https://leather.gitbook.io/developers/bitcoin-methods/signpsbt · `signMessage` — https://leather.gitbook.io/developers/bitcoin-methods/signmessage
- Sparrow v1.7.8 (BIP-322 taproot signing) — https://www.nobsbitcoin.com/sparrow-wallet-v1-7-8/
- BIP-322 — https://bips.dev/322/ · https://github.com/rust-bitcoin/bip322

**Marketplace / secondary**
- Magic Eden: Splitting and Listing a Portion of Runes — https://help.magiceden.io/en/articles/9230622-listing-a-portion-of-runes-on-magic-eden-bitcoin (404 on direct fetch; recovered via search extraction)
- Magic Eden: How to Buy and Sell Runes — https://help.magiceden.io/en/articles/9220231-how-to-buy-and-sell-runes-on-magic-eden
- Xverse: How to List Your Runes on Magic Eden — https://support.xverse.app/hc/en-us/articles/30412609927949 (403 on fetch)
- Bitmap gitbook — https://gitbook.bitmap.land/
- Bitmap Phase 2 / parcels — https://ordinallabs.medium.com/bitmap-phase-2-a-closer-look-dfb512c59893
- OpenOrdex — https://openordex.org/ · https://github.com/orenyomtov/openordex
- Ordinals sniping — https://blockspace.media/insight/the-mempool-is-ground-zero-for-ordinals-snipers/ (403) · https://newsletter.blockspacemedia.com/p/ordinals-sniping-part-2-revenge-of-the-marketplaces
- ME Total Mempool Protection — https://x.com/rexzh0u/status/1848736537019601157
- Portal ordinal atomic swap demo — https://bitcoin-takeover.com/portal-presents-ordinal-atomic-swap-tech-demo/
- BOLT12 offers — https://www.spark.money/research/bolt12-offers-explained
- Submarine swaps — https://docs.lightning.engineering/the-lightning-network/multihop-payments/understanding-submarine-swaps
