# Legacy — Taproot Assets era (March 2026)

> **The code is no longer checked out on `main`.** `taproot-assets-era/` was removed and
> preserved in history under the annotated tag **`legacy/taproot-assets-era-final`**
> (commit `f8eebe3`). Recover it with:
>
> ```sh
> git checkout legacy/taproot-assets-era-final -- legacy/taproot-assets-era
> ```
>
> **Why it was removed:** its three checked-in `package-lock.json` files generated
> **63 Dependabot alerts** (1 critical, 25 high, 30 moderate, 7 low) against a frozen
> prototype that is never built, tested or deployed. That noise buried real alerts on the
> live tree. Deleting the directory retires those alerts at the source instead of
> dismissing 63 of them one at a time. Nothing on `main` referenced it — verified by
> `git grep taproot-assets-era` (no hits outside `legacy/`), by `pnpm-workspace.yaml`
> (`packages/*` only), and by `.github/workflows/ci.yml` (the sole workflow, which runs
> only workspace scripts).
>
> Browse it without checking anything out:
>
> ```sh
> git ls-tree -r --name-only legacy/taproot-assets-era-final legacy/taproot-assets-era
> git show legacy/taproot-assets-era-final:legacy/taproot-assets-era/README.md
> ```

Everything under `taproot-assets-era/` is the **first** RuneBolt design. It is kept for history.
It is not built, tested, deployed, or maintained. Do not import from it.

## What it was

A hub-based "Lightning Network for Runes": users opened a 2-of-2 Taproot multisig channel with a
RuneBolt hub, locked $DOG (`DOG•GO•TO•THE•MOON`, rune id `1:0`) on L1, then transferred balances
off-chain against a hub-operated ledger. Backend (Express + SQLite + WebSocket), Next.js frontend,
`@runebolt/sdk`, Docker/Vault/Grafana infrastructure, and a large body of UX and security research.

The old GitHub Actions workflow that built it (`legacy/ci/ci-cd.yml`) has now been removed
from `main` too. Parking it here already stopped it running, but it kept this directory
looking like a live build surface and it only ever built deleted code. It is preserved
unchanged under the tag above (blob `4dc9c28`):

```sh
git show legacy/taproot-assets-era-final:legacy/ci/ci-cd.yml
```

## Why it was superseded

The hub model reintroduced the thing RuneBolt exists to remove.

1. **It was custodial in practice.** Off-chain balances lived in a hub-operated ledger. A user's
   claim on their runes was a claim on the hub's honesty and liveness, not on Bitcoin.
2. **It needed permission.** Trading required a channel with *the* hub. That is a gatekeeper, and a
   single point of failure and censorship.
3. **It only moved one asset.** Channels carried a rune balance. Inscriptions, bitmap districts and
   BRC-20 have no channel representation, so the design could never cover Bitcoin-native assets as a
   class.
4. **It fought the grain of the ecosystem.** The de-facto standard for Bitcoin-native asset trading
   is already the pre-signed PSBT atomic swap, settled on L1, with no hub in the path. Interop with
   `ord`, msigner and existing wallets was free there and expensive here.

## What replaced it

Non-custodial PSBT atomic swaps on Bitcoin mainnet, plus an open listing book. No hub holds assets,
no hub is required to trade, and every trade settles as one L1 transaction. Lightning stays in the
design — but strictly for receipts, anti-spam and coordination, never for settlement.

See [`../docs/SPEC.md`](../docs/SPEC.md) and [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).
