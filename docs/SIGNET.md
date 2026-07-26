# Signet validation runbook

**Status: not yet performed.** No wave may claim a confirmed signet swap until the checklist below
has been run and its txids recorded here.

ARCHITECTURE §4 requires signet or testnet integration before any mainnet claim, and it is the
outstanding exit criterion for **W4** (2-dummy layout) and **W7** (rune layout). Everything else in
both waves is covered by the test suite; this is the one thing unit tests cannot stand in for,
because what it proves is that an *indexer* agrees about where the asset went.

---

## 1. Why the test suite is not enough

`verifyOffer()` simulates value movement from the PSBT alone. It cannot observe the two things that
actually decide whether a swap worked:

- **Rune allocation.** The runestone-free layout relies on "unallocated runes are transferred to
  the first non-`OP_RETURN` output" (SPEC §6.2.1). Nothing in a PSBT proves an indexer applied that
  rule. Only a confirmed transaction, re-read from `ord`, proves the balance is on output 0.
- **Sat offset routing.** I-5 asserts arithmetic about where the inscribed sat lands. Whether
  `ord` then reports the inscription at the buyer's output is a separate claim.

A green suite means the transaction is built and judged correctly. Signet is what closes the loop.

---

## 2. Blocker

Signet coins come from a faucet, and every reachable faucet gates on a human:

| Faucet | Gate |
|---|---|
| `signetfaucet.com` | server-rendered image captcha (`GET /captcha`, field `captcha`) |
| `alt.signetfaucet.com` | Cloudflare challenge (error 1002) |
| `faucet.mutinynet.com` | requires an API token, and is a *different* signet chain |

There is no non-interactive path. A human must fund the two keys once; everything after that is
scriptable.

---

## 3. What is needed

1. **A synced signet node.** `bitcoind -signet`. Signet is small, but the sync is not instant.
2. **An `ord` index over that node**, built for signet: `ord --signet index update`. Required for
   the attributed reads behind I-15 and I-16, and for the after-the-fact proof in step 8.
3. **Two funded keys** — seller and buyer — from the faucet above. The buyer needs enough for the
   price plus fees; for the 2-dummy layout it also needs two UTXOs in the 580–1000 sat band (I-7).
4. **An asset to trade.**
   - Rune: etch one with `ord --signet wallet etch`, and wait out the commit maturity before the
     reveal confirms.
   - Inscription: `ord --signet wallet inscribe`.
5. **A lot holding exactly the sale amount** (SPEC §6.2.2, and `planRuneListing()` enforces it).
   Either etch straight into a single output, or run `ord --signet wallet split` — the rune prepare
   transaction, which is W8 and is a separate confirmed transaction from the swap.

---

## 4. The run

| Step | Action | Proves |
|---|---|---|
| 1 | `planRuneListing()` over the seller's lots | SPEC §4.2 skip detection against real UTXOs |
| 2 | `makeRuneOffer()` / `makeOffer()` | the draft builds from a real lot |
| 3 | seller signs input 1 (runes) or 2 (2-dummy) at `SINGLE\|ANYONECANPAY` — `walletprocesspsbt` with `sighashtype: "SINGLE\|ANYONECANPAY"` | a real wallet produces the flags I-19 demands |
| 4 | `sealOffer()` | the wallet returned the transaction it was given |
| 5 | `completeRuneSwap()` / `completeSwap()` | the seller's signature survives the rebuild |
| 6 | buyer signs, `finalizeSwap()` | the full checklist passes at stage `final` |
| 7 | `sendrawtransaction`, wait for a block | the transaction is consensus-valid, not just well-formed |
| 8 | re-read both outputs from `ord` | **the point of the exercise**: the indexer agrees the asset moved to the buyer, and for runes that the whole balance is on output 0 |

Step 8 is the only step that cannot be inferred from any earlier one.

---

## 5. Recording the result

Append the txids and the `ord` output for step 8 here, then update the wave's exit criterion in
`ARCHITECTURE.md` §3. Until that exists, no surface, commit message or release note may describe a
swap as signet-confirmed.
