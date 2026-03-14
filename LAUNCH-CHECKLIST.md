# RuneBolt Launch Checklist

## Pre-Launch Tests

### Backend Verification
- [ ] `npm run build` completes without errors
- [ ] `node src/server.js` starts and connects to LND node
- [ ] `GET /api/health` returns `{ status: "ok" }`
- [ ] `GET /api/status` returns node info with synced chain
- [ ] `GET /api/lightning/info` returns node alias and pubkey
- [ ] `GET /api/runes/:address/balances` returns real balances from Unisat
- [ ] `POST /api/bridge/htlc/create` generates valid P2WSH address
- [ ] `POST /api/bridge/build-lock-tx` returns signable PSBT
- [ ] `POST /api/bridge/build-claim-tx` works with valid preimage
- [ ] `POST /api/bridge/build-refund-tx` works after timeout
- [ ] Lightning invoice creation and payment work end-to-end

### Frontend Verification
- [ ] `cd frontend && npm run build` produces static export in `dist/`
- [ ] Landing page loads with all visual effects
- [ ] Wallet connection works (UniSat, Xverse, Leather, OKX)
- [ ] Asset dashboard fetches and displays real balances
- [ ] QR code generation works for HTLC addresses
- [ ] All 4 themed asset pages load (`/bdc.html`, `/dog.html`, `/bitmap.html`, `/brc20.html`)
- [ ] Mobile responsiveness verified

### End-to-End Swap Test (Testnet)
- [ ] Create HTLC with test Rune asset
- [ ] Lock transaction signed and broadcast
- [ ] Lightning invoice created with matching payment hash
- [ ] Lightning payment completes and reveals preimage
- [ ] Claim transaction signed and broadcast with preimage
- [ ] Asset successfully transferred to recipient
- [ ] Test refund path: let HTLC timeout expire, reclaim funds

### Security Checks
- [ ] `.env` is in `.gitignore` (never committed)
- [ ] No hardcoded macaroons or private keys in source
- [ ] CORS restricted to allowed origins (not `*` in prod)
- [ ] Rate limiting configured
- [ ] TLS termination in place (nginx/caddy)
- [ ] LND gRPC/REST not publicly exposed

---

## Deployment Steps

### 1. Infrastructure Setup
```bash
# Provision server (Ubuntu 22.04+ recommended)
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo apt install docker-compose-plugin
```

### 2. Configure Environment
```bash
# Clone repo
git clone https://github.com/block-genomics/runebolt.git
cd runebolt

# Configure backend
cp .env.example .env
# Edit .env with production credentials:
#   VOLTAGE_REST_URL, VOLTAGE_MACAROON, NODE_PUBKEY, NODE_ALIAS
#   NETWORK=mainnet (or testnet for initial launch)
#   RUNEBOLT_PORT=3141
#   RUNEBOLT_FEE_RATE=0.003

# Configure frontend
cp frontend/.env.example frontend/.env.local
# Set NEXT_PUBLIC_RUNEBOLT_API_URL to production API URL
# Set NEXT_PUBLIC_NETWORK=testnet (switch to mainnet when ready)
```

### 3. Build and Deploy (Docker)
```bash
# Production deployment
docker compose up -d

# Verify all services are healthy
docker compose ps
docker compose logs runebolt --tail 50
```

### 4. Build and Deploy (Manual)
```bash
# Backend
npm install
npm run build
node src/server.js &

# Frontend
cd frontend
npm install
npm run build
# Serve dist/ with nginx or deploy to Vercel
```

### 5. Reverse Proxy (nginx)
```nginx
server {
    listen 443 ssl;
    server_name api.runebolt.xyz;

    ssl_certificate /etc/letsencrypt/live/api.runebolt.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.runebolt.xyz/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3141;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 6. Post-Deploy Verification
```bash
# Health check
curl https://api.runebolt.xyz/api/health

# Lightning node info
curl https://api.runebolt.xyz/api/lightning/info

# Test balance lookup
curl https://api.runebolt.xyz/api/runes/bc1q.../balances?network=testnet
```

---

## Monitoring

### Health Checks
- **API Health**: `GET /api/health` every 30s
- **LND Connection**: `GET /api/lightning/info` every 60s
- **Swap Expiry**: Monitor expired swaps via logs (auto-checked every 60s)

### Key Metrics to Watch
- API response times (P50, P95, P99)
- Active swap count
- Lightning channel capacity and balance
- Failed swap rate
- WebSocket connection count (max 200)
- Error rate by endpoint

### Log Monitoring
```bash
# Docker logs
docker compose logs -f runebolt

# Watch for errors
docker compose logs runebolt 2>&1 | grep -i error

# Watch swap activity
docker compose logs runebolt 2>&1 | grep -i swap
```

### Alerting Triggers
- API health check fails 3x consecutive
- Swap failure rate > 10% over 5 minutes
- Lightning channel balance below 100,000 sats
- Disk usage > 80%
- Memory usage > 80%

---

## Rollback Plan

### Quick Rollback (< 5 minutes)
```bash
# Stop current deployment
docker compose down

# Revert to previous version
git log --oneline -5  # find the previous good commit
git checkout <previous-commit>

# Restart
docker compose up -d
```

### Full Rollback
```bash
# 1. Stop the service
docker compose down

# 2. Revert code
git revert HEAD  # or git checkout <safe-tag>

# 3. Rebuild
docker compose build --no-cache

# 4. Restart
docker compose up -d

# 5. Verify
curl https://api.runebolt.xyz/api/health
```

### Emergency: Disable Swaps Only
If swaps are failing but the API should stay up:
1. Remove or comment out swap endpoints in `src/server.js`
2. Restart the server — health/balance endpoints continue working
3. Users can still check balances and view assets

### Data Recovery
- Swap state is in-memory (lost on restart) — no persistent data to recover
- LND state is managed by Voltage — contact Voltage support if LND issues
- On-chain HTLCs auto-refund after timeout — no manual intervention needed

---

## Launch Day Timeline

| Time | Action |
|------|--------|
| T-2h | Final testnet swap verification |
| T-1h | Deploy to production server |
| T-30m | Run full verification checklist above |
| T-15m | Test wallet connection from production frontend |
| T-0 | Announce launch on Twitter/X |
| T+15m | Monitor logs and metrics |
| T+1h | First status update |
| T+24h | Review first day metrics, address issues |

---

*RuneBolt v0.1.0 | Block Genomics*
