# RuneBolt Protocol Research

**Research Date:** March 14, 2026  
**Scope:** Cutting-edge Bitcoin L2 technologies for competitive advantage

---

## Executive Summary

This research analyzes Bitcoin Layer 2 technologies and innovations that RuneBolt can adopt. Key findings:

1. **OP_CAT/OP_CTV activation likely 2025-2027** - enables covenants and vaults
2. **BitVM bridges** - trust-minimized cross-chain interoperability
3. **Taproot Assets v0.6** - live on mainnet with Lightning support
4. **BOLT 12 + Trampoline routing** - reusable offers and mobile payments
5. **Fedimint** - privacy-preserving federated custody

---

## Top 5 Features to Implement

1. **BitVM-based Bridge Architecture** - Trust-minimized Runes bridging without waiting for soft forks
2. **BOLT 12 Payment Offers** - Static, reusable payment codes for merchants
3. **DLC Oracle Contracts** - Derivatives and prediction markets for Runes
4. **Fedimint Integration** - Community custody with Chaumian e-cash privacy
5. **Trampoline Routing** - Mobile-friendly Lightning without full graph

---

## 1. Lightning Network Developments

### 1.1 Taproot Channels
- Uses Schnorr signatures for key aggregation
- MAST hides unexecuted script branches
- Reduces on-chain footprint

**RuneBolt Action:** Use Taproot channels for all Lightning integrations

### 1.2 BOLT 12 (Offers)
| Feature | BOLT 11 | BOLT 12 |
|---------|---------|---------|
| Reusability | Single-use | Multi-use |
| Privacy | Reveals node ID | Blinded paths |
| UX | Complex QR | Human-readable |

**Status:** CLN ready, LDK implementing, LND planned

### 1.3 Trampoline Routing
Outsources pathfinding to intermediate nodes:
- Mobile clients don't need full graph
- Multiple hops for privacy
- LDK #3446, #3670; Eclair #2811

---

## 2. Runes Protocol Improvements

**Current State:** Etching + minting + transferring via OP_RETURN

**Identified Improvements:**
1. Batch etching (multiple runes in one tx)
2. Commit-reveal optimization
3. Cross-input aggregation
4. Atomic swap standards
5. Lightning integration (opportunity!)

**Competitive Gap:** No major player does Runes over Lightning yet

---

## 3. State Channel Innovations

### 3.1 Eltoo (LN-Symmetry)
- Requires BIP-118 (SIGHASH_ANYPREVOUT)
- Simpler watchtowers (O(1) storage)
- No penalty, just correction

### 3.2 Watchtowers
- **PISA:** Accountable watchtowers with slashing
- **Cerberus:** No collateral required
- **Sleepy Channels:** Remove fees entirely

### 3.3 Statechains (Mercury Layer)
- Off-chain transfers without channels
- Blind MuSig2 signing
- Production ready

---

## 4. Cross-Chain Bridges

### 4.1 BitVM Architecture
- Fraud proof-based verification
- 1-of-n honesty assumption
- No soft fork required
- Challenge period: ~2 weeks

**2025 Developments:**
- StarkWare verified STARK on Signet
- Bitlayer building bridges to major L2s
- Collider-script: covenants without OP_CAT

### 4.2 Bridge Security Patterns
- **Federated:** Liquid, WBTC
- **Optimistic:** BitVM
- **ZK-verified:** Future with OP_CAT

---

## 5. ZK Proofs for Bitcoin

### 5.1 StarkNet on Bitcoin
- First L2 settling on both BTC and ETH
- Requires OP_CAT activation
- Estimated mainnet: 2025-2026

### 5.2 BitcoinOS
- Graviton ZK-proof system
- BitSNARK verifier
- General-purpose smart contracts

---

## 6. Federated Custody (Fedimint)

**Status:** Open source (January 2026)

**Architecture:**
- 4+ guardians in federation
- Chaumian e-cash notes
- Blind signatures for privacy
- Offline capable

**RuneBolt Integration:**
- Fedimint module for Runes
- Community mints
- Privacy layer for transactions

---

## 7. Discreet Log Contracts (DLCs)

**Mechanism:** Oracle signatures enable conditional payments

**2025 Developments:**
- DLC Factories (options, futures)
- Off-chain DLC channels
- Chainlink oracle integration

**Use Cases:**
- Runes price derivatives
- Stablecoins backed by BTC
- Prediction markets
- Insurance contracts

---

## 8. Bitcoin Upgrade Timeline

| BIP | Purpose | Status | ETA |
|-----|---------|--------|-----|
| BIP 347 | OP_CAT | Assigned | 2026-2027 |
| BIP 119 | OP_CTV | Assigned | 2026-2027 |
| BIP 118 | ANYPREVOUT | Proposed | Unknown |
| BIP 345 | OP_VAULT | Proposed | Unknown |

**Strategy:** Build without covenants now (BitVM, DLCs), upgrade later

---

## 9. Competitor Analysis

### Taproot Assets (Lightning Labs)
- **Status:** Mainnet v0.6 (June 2025)
- **Focus:** Stablecoins (USDT, USDC)
- **Strength:** Production ready, Tether partnership
- **Gap:** No Runes support

### RGB Protocol
- **Status:** Development
- **Focus:** Client-side validation, privacy
- **Gap:** Complex, limited adoption

### Liquid Network
- **Status:** Production
- **Focus:** Sidechain for exchanges
- **Gap:** Federated, not trustless

### ROL (Rune Open Ledger)
- **Status:** Emerging
- **Focus:** Runes-specific L2

**RuneBolt Differentiation:**
- First Runes-native Lightning integration
- BitVM bridges vs federated custody
- DLC-powered derivatives

---

## 10. Technical Specification: BitVM Bridge for Runes

### Overview
Implement a trust-minimized bridge allowing Runes to move between Bitcoin L1 and RuneBolt L2.

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Bitcoin L1 │────▶│  BitVM Bridge│────▶│ RuneBolt L2 │
│   (Runes)   │◀────│   (1-of-n)   │◀────│  (Fast TX)  │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Components

1. **Operators (n = 5-15)**
   - Run full nodes for both chains
   - Lock collateral in multisig
   - Execute honest withdrawals

2. **BitVM Circuit**
   - Validates withdrawal requests
   - Enforces consensus rules
   - Generates fraud proofs

3. **Challenge Period (14 days)**
   - Operators can challenge invalid withdrawals
   - Fraud proof submitted to Bitcoin
   - Slash malicious operators

### Security Model
- **Honest majority:** 1-of-n operators honest = funds safe
- **Collateral:** Operators stake 150% of bridged value
- **Insurance pool:** Shared risk for large withdrawals
- **Time delays:** 24hr for <10 BTC, 14 days for >100 BTC

### Implementation Phases

**Phase 1: Federated (Q2 2026)**
- 5-of-9 multisig
- No BitVM yet
- Fast deployment

**Phase 2: Optimistic (Q4 2026)**
- Add BitVM fraud proofs
- Challenge period enabled
- Gradual decentralization

**Phase 3: ZK-Verified (2027+)**
- OP_CAT activated
- STARK proof verification
- Minimal trust assumptions

### Code Structure
```
/contracts
  /bridge
    Bridge.sol          # L2 bridge contract
    Vault.sol           # L1 vault contract
  /bitvm
    Verifier.ts         # Fraud proof verifier
    Challenge.ts        # Challenge protocol
  /runes
    Indexer.ts          # Runes UTXO tracking
    Transfer.ts         # Runes transfer logic
```

---

## 11. Protocol Upgrade Mechanism

### Version Negotiation
- Nodes announce supported features via P2P handshake
- Soft fork detection via block version bits
- Graceful degradation for unsupported features

### Soft Fork Strategy
1. **Signal readiness** (80% hashrate threshold)
2. **Activate** (2-week grace period)
3. **Enforce** (new rules mandatory)

### Emergency Updates
- Federation can pause bridge (2-of-5 multisig)
- 48-hour timelock for critical fixes
- User exit always available

---

## Research Sources

- Bitcoin Optech Newsletters (#386-#396)
- Lightning BOLTs specifications
- StarkWare Bitcoin research
- Galaxy Research OP_CAT/CTV analysis
- BitVM whitepaper (Aumayr et al.)
- Fedimint documentation
- MIT DCI DLC research
- Lightning Labs Taproot Assets v0.6 release notes

---

*Research completed: March 14, 2026*  
*Next review: June 2026*