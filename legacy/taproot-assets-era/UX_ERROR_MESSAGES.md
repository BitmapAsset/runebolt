# RuneBolt User-Friendly Error Messages

*Complete copy library for all error scenarios*

---

## Error Message Principles

### Voice and Tone
- **Friendly but not apologetic** — "Here's what happened" not "We're sorry"
- **Action-oriented** — Always provide a next step
- **Plain English** — No jargon, no technical terms
- **Reassuring** — When funds are safe, say so clearly

### Format Template
```
[Icon]
[Clear Headline]
[Explanation in plain language]
[Primary Action Button]
[Secondary Option (if applicable)]
```

---

## Connection Errors

### Wallet Not Detected

**Before:**
```
Error: No wallet provider detected
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         🔌                          │
│                                     │
│    Connect your wallet              │
│                                     │
│    We need to connect to your       │
│    Bitcoin wallet to continue.      │
│                                     │
│    [Connect Wallet]                 │
│                                     │
│    Don't have a wallet?             │
│    Create an account with email →   │
│                                     │
└─────────────────────────────────────┘
```

---

### Connection Rejected

**Before:**
```
User rejected connection request
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         🚫                          │
│                                     │
│    Connection declined              │
│                                     │
│    You declined the connection      │
│    in your wallet. That's okay!     │
│                                     │
│    [Try Again]                      │
│                                     │
│    Or create an account with email  │
│                                     │
└─────────────────────────────────────┘
```

---

### Wallet Locked

**Before:**
```
Wallet locked or not authorized
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         🔒                          │
│                                     │
│    Unlock your wallet               │
│                                     │
│    Your wallet is locked.           │
│    Please unlock it and try again.  │
│                                     │
│    [Open Wallet]                    │
│                                     │
│    Need help? Contact support       │
│                                     │
└─────────────────────────────────────┘
```

---

### Network Mismatch

**Before:**
```
Wrong network: expected mainnet
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         🌐                          │
│                                     │
│    Switch to Bitcoin Mainnet        │
│                                     │
│    Your wallet is on the wrong      │
│    network. Please switch to        │
│    Bitcoin Mainnet in your wallet   │
│    settings.                        │
│                                     │
│    [Open Wallet Settings]           │
│                                     │
│    Need help switching networks?    │
│                                     │
└─────────────────────────────────────┘
```

---

## Transaction Errors

### Insufficient Funds

**Before:**
```
Insufficient DOG balance
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         💸                          │
│                                     │
│    Not enough DOG                   │
│                                     │
│    You need 1,500 more DOG          │
│    to complete this send.           │
│                                     │
│    Your balance: 500 DOG            │
│    Amount to send: 2,000 DOG        │
│                                     │
│    [Add DOG]                        │
│                                     │
│    Or send 500 DOG instead          │
│                                     │
└─────────────────────────────────────┘
```

---

### No Active Account (Channel Not Open)

**Before:**
```
No active channel found
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         🚀                          │
│                                     │
│    Add DOG to start sending         │
│                                     │
│    Your account needs DOG to send   │
│    instant payments. Add at least   │
│    1,000 DOG to get started.        │
│                                     │
│    [Add DOG Now]                    │
│                                     │
│    Why do I need to add DOG? →      │
│                                     │
└─────────────────────────────────────┘
```

---

### Transfer Failed (General)

**Before:**
```
Transfer failed: channel state error
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         ⚠️                          │
│                                     │
│    Something went wrong             │
│                                     │
│    Don't worry — your DOG is safe   │
│    in your account. This sometimes  │
│    happens. Try again in a few      │
│    seconds.                         │
│                                     │
│    [Try Again]                      │
│                                     │
│    Still not working? Get help →    │
│                                     │
└─────────────────────────────────────┘
```

---

### Recipient Not Found

**Before:**
```
Recipient pubkey not found
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         🔍                          │
│                                     │
│    We couldn't find @username       │
│                                     │
│    Check the spelling or ask them   │
│    to join RuneBolt.                │
│                                     │
│    [Search Again]                   │
│                                     │
│    Send a claim link instead →      │
│                                     │
│    "Claim links let you send DOG    │
│     to anyone, even if they don't   │
│     have RuneBolt yet."             │
│                                     │
└─────────────────────────────────────┘
```

---

### Amount Too Small

**Before:**
```
Amount below dust limit
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         🪙                          │
│                                     │
│    Amount too small                 │
│                                     │
│    The minimum send is 100 DOG.     │
│    Please enter a larger amount.    │
│                                     │
│    [Update Amount]                  │
│                                     │
│    Why is there a minimum? →        │
│                                     │
└─────────────────────────────────────┘
```

---

## Bitcoin L1 Errors

### Funding Transaction Pending

**Before:**
```
Funding transaction not confirmed
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         ⏳                          │
│                                     │
│    Your deposit is on the way!      │
│                                     │
│    Bitcoin is processing your       │
│    deposit. It'll be ready in       │
│    about 10 minutes.                │
│                                     │
│    [View on Mempool]                │
│                                     │
│    Status: 0/1 confirmations        │
│                                     │
└─────────────────────────────────────┘
```

---

### Mempool Congestion

**Before:**
```
High fee environment
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         🐌                          │
│                                     │
│    Bitcoin is busy right now        │
│                                     │
│    The network is experiencing      │
│    high traffic. Your transaction   │
│    may take longer than usual.      │
│                                     │
│    Estimated wait: 30-60 minutes    │
│                                     │
│    [Speed Up (Higher Fee)]          │
│                                     │
│    I'll wait for the normal fee     │
│                                     │
└─────────────────────────────────────┘
```

---

## API / System Errors

### Service Unavailable

**Before:**
```
500 Internal Server Error
```

**After:**
```
┌─────────────────────────────────────┐
│                                     │
│         🔧                          │
│                                     │
│    We're having trouble             │
│                                     │
│    Something went wrong on our      │
│    end. Don't worry — your DOG      │
│    is safe. Please try again in     │
│    a few minutes.                   │
│                                     │
│    [Try Again]                      │
│                                     │
│    Status page: status.runebolt.io  │
│                                     │
└─────────────────────────────────────┘
```

---

## Implementation Notes

### Priority Order
1. **P0:** All transaction errors (most frequent)
2. **P1:** Connection errors (onboarding critical)
3. **P2:** On-chain errors (less frequent)
4. **P3:** Edge cases (expired claims, etc.)

### Key Principles Applied
- All technical terms replaced with plain English
- Every error provides a clear next action
- Reassurance when funds are safe
- Contextual help where needed