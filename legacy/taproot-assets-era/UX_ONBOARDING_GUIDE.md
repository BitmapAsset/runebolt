# RuneBolt Onboarding Checklist & Tutorial Content

*Complete implementation guide for user onboarding*

---

## Onboarding Implementation Checklist

### Phase 1: Critical Path (P0)

#### Account Creation
- [ ] Social login integration (Google OAuth)
- [ ] Social login integration (Apple Sign-In)
- [ ] Email/password with Magic Link
- [ ] Bitcoin wallet connect (Unisat)
- [ ] Bitcoin wallet connect (Xverse)
- [ ] Bitcoin wallet connect (Leather)
- [ ] Wallet detection and auto-prompt
- [ ] Fallback when no wallet detected

#### Username System
- [ ] Username availability check API
- [ ] Real-time validation (as-you-type)
- [ ] Reserved username list (admin, support, etc.)
- [ ] Minimum length: 3 characters
- [ ] Maximum length: 20 characters
- [ ] Allowed characters: a-z, 0-9, underscore, hyphen
- [ ] Case-insensitive storage, lowercase display
- [ ] Username change policy (limited free changes)

#### Core Flow
- [ ] Sub-90 second path to first transaction
- [ ] Progress indicator (Step 1 of 3)
- [ ] Skip deposit option for exploration
- [ ] No mandatory email verification for basic use
- [ ] Persistent session (stay logged in)
- [ ] Biometric auth option (Face ID / Touch ID)

### Phase 2: Funding & Activation (P1)

#### Deposit Options
- [ ] Simple address display (runebolt.io/username)
- [ ] QR code generation
- [ ] Copy to clipboard with feedback
- [ ] Share sheet integration
- [ ] Minimum deposit enforcement (1,000 DOG)
- [ ] Deposit status tracking
- [ ] Push notification on deposit arrival

#### Fiat On-Ramp
- [ ] MoonPay integration
- [ ] Transak integration
- [ ] KYC flow for card purchases
- [ ] Purchase limits clearly displayed
- [ ] Fee transparency upfront
- [ ] Support for major currencies (USD, EUR, GBP)

#### Channel Activation
- [ ] Auto-open channel on first deposit
- [ ] Hide channel details from user
- [ ] Show "activating" state during setup
- [ ] Clear "ready to send" confirmation

### Phase 3: Polish (P2)

#### Education
- [ ] Tooltip system for key concepts
- [ ] Contextual help buttons
- [ ] Video tutorial library (optional)
- [ ] FAQ section accessible from onboarding

#### Social Features
- [ ] Contact import (optional)
- [ ] Find friends on RuneBolt
- [ ] Referral code system
- [ ] Share referral link

#### Trust Signals
- [ ] Security badge display
- [ ] Non-custodial explanation
- [ ] Open source link
- [ ] Audit information (when available)

---

## Tutorial Content Library

### Welcome Modal (First Open)

```
┌─────────────────────────────────────┐
│                                     │
│         ⚡                          │
│                                     │
│    Welcome to RuneBolt!             │
│                                     │
│    Send DOG instantly to anyone,    │
│    anywhere. No fees, no waiting.   │
│                                     │
│    [Get Started - Free]             │
│                                     │
│    Takes 60 seconds                 │
│                                     │
└─────────────────────────────────────┘
```

---

### Username Selection Tooltip

```
┌─────────────────────────────────────┐
│                                     │
│    Choose your RuneBolt name        │
│                                     │
│    @satoshi                         │
│    ✅ Available!                     │
│                                     │
│    ┌───────────────────────────┐    │
│    │ 💡 This is like a handle  │    │
│    │    on social media.       │    │
│    │                           │    │
│    │    Friends can send you   │    │
│    │    DOG using just your    │    │
│    │    username — no long     │    │
│    │    addresses needed!      │    │
│    └───────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

### First Deposit Education

```
┌─────────────────────────────────────┐
│                                     │
│    Add DOG to your account          │
│                                     │
│    Your address:                    │
│    runebolt.io/satoshi              │
│    [Copy]                           │
│                                     │
│    ┌───────────────────────────┐    │
│    │ 💡 How this works:        │    │
│    │                           │    │
│    │ 1. Send DOG to your       │    │
│    │    address above          │    │
│    │                           │    │
│    │ 2. It arrives in ~10      │    │
│    │    minutes                │    │
│    │                           │    │
│    │ 3. Then you can send      │    │
│    │    instantly!             │    │
│    └───────────────────────────┘    │
│                                     │
│    Minimum: 1,000 DOG               │
│                                     │
└─────────────────────────────────────┘
```

---

### First Send Tutorial (Overlay)

```
┌─────────────────────────────────────┐
│  ╔═══════════════════════════════╗  │
│  ║  👆 Tap here to search for    ║  │
│  ║     friends by username       ║  │
│  ║                               ║  │
│  ║  Try "@mike" or "@sarah"      ║  │
│  ╚═══════════════════════════════╝  │
│                                     │
│   [Search @username or name    ]    │
│                                     │
│   Recent                            │
│   [No recent contacts yet]          │
│                                     │
│   [Skip Tutorial]                   │
│                                     │
└─────────────────────────────────────┘
```

---

### Send Confirmation Tutorial

```
┌─────────────────────────────────────┐
│                                     │
│   Send 1,000 DOG to @mike?          │
│                                     │
│   🍕 Dinner split                   │
│                                     │
│   ┌───────────────────────────┐     │
│   │ 💡 What happens next:     │     │
│   │                           │     │
│   │ • Mike receives DOG       │     │
│   │   instantly               │     │
│   │                           │     │
│   │ • No fees, no waiting     │     │
│   │                           │     │
│   │ • You can see it in your  │     │
│   │   history anytime         │     │
│   └───────────────────────────┘     │
│                                     │
│   [Send Instantly]                  │
│                                     │
└─────────────────────────────────────┘
```

---

### Success Celebration

```
┌─────────────────────────────────────┐
│                                     │
│         🎉                          │
│                                     │
│    Sent!                            │
│                                     │
│    @mike received                   │
│    1,000 DOG                        │
│    instantly                        │
│                                     │
│    🍕 Dinner split                  │
│                                     │
│    ┌───────────────────────────┐    │
│    │ 💡 That's it! You just    │    │
│    │    sent DOG faster than   │    │
│    │    a bank transfer.       │    │
│    │                           │    │
│    │    Try receiving next:    │    │
│    │    Share runebolt.io/     │    │
│    │    [your-username]        │    │
│    └───────────────────────────┘    │
│                                     │
│    [Send More]  [Share My Link]     │
│                                     │
└─────────────────────────────────────┘
```

---

## Contextual Tooltips

### What is RuneBolt?

```
💡 RuneBolt lets you send DOG (a Bitcoin token) instantly
to anyone with a username — no complex addresses,
no waiting for confirmations.

Think Venmo, but for DOG on Bitcoin.
```

---

### Is My DOG Safe?

```
🔒 Yes! RuneBolt is non-custodial, which means:

• Only YOU control your DOG
• We can't freeze or take your funds
• You can withdraw anytime to any wallet

Your DOG is secured by Bitcoin's technology.
```

---

### Why Do I Need to Add DOG First?

```
💡 To enable instant sends, we create a "channel" 
with your DOG. This is like loading a prepaid card.

• Your DOG stays in your control
• You can withdraw anytime
• Minimum 1,000 DOG to start

Without this, you'd wait 10+ minutes per send!
```

---

### What's the Difference From Regular Bitcoin?

```
💡 Regular Bitcoin = slow (10+ min) but works everywhere
RuneBolt = instant but requires both users to have it

Use RuneBolt when:
• Sending to friends on RuneBolt
• Need instant confirmation
• Small to medium amounts

Use regular Bitcoin when:
• Sending to any Bitcoin address
• Large amounts
• Don't need instant confirmation
```

---

### Claim Links Explained

```
💡 A claim link lets you send DOG to anyone —
even if they don't have RuneBolt yet!

They click the link → create account in 30 seconds
→ DOG appears in their wallet

Great for introducing friends to DOG!
```

---

## Progressive Disclosure Strategy

### Beginner Mode (Default)
- Show only essential features
- Hide advanced options
- Use simple terminology
- Show educational tooltips

### Intermediate Mode (After 5+ transactions)
- Reveal transaction details
- Show fee breakdowns
- Enable advanced settings option
- Reduce tooltip frequency

### Advanced Mode (User-activated)
- Show channel details
- Enable custom fee selection
- Reveal raw transaction data
- Export functionality

---

## User Onboarding Email Sequence

### Email 1: Welcome (Immediate)

**Subject:** Welcome to RuneBolt! Here's how to get started

```
Hi [Username],

Welcome to RuneBolt! You're now part of the instant
DOG payment revolution.

Your RuneBolt address: runebolt.io/[username]

Share this with friends so they can send you DOG!

What's next?
1. Add DOG to your account
2. Send your first payment
3. Invite friends (earn rewards!)

[Add DOG Now]

Questions? Reply to this email — we're here to help!

The RuneBolt Team
```

---

### Email 2: First Send Tips (Day 2)

**Subject:** Pro tips for sending DOG instantly

```
Hi [Username],

You've got DOG in your account — awesome!

Here are some tips for your first send:

✅ Just search @username (no addresses needed!)
✅ Add a memo so they know what it's for
✅ Claim links work for anyone, even non-users

Try sending DOG to a friend today!

[Open RuneBolt]

Cheers,
The RuneBolt Team
```

---

### Email 3: Security Check (Day 7)

**Subject:** Keep your DOG safe — quick security tips

```
Hi [Username],

Your DOG is valuable! Here's how to keep it safe:

🔒 If you created an email account:
   • Use a strong, unique password
   • Enable 2FA in settings

🔐 If you connected a wallet:
   • Keep your seed phrase safe
   • Never share your private key

🛡️ General tips:
   • Verify usernames before sending
   • Check URLs (runebolt.io only!)

[Review Security Settings]

Stay safe!
The RuneBolt Team
```

---

### Email 4: Invite Friends (Day 14)

**Subject:** Invite friends, earn DOG

```
Hi [Username],

Love using RuneBolt? Invite your friends!

For each friend who joins and sends their first
payment, you both get 500 DOG.

Your referral link:
runebolt.io/invite/[code]

Share it anywhere:
• Twitter/X
• WhatsApp
• Email

[Share Now]

Thanks for spreading the word!
The RuneBolt Team
```

---

## In-App Help System

### Help Button Placement
- Always visible in header (question mark icon)
- Contextual help on every screen
- Shake to report issue (mobile)

### Help Categories

#### Getting Started
- How do I create an account?
- How do I add DOG?
- How do I send DOG?
- How do I receive DOG?

#### Troubleshooting
- My deposit hasn't arrived
- Transaction failed
- Can't connect wallet
- Forgot password

#### Security
- Is RuneBolt safe?
- How do I back up my account?
- What if I lose access?
- How to report suspicious activity

#### Advanced
- How do channels work?
- Can I export my transactions?
- How do fees work?
- API documentation

---

## Success Metrics for Onboarding

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion rate | >70% | % who finish signup |
| Time to first transaction | <90 sec | Analytics funnel |
| Email verification rate | >60% | Email events |
| Deposit completion rate | >50% | % who fund account |
| First send within 24h | >40% | Transaction data |
| Support tickets during onboarding | <5% | Support system |
| User error rate | <10% | Error tracking |
| NPS after first week | >40 | In-app survey |

---

## A/B Testing Ideas

### Onboarding Flow
- Social login first vs wallet connect first
- Username selection: before vs after deposit
- Progress indicator: steps vs percentage
- Skip deposit: available vs not available

### Copy Variations
- "Get Started - Free" vs "Create Account"
- "Add DOG" vs "Deposit Funds"
- "Channel" vs "Payment Account"
- Technical vs friendly tone

### Visual Design
- Light mode vs dark mode default
- Animation complexity
- Button placement
- Success celebration style

---

*Checklist created for RuneBolt UX Mass Adoption initiative*