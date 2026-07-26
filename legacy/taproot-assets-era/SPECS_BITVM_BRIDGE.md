# Technical Specification: BitVM Bridge for Runes

**Document Version:** 1.0  
**Date:** March 14, 2026  
**Author:** RuneBolt Protocol Research Team  
**Status:** Draft for Review

---

## 1. Executive Summary

This specification defines a trust-minimized bridge architecture enabling Runes to move between Bitcoin L1 and RuneBolt L2 using BitVM fraud proofs. This approach provides 1-of-n security guarantees without requiring Bitcoin soft forks.

---

## 2. Objectives

1. Enable fast, cheap Runes transfers on RuneBolt L2
2. Maintain Bitcoin-level security for deposits/withdrawals
3. No trusted custodians (1-of-n honesty assumption)
4. Upgradeable toward ZK verification post-OP_CAT

---

## 3. Architecture Overview

### 3.1 High-Level Design

```
                    ┌──────────────────────────────────────────┐
                    │           BITCOIN MAINNET                │
                    │  ┌─────────────────────────────────┐     │
                    │  │      Runes Vault Contract       │     │
                    │  │  (Taproot multisig + BitVM)     │     │
                    │  └─────────────────────────────────┘     │
                    └──────────────────────────────────────────┘
                                    ▲
                                    │ Fraud Proofs / Challenges
                                    │ (14-day window)
                                    ▼
┌──────────────┐      ┌──────────────────────────────────────────┐
│   Users      │      │           OPERATOR SET (n=7)             │
│              │─────▶│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│  Deposit/    │      │  │ Op1 │ │ Op2 │ │ Op3 │ │...  │        │
│  Withdraw    │◀─────│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘        │
└──────────────┘      │     └───────┴───────┴───────┘           │
                      │              │                           │
                      └──────────────┼───────────────────────────┘
                                     │
                                     ▼ State Updates
                    ┌──────────────────────────────────────────┐
                    │           RUNEBOLT L2                    │
                    │  ┌─────────────────────────────────┐     │
                    │  │      Bridge Smart Contract      │     │
                    │  │   (Runes balances, exits)       │     │
                    │  └─────────────────────────────────┘     │
                    └──────────────────────────────────────────┘
```

### 3.2 Component Breakdown

| Component | Location | Function |
|-----------|----------|----------|
| Runes Vault | Bitcoin L1 | Holds deposited Runes in Taproot output |
| Bridge Contract | RuneBolt L2 | Manages L2 balances, processes withdrawals |
| Operator Set | Distributed | Validate state, sign withdrawals, watch for fraud |
| BitVM Verifier | Bitcoin L1 | Validates fraud proofs during challenge period |
| Runes Indexer | RuneBolt L2 | Tracks Runes UTXOs and ownership |

---

## 4. Detailed Specifications

### 4.1 Deposit Flow

```
Step 1: User deposits Runes to Vault Address
        └─▶ Runes locked in Taproot output

Step 2: Operators index deposit (6 confirmations)
        └─▶ Generate L2 minting transaction

Step 3: L2 Bridge Contract mints wrapped Runes
        └─▶ User receives L2 balance

Time: ~60 minutes (6 Bitcoin blocks)
```

**Bitcoin Script (Vault Output):**
```bitcoin-script
OP_IF
    # Normal path: Operators sign withdrawal
    OP_5  # 5-of-7 threshold
    <pubkey1> <pubkey2> ... <pubkey7>
    OP_7
    OP_CHECKMULTISIG
OP_ELSE
    # Fraud proof path: BitVM verification
    OP_1
    <bitvm_commitment>
    OP_CHECKSEQUENCEVERIFY
    OP_DROP
    # User can exit after timeout if fraud proven
OP_ENDIF
```

### 4.2 Withdrawal Flow

```
Step 1: User initiates withdrawal on L2
        └─▶ Balance locked for 14 days

Step 2: Operators co-sign withdrawal tx
        └─▶ Published to Bitcoin mempool

Step 3: Challenge period (14 days)
        └─▶ Anyone can submit fraud proof

Step 4: If no challenge: withdrawal completes
        └─▶ User receives Runes on L1

Step 5: If challenged: BitVM arbitration
        └─▶ Honest party wins via fraud proof
```

### 4.3 Fraud Proof Mechanism

**BitVM Circuit Logic:**
```rust
pub struct WithdrawalProof {
    pub l2_block_height: u64,
    pub l2_state_root: [u8; 32],
    pub withdrawal_tx: Transaction,
    pub merkle_proof: MerkleProof,
    pub user_signature: Signature,
}

impl BitVMCircuit for WithdrawalProof {
    fn verify(&self) -> Result<(), FraudError> {
        // 1. Verify L2 state root is valid
        verify_state_root(self.l2_block_height, self.l2_state_root)?;
        
        // 2. Verify withdrawal exists in state
        verify_merkle_proof(
            self.withdrawal_tx.hash(),
            self.l2_state_root,
            self.merkle_proof
        )?;
        
        // 3. Verify user authorized withdrawal
        verify_signature(
            self.user_signature,
            self.withdrawal_tx.hash(),
            self.withdrawal_tx.from
        )?;
        
        // 4. Verify amount matches L2 balance
        verify_sufficient_balance(
            self.withdrawal_tx.from,
            self.withdrawal_tx.amount,
            self.l2_state_root
        )?;
        
        Ok(())
    }
}
```

**Challenge Process:**
1. Challenger posts bond (1 BTC)
2. Challenger submits fraud proof within 14 days
3. BitVM verifier checks proof on Bitcoin
4. If valid: operators slashed, challenger rewarded
5. If invalid: challenger loses bond

---

## 5. Security Model

### 5.1 Threat Scenarios

| Threat | Mitigation |
|--------|------------|
| Operator theft | 5-of-7 multisig + BitVM challenge |
| Operator collusion | 1-of-7 honest operator prevents theft |
| Invalid state transition | Fraud proofs slash malicious operators |
| Liveness failure | Emergency exit after 30 days |
| Censorship | Anyone can challenge, not just operators |

### 5.2 Economic Security

**Collateral Requirements:**
- Each operator stakes: 100 BTC
- Total collateral pool: 700 BTC
- Maximum bridge TVL: 500 BTC (70% collateral ratio)
- Insurance fund: 50 BTC from fees

**Slashing Conditions:**
- Invalid withdrawal attempt: 100% slash
- Failure to challenge fraud: 50% slash
- Extended downtime (>72 hours): 25% slash

### 5.3 Emergency Procedures

**Scenario 1: Mass Operator Exit**
```
If operators < 5 remain active:
    - Bridge pauses new withdrawals
    - Users can exit via emergency withdrawal
    - 7-day timelock for safety
```

**Scenario 2: Critical Bug Discovery**
```
If critical vulnerability found:
    - 2-of-5 multisig pauses bridge
    - 48-hour fix window
    - If unpatched: emergency exit activates
```

---

## 6. Runes Integration

### 6.1 UTXO Tracking

```typescript
interface RunesUTXO {
    txid: string;
    vout: number;
    runeId: string;
    amount: bigint;
    divisibility: number;
    lockScript: Buffer;
}

class RunesIndexer {
    private utxos: Map<string, RunesUTXO>;
    
    async indexBlock(blockHeight: number): Promise<void> {
        const block = await this.bitcoin.getBlock(blockHeight);
        
        for (const tx of block.transactions) {
            // Check for Runes protocol in OP_RETURN
            const runesData = this.parseRunesData(tx);
            if (runesData) {
                await this.processRunesTx(tx, runesData);
            }
        }
    }
    
    private async processRunesTx(tx: Transaction, data: RunesData): Promise<void> {
        // Handle etching, minting, transferring
        switch (data.opcode) {
            case 'ETCH':
                this.registerRune(data.rune);
                break;
            case 'MINT':
                this.addToBalance(data.to, data.runeId, data.amount);
                break;
            case 'TRANSFER':
                this.transferBalance(data.from, data.to, data.runeId, data.amount);
                break;
        }
    }
}
```

### 6.2 L2 Runes Representation

```solidity
contract L2Runes is ERC20 {
    struct RuneInfo {
        bytes32 runeId;
        string symbol;
        uint8 divisibility;
        uint256 l1Supply;
        uint256 l2Supply;
    }
    
    mapping(bytes32 => RuneInfo) public runes;
    mapping(address => mapping(bytes32 => uint256)) public balances;
    
    function mint(bytes32 runeId, address to, uint256 amount) external onlyBridge {
        balances[to][runeId] += amount;
        runes[runeId].l2Supply += amount;
        emit Mint(runeId, to, amount);
    }
    
    function burn(bytes32 runeId, uint256 amount) external {
        balances[msg.sender][runeId] -= amount;
        runes[runeId].l2Supply -= amount;
        emit Burn(runeId, msg.sender, amount);
    }
}
```

---

## 7. Implementation Roadmap

### Phase 1: MVP (Q2 2026)
- [ ] 5-of-9 federated multisig (no BitVM)
- [ ] Basic deposit/withdrawal
- [ ] Runes indexing
- [ ] L2 bridge contract
- **Security:** Federated trust model

### Phase 2: BitVM Integration (Q4 2026)
- [ ] BitVM verifier implementation
- [ ] Challenge/response protocol
- [ ] Fraud proof generation
- [ ] Operator slashing
- **Security:** 1-of-n honesty assumption

### Phase 3: Decentralization (2027)
- [ ] Permissionless operator set
- [ ] Dynamic operator rotation
- [ ] OP_CAT optimization (if activated)
- **Security:** Fully trust-minimized

### Phase 4: ZK Verification (2027+)
- [ ] STARK proof verification
- [ ] Instant withdrawals (no challenge period)
- [ ] Recursive bridging
- **Security:** Cryptographic guarantees

---

## 8. API Specification

### 8.1 Deposit Endpoint

```http
POST /api/v1/bridge/deposit
Content-Type: application/json

{
    "runeId": "AWESOME•RUNE•TOKEN",
    "amount": "1000000",
    "l2Address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "returnAddress": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
}

Response:
{
    "depositAddress": "bc1q...",
    "expiresAt": "2026-03-21T15:30:00Z",
    "minConfirmations": 6,
    "estimatedTime": "3600"
}
```

### 8.2 Withdrawal Endpoint

```http
POST /api/v1/bridge/withdraw
Content-Type: application/json
Authorization: Bearer {jwt}

{
    "runeId": "AWESOME•RUNE•TOKEN",
    "amount": "500000",
    "l1Address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
}

Response:
{
    "withdrawalId": "wd_abc123",
    "status": "pending",
    "challengePeriodEnd": "2026-03-28T15:30:00Z",
    "estimatedCompletion": "2026-03-28T15:30:00Z"
}
```

### 8.3 Status Endpoint

```http
GET /api/v1/bridge/status/{withdrawalId}

Response:
{
    "withdrawalId": "wd_abc123",
    "status": "completed", // pending, challenging, completed, failed
    "l1Txid": "a1b2c3d4...",
    "amount": "500000",
    "runeId": "AWESOME•RUNE•TOKEN",
    "confirmedAt": "2026-03-28T14:15:00Z"
}
```

---

## 9. Testing Strategy

### 9.1 Testnet Deployment
- Bitcoin Signet for L1 testing
- RuneBolt testnet for L2 testing
- Mock BitVM for rapid iteration

### 9.2 Security Audit Checklist
- [ ] Smart contract audit (OpenZeppelin or Trail of Bits)
- [ ] BitVM circuit formal verification
- [ ] Cryptographic review of fraud proofs
- [ ] Economic attack simulation
- [ ] Stress test with 1000+ concurrent withdrawals

### 9.3 Bug Bounty Program
- Critical: $500,000 (theft of funds)
- High: $100,000 (denial of service)
- Medium: $25,000 (information disclosure)
- Low: $5,000 (best practices)

---

## 10. References

1. BitVM: Aanyhr et al. - "BitVM: Quasi-Turing Complete Computation on Bitcoin" (2024)
2. Bitcoin Optech - Taproot Assets documentation
3. StarkWare - Bitcoin scaling research
4. BIP 347 - OP_CAT reactivation proposal
5. BIP 119 - OP_CTV covenant proposal
6. DLC Specifications - Discreet Log Contracts
7. Fedimint Protocol - Federated e-cash

---

## Appendix A: Glossary

- **BitVM**: Fraud proof-based computation on Bitcoin
- **Runes**: Fungible token protocol on Bitcoin
- **UTXO**: Unspent Transaction Output
- **Taproot**: Bitcoin upgrade enabling Schnorr signatures
- **Fraud Proof**: Cryptographic proof of invalid state transition
- **Challenge Period**: Time window for submitting fraud proofs
- **Operator**: Bridge validator node
- **Vault**: Smart contract holding deposited assets

---

*Specification Version 1.0 - March 14, 2026*