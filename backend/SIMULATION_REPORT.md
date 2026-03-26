# RuneBolt Simulation Test Report

**Date:** 2026-03-15
**Version:** 0.2.0
**Test Framework:** Vitest 4.1.0
**Database:** PostgreSQL 17 (local)
**Network:** Testnet simulation (no real Bitcoin spent)

---

## Test Results Summary

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| simulation.test.ts | 50 | 50 | 0 |
| rune-encoding.test.ts | 45 | 45 | 0 |
| **Total** | **95** | **95** | **0** |

All 95 tests pass. However, several tests explicitly verify **security findings** — behaviors that pass because the code currently allows them, but which represent risks for mainnet.

---

## Scenarios Tested

### Scenario 1: DOG Transfer Flow (End-to-End) — 10 tests, ALL PASS
- Real secp256k1 keypair generation (BIP-340 x-only pubkeys)
- Challenge-response authentication with Schnorr signatures
- Channel open (PENDING_OPEN state)
- Funding confirmation simulation (PENDING_OPEN → OPEN)
- Off-chain transfer: 10,000 DOG from Alice to Bob
- Balance verification after transfer
- Fee tier check (free within first 500 txs)
- Cooperative channel close (OPEN → CLOSING)

### Scenario 2: Security Tests — 7 tests, ALL PASS
- Wrong-key signature rejection (BIP-340 verification works correctly)
- Overflow detection (amount > balance)
- Zero/negative amount rejection (validated in RuneLedger)
- 1% channel reserve enforcement (ChannelReserves module)
- Replay attack prevention (nonce uniqueness via DB)
- One-time-use challenge (deleted after first verification)
- Short signature rejection (must be exactly 64 bytes)

### Scenario 3: Fee System Tests — 6 tests, ALL PASS
- New user starts with 500 free transactions
- Transaction count tracking and increment
- Free tier exhaustion at exactly 500
- FeeManager calculates 0.1% off-chain fee for paid tier
- FeeManager calculates 0.5% settlement fee
- Free tier returns 0 fee for new users

### Scenario 4: Multi-User Concurrent — 4 tests, ALL PASS
- 5 users created simultaneously without conflict
- 10 parallel transfers without deadlock or error
- UUID nonce uniqueness across 100 concurrent operations
- Channel state invariants preserved after concurrent ops

### Scenario 5: Channel Reserve Enforcement — 3 tests, ALL PASS
- 1% reserve calculation at various capacities
- Spendable balance computation
- Transfer validation against reserve boundary

### Scenario 6: Channel State Machine — 6 tests, ALL PASS (includes 1 FINDING)
- All valid transitions verified (PENDING_OPEN→OPEN, OPEN→CLOSING, etc.)
- Invalid transitions rejected (CLOSED→OPEN, CLOSING→OPEN)
- assertTransition throws on invalid transition
- DB state transitions work correctly
- Force close path (OPEN→FORCE_CLOSING→CLOSED)
- **FINDING:** DB allows invalid state transitions

### Scenario 7: Bitmap Escrow — 1 test, PASS
- Escrow table accessible and queryable

### Scenario 8: Cryptographic Verification — 6 tests, ALL PASS
- Unique keypair generation
- Correct sign + verify round-trip
- Wrong-key rejection
- Tampered message rejection
- 64-byte Schnorr signature format
- Unicode/special character handling

### Scenario 9: Overflow & Edge Cases — 5 tests, ALL PASS (includes 2 FINDINGS)
- Max safe BigInt reserve calculation
- Minimum reserve edge case
- Balance invariant (local + remote = capacity) preserved correctly
- **FINDING:** DB does not enforce balance invariant
- **FINDING:** DB allows negative balances

### Scenario 10: Commitment Tracking — 2 tests, ALL PASS
- Commitment create and retrieval (latest by sequence)
- Commitment history with DESC ordering

### Rune Encoding Tests — 45 tests, ALL PASS (includes 1 FINDING)
- LEB128 encoding/decoding: 0, 1, 127, 128, 255, 300, 840000, 2^32, 2^64
- Negative value rejection
- Rune ID encode/decode round-trip
- DOG amount formatting and parsing
- Single-edict Runestone build + parse round-trip
- Pointer Runestone build + parse
- Commitment Runestone (2 edicts, delta encoding)
- Multi-transfer Runestone (sorted, delta-encoded)
- Empty transfer list rejection
- Edge cases: non-OP_RETURN, missing OP_13, short buffer
- Protocol conformance: Body=0, Pointer=22, Mint=20
- **FINDING:** Empty Runestone (OP_RETURN + OP_13, no data) returns null

---

## Security Findings

### CRITICAL

**F1: Missing Database Migrations — 8 tables not created by migration files**
- Tables `user_transaction_counts`, `fee_records`, `user_tiers`, `fee_ledger`, `revocation_secrets`, `disputes`, `breach_attempts`, `transaction_status` are referenced in code but have NO migration SQL files.
- The application will crash on first use of fees, disputes, revocations, or transaction status tracking.
- **Risk:** CRITICAL — app will fail in production on any fee/dispute operation.
- **Fix:** Create migration `002_fee_and_security_tables.sql` with all missing tables.

**F2: Partitioned transfers table has invalid primary key**
- Migration `001_postgres_schema.sql` line 38 creates `transfers` with `PARTITION BY RANGE (created_at)` but uses `id UUID PRIMARY KEY` which does not include the partition column.
- PostgreSQL rejects this: `unique constraint on partitioned table must include all partitioning columns`.
- **Risk:** CRITICAL — transfers table cannot be created from migrations alone.
- **Fix:** Change PK to `PRIMARY KEY (id, created_at)` or remove partitioning.

### HIGH

**F3: No DB-level state transition enforcement**
- The database allows any channel state to be set directly (e.g., CLOSED → OPEN).
- State machine enforcement only exists in `ChannelManager` (application layer).
- A bug in any code path that calls `db.updateChannelState()` directly bypasses the state machine.
- **Risk:** HIGH — could allow channels to be "resurrected" from CLOSED state.
- **Fix:** Add PostgreSQL trigger or CHECK constraint that validates state transitions.

**F4: No DB-level balance invariant enforcement**
- `updateChannelBalances()` can set `local_balance + remote_balance != capacity`.
- It can also set negative balances.
- Application code enforces this, but any code path that directly calls the DB method can break invariants.
- **Risk:** HIGH — could lead to creation/destruction of funds if a bug bypasses application checks.
- **Fix:** Add CHECK constraint: `local_balance >= 0 AND remote_balance >= 0 AND local_balance + remote_balance = capacity`.

**F5: BigInt precision loss in transfer amounts**
- `FeeManager.calculateFee()` converts BigInt to Number for fee calculation: `BigInt(Math.ceil(Number(transferAmount) * rate))`.
- For amounts > 2^53, `Number(transferAmount)` loses precision.
- `RuneLedger` also casts BigInt to Number for DB operations: `Number(amount)`, `Number(newFromLocal)`.
- **Risk:** HIGH — incorrect fee calculations and silent balance corruption for large DOG amounts.
- **Fix:** Use BigInt-native arithmetic for all balance/fee operations. Replace `Number()` casts with BigInt math.

### MEDIUM

**F6: Empty Runestone not recognized by parser**
- `RuneParser.parseRunestone()` rejects scripts shorter than 3 bytes, but a valid empty Runestone is just `OP_RETURN OP_13` (2 bytes).
- Per the Runes protocol specification, this should be a valid no-op Runestone.
- **Risk:** MEDIUM — could cause issues when processing transactions with empty Runestones.
- **Fix:** Change minimum length check from `< 3` to `< 2`.

**F7: Client signature not cryptographically verified in transfer path**
- `RuneLedger.transfer()` accepts `clientSignature` as a parameter but never verifies it.
- The signature is stored in the DB but not checked against the transfer payload.
- **Risk:** MEDIUM — any party with a valid JWT can forge transfers without proving they hold the private key for each transfer.
- **Fix:** Verify the client signature against the transfer details (fromChannelId, toChannelId, amount, nonce) using the sender's public key.

**F8: `index.ts` calls `process.exit(1)` on failed mainnet checks**
- This kills the entire process, preventing graceful shutdown.
- In a test environment, this kills the test runner.
- **Risk:** MEDIUM — operational risk, makes testing harder.
- **Fix:** Throw an error instead of calling `process.exit()`. Let the caller decide what to do.

### LOW

**F9: No unique constraint on transfer nonce in DB**
- Replay prevention relies on `SELECT id FROM transfers WHERE nonce = $1` but the nonce column has no UNIQUE constraint.
- Under concurrent load, two identical nonces could be inserted simultaneously.
- **Risk:** LOW — UUID v4 collisions are astronomically unlikely, but defense-in-depth says add the constraint.
- **Fix:** `ALTER TABLE transfers ADD CONSTRAINT transfers_nonce_unique UNIQUE (nonce)`.

**F10: Challenge-response FK requires user to exist first**
- The `challenges` table has `pubkey REFERENCES users(pubkey)`, requiring the user to be created before a challenge can be issued.
- New users can't authenticate until they're in the users table, but users are created during channel opening.
- **Risk:** LOW — chicken-and-egg problem for new user onboarding flow.
- **Fix:** Either remove the FK constraint or create the user during challenge creation.

---

## Component Risk Assessment

| Component | Risk Level | Notes |
|-----------|-----------|-------|
| Schnorr Auth (BIP-340) | LOW | Real cryptographic verification, working correctly |
| Channel State Machine | HIGH | Application-only enforcement, no DB constraints |
| Balance Management | HIGH | No DB-level invariant checks, BigInt→Number precision loss |
| Fee System | CRITICAL | Missing DB tables, BigInt precision issue for large amounts |
| Rune Encoding | LOW | LEB128 + Runestone encoding is correct and round-trips |
| Replay Prevention | LOW | Nonce-based, working but no UNIQUE constraint |
| Reserve Enforcement | LOW | 1% reserve correctly enforced at application layer |
| Escrow System | MEDIUM | Table exists but no test coverage of actual escrow flows |
| Database Migrations | CRITICAL | 8 missing tables, partitioned transfers table broken |
| Transfer Signatures | MEDIUM | Stored but never verified |

---

## Final Verdict

### NOT READY for mainnet

**Blocking issues before mainnet deployment:**

1. **CRITICAL: Fix database migrations** — 8 missing table definitions will crash the application on first use of fees, disputes, or revocations. The `transfers` table partition key issue prevents the table from being created at all from migrations.

2. **HIGH: Add DB-level safety constraints** — Channel state transitions, balance invariants (local + remote = capacity, no negatives), and nonce uniqueness should all be enforced at the database level. Application-layer-only enforcement is insufficient for a financial system handling real money.

3. **HIGH: Fix BigInt precision loss** — Any transfer amount above ~9 quadrillion units (2^53) will silently corrupt balances. While current DOG supply may not hit this, it's a ticking time bomb in a financial system.

4. **MEDIUM: Implement transfer signature verification** — Client signatures are collected but never verified. Any authenticated user can forge transfers without proving per-transfer authorization.

**What IS working well:**
- Schnorr authentication is real, verified, and secure
- Rune encoding/decoding is correct and protocol-conformant
- Channel reserve enforcement works properly
- Replay attack prevention via nonces is functional
- The core transfer logic (balance updates, commitments) is sound
- Concurrent operations handle correctly at the DB level

**Estimated effort to reach mainnet-ready:** Fix the 4 blocking issues above. Items 1-3 are structural fixes (1-2 days). Item 4 requires design decisions about the signature scheme (1 day).
