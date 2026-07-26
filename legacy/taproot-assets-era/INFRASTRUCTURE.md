# RuneBolt Production Infrastructure Architecture

**Version:** 1.0.0  
**Last Updated:** 2026-03-14  
**Target Uptime:** 99.99% (52.6 minutes downtime/year)  
**RTO (Recovery Time Objective):** 15 minutes  
**RPO (Recovery Point Objective):** 5 minutes

---

## Executive Summary

RuneBolt is a Bitcoin Layer 2 payment channel hub for DOG•GO•TO•THE•MOON Runes. This infrastructure is designed to handle financial transactions with bank-grade reliability, security, and compliance.

### Key Design Principles

1. **Defense in Depth** — Multiple security layers at every level
2. **Zero Trust** — No implicit trust between services or networks
3. **Immutable Infrastructure** — Version-controlled, reproducible deployments
4. **Observability First** — Every component emits metrics, logs, and traces
5. **Disaster Recovery** — Automated backups with tested restore procedures

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CDN Layer (CloudFlare)                         │
│                    DDoS Protection • WAF • SSL Termination                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Load Balancer (HAProxy)                           │
│                    Health Checks • Rate Limiting • SSL                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
┌───────▼────────┐           ┌─────────▼────────┐           ┌────────▼───────┐
│   Primary DC   │◄─────────►│  Vault Cluster   │◄─────────►│  DR Region     │
│ (NYC - do nyc1)│  Replicate│  (Consul Backend)│           │(SF - do sfo3)  │
└────────────────┘           └──────────────────┘           └────────────────┘
        │
        │    ┌──────────────────────────────────────────────────────┐
        │    │              Docker Swarm Cluster                     │
        │    ├─────────────┬─────────────┬─────────────┬─────────────┤
        │    │  API Nodes  │  Web Nodes  │  WS Nodes   │ Worker Nodes│
        │    │  (3x)       │  (3x)       │  (3x)       │  (2x)       │
        │    └─────────────┴─────────────┴─────────────┴─────────────┘
        │
        │    ┌──────────────────────────────────────────────────────┐
        │    │              Data Layer                               │
        │    ├─────────────┬─────────────┬─────────────┬─────────────┤
        │    │  PostgreSQL │   Redis     │   SQLite    │  MinIO      │
        │    │  (Primary)  │  (Cluster)  │  (Per-Node) │ (Backups)   │
        │    └─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## Component Breakdown

### 1. Frontend (Next.js)

| Aspect | Configuration |
|--------|---------------|
| Runtime | Node.js 20 LTS |
| Scaling | Horizontal (3 replicas minimum) |
| Memory | 512MB per container |
| CPU | 0.5 vCPU per container |
| Health Check | `/health` endpoint |

**Services:**
- Static asset serving (CDN cached)
- Server-side rendering for SEO
- API proxying to backend

### 2. Backend API (Node.js + Express)

| Aspect | Configuration |
|--------|---------------|
| Runtime | Node.js 20 LTS |
| Scaling | Horizontal (3 replicas minimum) |
| Memory | 1GB per container |
| CPU | 1 vCPU per container |
| Health Check | `/health` endpoint |

**Services:**
- REST API endpoints
- WebSocket real-time connections
- Channel management
- Bitcoin transaction coordination

### 3. Database Layer

#### PostgreSQL (Primary)
- **Version:** 15+
- **Mode:** Primary + 2 Standby replicas (synchronous replication)
- **Backup:** Continuous WAL archiving to S3
- **Connection Pooling:** PgBouncer (max 1000 connections)
- **Encryption:** At-rest (LUKS) + in-transit (TLS)

#### Redis (Cache + Sessions + PubSub)
- **Mode:** Redis Cluster (6 nodes: 3 masters, 3 replicas)
- **Persistence:** AOF + RDB snapshots
- **Memory:** 2GB per node
- **Use Cases:**
  - Session storage
  - Rate limiting counters
  - WebSocket pub/sub
  - Cache layer

#### SQLite (Per-Node)
- **Use:** Channel state machine persistence
- **Backup:** Hourly snapshots to object storage
- **Replication:** Application-level replication to standby

### 4. Message Queue (NATS)

- **Mode:** Cluster (3 nodes)
- **Persistence:** JetStream enabled
- **Use Cases:**
  - Async transaction processing
  - Bitcoin block notifications
  - Inter-service communication

---

## Security Architecture

### Network Security

```
Internet → CloudFlare → WAF → HAProxy → Internal Network
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              DMZ Network              Application Network        Data Network
              (Public)                    (Private)                (Isolated)
           ─────────────               ──────────────             ────────────
           HAProxy nodes                API containers            Databases
           VPN gateway                  Web containers            Vault
           Bastion host                 Worker nodes              Redis
```

### Secrets Management (HashiCorp Vault)

| Secret Type | Storage | Rotation | Access Pattern |
|-------------|---------|----------|----------------|
| API Keys | KV v2 | 90 days | AppRole + Kubernetes auth |
| DB Credentials | Database dynamic | 24 hours | Dynamic leases |
| Bitcoin Keys | Transit encryption | Manual | HSM-backed signing |
| TLS Certificates | PKI engine | 60 days | Auto-rotation |
| JWT Secrets | KV v2 | 30 days | AppRole |

### HSM Integration

For production Bitcoin key storage:
- **Option 1:** CloudHSM (AWS) or Cloud KMS (GCP)
- **Option 2:** Dedicated HSM (YubiHSM 2, Securosys Primus)
- **Integration:** Vault PKCS#11 provider

---

## Monitoring & Observability

### Metrics (Prometheus + Grafana)

| Metric Category | Examples |
|-----------------|----------|
| Application | Request rate, latency p95/p99, error rate |
| Business | Active channels, transfer volume, fees collected |
| Infrastructure | CPU, memory, disk I/O, network |
| Bitcoin | Mempool size, confirmation times, fee rates |

### Logging (Loki + Grafana)

- **Retention:** 30 days hot, 1 year cold (S3)
- **Levels:** ERROR, WARN, INFO, DEBUG
- **Fields:** `service`, `trace_id`, `user_id`, `channel_id`, `amount`
- **Alerting:** ERROR logs → PagerDuty

### Distributed Tracing (Jaeger)

- **Sampling:** 1% production, 100% canary
- **Spans:** All API calls, database queries, Bitcoin RPC

### Alerting Rules

```yaml
Critical (P1 - Page):
  - API error rate > 1%
  - Database replication lag > 30s
  - Bitcoin node sync > 10 blocks behind
  - Vault sealed/unavailable

High (P2 - Slack):
  - CPU > 80% for 5 minutes
  - Memory > 85% for 5 minutes
  - Disk > 80% full
  - SSL cert expires < 7 days

Medium (P3 - Email):
  - API latency p99 > 500ms
  - Backup failure
  - Rate limiting triggered
```

---

## Backup Strategy

### Backup Schedule

| Data Type | Frequency | Retention | Storage |
|-----------|-----------|-----------|---------|
| PostgreSQL | Continuous WAL + Daily full | 30 days hot, 1 year cold | S3 + Glacier |
| SQLite | Hourly snapshots | 7 days | S3 Standard |
| Redis | Daily RDB | 7 days | S3 Standard |
| Vault | Daily snapshot | 30 days | S3 + encrypted |
| Config/Terraform | Every change | Forever | Git + S3 |

### Disaster Recovery

**Scenario 1: Database Corruption**
1. Promote standby replica (RTO: 2 minutes)
2. Restore from WAL to point-in-time (RPO: <5 minutes)
3. Verify data integrity

**Scenario 2: Complete Region Failure**
1. DNS failover to DR region (RTO: 5 minutes)
2. Restore databases from cross-region backups
3. Rebuild containers from immutable images

**Scenario 3: Bitcoin Key Compromise**
1. Emergency channel closures
2. Rotate all keys via Vault
3. Audit all transactions

---

## Deployment Pipeline

### GitHub Actions Workflow

```
Push/PR
   │
   ▼
┌──────────────┐
│   Lint/Test  │  ← Unit tests, ESLint, TypeScript check
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Build Image │  ← Docker build, push to registry
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Security    │  ← Trivy scan, Snyk dependency check
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Staging    │  ← Deploy to staging, integration tests
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Production  │  ← Canary → 25% → 50% → 100%
└──────────────┘
```

### Deployment Strategy: Canary

1. Deploy to 5% of traffic
2. Monitor error rates, latency for 10 minutes
3. If healthy, increase to 25%, 50%, 100%
4. Automatic rollback on error rate > 0.1%

---

## Infrastructure as Code

### Terraform Structure

```
terraform/
├── environments/
│   ├── production/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── staging/
├── modules/
│   ├── networking/
│   ├── compute/
│   ├── database/
│   ├── vault/
│   └── monitoring/
└── backend.tf  # S3 state with DynamoDB locking
```

### State Management

- **Backend:** S3 with versioning
- **Locking:** DynamoDB
- **Encryption:** AES-256
- **Backup:** Daily to separate bucket

---

## SSL/TLS Architecture

### Certificate Management

| Layer | Certificate | Provider | Rotation |
|-------|-------------|----------|----------|
| CDN | Wildcard | Let's Encrypt (via Certbot) | 60 days |
| Load Balancer | Wildcard | Vault PKI | 90 days |
| Service-to-Service | mTLS | Vault PKI | 30 days |
| Database | Server + Client | Vault PKI | 90 days |

### Certificate Rotation Process

1. Vault generates new certificate
2. Deploy to service (rolling restart)
3. Verify connectivity
4. Revoke old certificate

---

## Multi-Region Strategy

### Primary Region: NYC (do-nyc1)
- Full deployment (API, Web, DB, Workers)
- Active traffic
- Real-time replication to DR

### DR Region: SF (do-sfo3)
- Standby databases (async replication)
- Pre-warmed container registry
- Vault replica cluster
- DNS failover ready

### Failover Process

1. Detect failure (monitoring alert)
2. Update DNS (Route53 health checks)
3. Promote DR database to primary
4. Scale up DR containers
5. Verify functionality
6. Traffic redirects automatically

---

## Capacity Planning

### Current Capacity (Per Region)

| Resource | Provisioned | Peak Usage | Headroom |
|----------|-------------|------------|----------|
| API Containers | 6 | 40% | 150% |
| Database CPU | 4 cores | 25% | 300% |
| Database Storage | 500GB | 15% | 550% |
| Redis Memory | 6GB | 30% | 200% |
| Bandwidth | 10Gbps | 10% | 900% |

### Scaling Triggers

- **Horizontal:** CPU > 70% for 5 minutes → +2 containers
- **Vertical:** DB connections > 80% → Upgrade instance
- **Storage:** > 70% full → Expand volume + notify

---

## Compliance & Auditing

### Audit Log Retention

| Event Type | Retention | Storage |
|------------|-----------|---------|
| Authentication | 7 years | Immutable S3 |
| Channel operations | 7 years | Immutable S3 |
| Transfers | 7 years | Immutable S3 |
| Admin actions | 3 years | S3 Glacier |
| System events | 1 year | S3 Standard |

### Security Scanning

- **Container Images:** Trivy on every build
- **Dependencies:** Snyk weekly
- **Infrastructure:** Terraform compliance (tfsec)
- **Penetration Testing:** Quarterly

---

## Cost Optimization

### Reserved Capacity

| Resource | Strategy | Savings |
|----------|----------|---------|
| Droplets | 1-year reserved | ~20% |
| Databases | 1-year reserved | ~15% |
| S3 | Intelligent tiering | ~40% |
| Bandwidth | CloudFlare caching | ~60% |

### Right-sizing

- Review resource usage weekly
- Auto-scale down during low traffic
- Use spot instances for batch workers

---

## Runbook Index

1. [Restart Services](./runbooks/01-restart-services.md)
2. [Database Restore](./runbooks/02-database-restore.md)
3. [Scale Infrastructure](./runbooks/03-scale-infrastructure.md)
4. [Vault Unseal](./runbooks/04-vault-unseal.md)
5. [SSL Certificate Rotation](./runbooks/05-ssl-rotation.md)
6. [Incident Response](./runbooks/06-incident-response.md)
7. [Bitcoin Node Recovery](./runbooks/07-bitcoin-recovery.md)

---

## Architecture Decision Records (ADRs)

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Docker Swarm over Kubernetes (simpler ops) | Accepted |
| ADR-002 | SQLite for channel state (speed + portability) | Accepted |
| ADR-003 | HashiCorp Vault for secrets | Accepted |
| ADR-004 | DigitalOcean over AWS (cost + simplicity) | Accepted |
| ADR-005 | Loki over ELK (lower resource usage) | Accepted |

---

## References

- [Lightning Labs LND Docker Setup](https://github.com/lightningnetwork/lnd/tree/master/docker)
- [Cash App Platform Resilience](https://aws.amazon.com/blogs/architecture/improving-platform-resilience-at-cash-app)
- [HashiCorp Vault HSM Integration](https://developer.hashicorp.com/vault/docs/enterprise/hsm)
- [Bitcoin Financial Infrastructure Best Practices](https://www.sec.gov/files/cft-written-input-daniel-bruno-corvelo-costa-090325.pdf)

---

**Document Owner:** Infrastructure Team  
**Review Cycle:** Quarterly  
**Next Review:** 2026-06-14
