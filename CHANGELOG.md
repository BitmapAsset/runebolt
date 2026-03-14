# Changelog

All notable changes to RuneBolt will be documented in this file.

## [0.1.0] - 2026-03-14

### Initial Release - Lightning Deed Protocol

First public release of RuneBolt, the non-custodial instant Bitcoin asset transfer protocol.

### Added

**Core Protocol**
- Lightning Deed Protocol (LDP) implementation — atomic asset transfers via HTLC preimage binding
- HTLC PSBT builder for lock, claim, and refund transactions (P2WSH + Taproot)
- Preimage generation with `crypto.randomBytes(32)` and SHA-256 payment hashes
- Configurable CLTV timeout (default 144 blocks / ~24h)
- In-memory swap state tracking with automatic expiry detection

**Backend API (26 endpoints)**
- Health and status monitoring (`/api/health`, `/api/status`)
- Lightning operations — invoice creation, payment, decode, status polling
- Runes indexer via Unisat Open API — real balance lookups with 30s cache
- HTLC bridge — create address, build lock/claim/refund PSBTs, swap tracking
- Legacy relay bridge — asset listing, fee calculation, transfer initiation
- Input validation on all endpoints (Zod schemas)
- WebSocket support for real-time swap updates

**Frontend**
- Next.js 16 static site with React 19
- 4 themed asset pages: Billy (BDC), DOG, Bitmap, BRC-20
- Wallet integration: UniSat, Xverse, Leather, OKX
- Real-time asset dashboard with balance fetching
- 3D asset cards with tilt, flip, and QR code display
- Lightning bolt animations, particle effects, glitch text
- Energy background and visual effects system
- Mobile-responsive design with touch interactions

**Infrastructure**
- Docker and Docker Compose deployment (bitcoind + LND + RuneBolt)
- Voltage LND managed node support
- Static frontend export for Vercel/CDN deployment
- Multi-stage Docker build (no dev deps in production)

**Security**
- Non-custodial architecture — assets never held by RuneBolt
- Atomic swap guarantees via HTLC preimage mechanism
- Automatic log redaction for secrets (macaroons, preimages, keys)
- Rate limiting and connection caps (200 WS, 100KB body limit)
- SSRF prevention via input sanitization
- Comprehensive security documentation and threat model

**Documentation**
- Lightning Deed Protocol whitepaper (`docs/LDP-WHITEPAPER.md`)
- System architecture guide (`docs/ARCHITECTURE.md`)
- Security documentation with threat model (`docs/SECURITY.md`)
- Launch checklist and deployment guide

### Supported Assets
- **Runes** — fungible Bitcoin tokens (DOG, etc.)
- **Ordinals** — Bitcoin NFT inscriptions
- **Bitmap** — metaverse block ownership
- **BRC-20** — inscription-based fungible tokens

### Known Limitations
- Swap store is in-memory (Redis planned for production)
- Bitmap detection is basic (inscription content matching)
- Transaction broadcasting is client-side only (non-custodial by design)

---

*RuneBolt by [Block Genomics](https://blockgenomics.io)*
