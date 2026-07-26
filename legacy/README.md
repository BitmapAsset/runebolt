# Legacy — Taproot Assets era (March 2026)

Everything under `taproot-assets-era/` is the **first** RuneBolt design. It is kept for history.
It is not built, tested, deployed, or maintained. Do not import from it.

## What it was

A hub-based "Lightning Network for Runes": users opened a 2-of-2 Taproot multisig channel with a
RuneBolt hub, locked $DOG (`DOG•GO•TO•THE•MOON`, rune id `1:0`) on L1, then transferred balances
off-chain against a hub-operated ledger. Backend (Express + SQLite + WebSocket), Next.js frontend,
`@runebolt/sdk`, Docker/Vault/Grafana infrastructure, and a large body of UX and security research.

`legacy/ci/ci-cd.yml` is the old GitHub Actions workflow, parked here so it no longer runs.

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
