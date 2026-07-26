# RuneBolt Protocol Security Audit

**Audit Date:** 2026-03-14  
**Auditor:** Security Subagent (Kimi K2.5)  
**Scope:** `/Users/gravity/projects/runebolt/backend/src/`  
**Classification:** CRITICAL — Multiple vulnerabilities requiring immediate remediation

---

## Executive Summary

This audit reveals **14 security vulnerabilities** across the RuneBolt backend codebase, ranging from **CRITICAL** to **LOW** severity. The most severe issues include:

1. **Mock signature acceptance in production** — Authentication bypass
2. **Missing replay attack protection** — Double-spend vulnerability
3. **No rate limiting** — DoS attack vector
4. **In-memory commitment storage** — State loss vulnerability
5. **Weak JWT secret fallback** — Token forgery

**Recommendation:** Do NOT deploy to production until CRITICAL and HIGH severity issues are resolved.

---

## Findings by Severity

### 🔴 CRITICAL (5)

#### C1: Mock Signature Verification in Production
**File:** `src/auth/ChallengeManager.ts` (lines 80-90)  
**File:** `src/bitcoin/TaprootUtils.ts` (lines 108-125)  
**File:** `src/channels/CommitmentManager.ts` (lines 85-105)

**Issue:** The challenge verification accepts ANY non-empty signature without actual cryptographic verification.

**Attack Vector:** Attacker can authenticate as ANY user by providing any non-empty string as a signature.

**Fix:** Implement BIP-322 or Bitcoin message signing verification using @noble/secp256k1.

---

#### C2: No Replay Attack Protection on Transfers
**File:** `src/ledger/RuneLedger.ts` (lines 23-130)

**Issue:** Transfers lack unique identifiers (nonces) that prevent replay attacks.

**Attack Scenario:**
1. Alice sends 1000 DOG to Bob
2. Attacker captures the WebSocket/API message
3. Attacker replays the same transfer 100 times

**Fix:** Add transfer nonces with UNIQUE constraint in database.

---

#### C3: In-Memory Commitment Storage (No Persistence)
**File:** `src/channels/CommitmentManager.ts` (line 18)

**Issue:** Commitment states stored in JavaScript Map are lost on server restart.

**Attack:** After restart, user can broadcast old commitment and steal funds.

**Fix:** Persist commitments to SQLite database.

---

#### C4: No Rate Limiting on Any Endpoint
**File:** `src/index.ts`, all route files

**Issue:** No rate limiting allows DoS, brute force attacks.

**Fix:** Implement express-rate-limit with strict auth endpoint limits.

---

#### C5: Weak JWT Secret with Fallback
**File:** `src/auth/AuthMiddleware.ts` (line 6)

**Issue:** `JWT_SECRET` falls back to predictable default.

**Fix:** Require JWT_SECRET at startup with minimum 32 characters.

---

### 🟠 HIGH (5)

#### H1: No Input Validation on Channel Opening Amount
**File:** `src/api/routes/channelRoutes.ts`, `src/channels/ChannelManager.ts`

**Issue:** No upper bound on channel amounts; risk of integer overflow.

**Fix:** Use MIN_CHANNEL_CAPACITY and MAX_CHANNEL_CAPACITY from RuneConstants.

---

#### H2: Integer Overflow Risk with BigInt/Number Conversion
**File:** `src/db/Database.ts`, `src/channels/ChannelManager.ts`

**Issue:** BigInt converted to Number loses precision above 2^53-1.

**Fix:** Store balances as TEXT in SQLite.

---

#### H3: Missing Transaction Confirmation Verification
**File:** `src/channels/ChannelManager.ts`

**Issue:** Channel activated without verifying funding tx confirmation.

**Fix:** Wait for 1+ confirmations before activating channel.

---

#### H4: WebSocket Message Validation Missing
**File:** `src/ws/WebSocketServer.ts`

**Issue:** No Zod validation on WebSocket messages.

**Fix:** Add discriminated union schema validation.

---

#### H5: No HTTPS Enforcement / Secure CORS
**File:** `src/index.ts`

**Issue:** CORS allows all origins; no HTTPS enforcement.

**Fix:** Configure strict CORS and HSTS headers.

---

### 🟡 MEDIUM (3)

- M1: Missing Idempotency Keys
- M2: Error Messages Leak Internal Information
- M3: No WebSocket Connection Limits

### 🟢 LOW (1)

- L1: Timestamp Precision Issues

---

## Security Best Practices from Lightning Network

Based on Lightning Network security research:

1. **Penalty Transactions:** Implement revocation secrets to punish old state broadcasts
2. **HTLC Timeout Handling:** Add timeout mechanisms for in-flight payments
3. **Watchtowers:** Consider third-party monitoring for channel breaches
4. **Channel Reserve:** Maintain minimum balance to prevent channel exhaustion attacks
5. **Max HTLC in Flight:** Limit concurrent pending transfers

---

## Recommended Security Headers

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## Security Test Cases

```typescript
// Test C1: Authentication bypass
describe('ChallengeManager', () => {
  it('should reject invalid signatures', async () => {
    const result = await challengeManager.verifyChallenge(challengeId, 'invalid');
    expect(result.valid).toBe(false);
  });
});

// Test C2: Replay protection
describe('RuneLedger', () => {
  it('should reject duplicate nonces', async () => {
    const nonce = uuidv4();
    await ledger.transfer(from, to, 100n, 'test', nonce);
    await expect(ledger.transfer(from, to, 100n, 'test', nonce))
      .rejects.toThrow('nonce already used');
  });
});

// Test C4: Rate limiting
describe('Rate Limiting', () => {
  it('should block excessive auth attempts', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app).post('/api/v1/auth/challenge').send({ pubkey });
    }
    const res = await request(app).post('/api/v1/auth/challenge').send({ pubkey });
    expect(res.status).toBe(429);
  });
});
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "express-rate-limit": "^7.1.0",
    "@noble/secp256k1": "^2.0.0",
    "@scure/bip32": "^1.3.0",
    "bitcoinjs-lib": "^6.1.0"
  }
}
```

---

## Deployment Checklist

- [ ] JWT_SECRET set to 32+ character random string
- [ ] NODE_ENV=production set
- [ ] HTTPS/WSS only (no HTTP/WS in production)
- [ ] Rate limiting enabled
- [ ] Database permissions restricted
- [ ] Logging configured for security events
- [ ] Secrets rotated (no placeholder values)
- [ ] Penetration testing completed

---

*This audit was conducted as part of the RuneBolt Protocol Security Review. All findings should be addressed before mainnet deployment.*

---

## Quick Reference: Security Checklist

### Pre-Deployment (MUST FIX)
- [ ] **C1:** Implement real Bitcoin signature verification (BIP-322)
- [ ] **C2:** Add transfer nonce with UNIQUE database constraint
- [ ] **C3:** Persist commitments to database
- [ ] **C4:** Add express-rate-limit to all endpoints
- [ ] **C5:** Enforce JWT_SECRET on startup

### High Priority (SHOULD FIX)
- [ ] **H1:** Add amount bounds checking (MIN/MAX_CHANNEL_CAPACITY)
- [ ] **H2:** Store balances as TEXT, not INTEGER
- [ ] **H3:** Wait for confirmations before channel activation
- [ ] **H4:** Add Zod validation to WebSocket messages
- [ ] **H5:** Configure strict CORS and security headers

### Medium Priority (FIX WHEN POSSIBLE)
- [ ] **M1:** Add idempotency-key header support
- [ ] **M2:** Sanitize error messages in production
- [ ] **M3:** Limit WebSocket connections per IP/user

---

## Dependencies to Install

```bash
# Required for security fixes
npm install express-rate-limit
npm install @noble/secp256k1
npm install @scure/bip32
npm install bitcoinjs-lib

# Dev dependencies for testing
npm install -D vitest supertest @types/supertest
```

---

## Bitcoin L2 Security Patterns

### From Lightning Network:
1. **Penalty Transactions:** Store revocation secrets; punish old state broadcasts
2. **CLTV/CSV Timelocks:** Enable unilateral closes with delay
3. **HTLCs:** Hash-locked contracts for multi-hop payments
4. **Channel Reserve:** Keep minimum balance to prevent exhaustion

### From RGB Protocol:
1. **Client-side validation:** State verified by clients, not just servers
2. **Single-use seals:** Prevent double-spends via Bitcoin anchoring
3. **Schema validation:** Strict type checking for state transitions

### From Taproot Assets:
1. **Merkle-Sum Trees:** Prove solvency without revealing details
2. **Script-level controls:** Use Taproot for complex spending conditions
3. **Asset-aware transactions:** Encode rune transfers in witness data

---

## Attack Scenarios Mitigated

| Attack | Severity | Status | Fix |
|--------|----------|--------|-----|
| Auth Bypass | Critical | ❌ Open | C1 |
| Replay Attack | Critical | ❌ Open | C2 |
| State Loss | Critical | ❌ Open | C3 |
| DoS/Brute Force | Critical | ❌ Open | C4 |
| Token Forgery | Critical | ❌ Open | C5 |
| Integer Overflow | High | ❌ Open | H1, H2 |
| Fake Funding | High | ❌ Open | H3 |
| Message Injection | High | ❌ Open | H4 |
| CORS Exploit | High | ❌ Open | H5 |
| Race Condition | Medium | ❌ Open | M1 |
| Info Leakage | Medium | ❌ Open | M2 |
| Resource Exhaustion | Medium | ❌ Open | M3 |

---

*Report generated: 2026-03-14*
*Next audit recommended after critical fixes deployed*
