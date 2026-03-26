# ============================================
# RuneBolt Production Deployment Checklist
# ============================================

## Pre-Deployment

- [ ] Review INFRASTRUCTURE.md for architecture details
- [ ] Ensure all secrets are configured in .env.production
- [ ] Verify SSL certificates are in place
- [ ] Check that backup S3 bucket is accessible
- [ ] Test database connectivity
- [ ] Review recent changes in CHANGELOG.md

## Initial Setup (First Time Only)

1. Copy environment file:
   ```bash
   cp .env.production.example .env.production
   # Edit and fill in all values
   ```

2. Create required directories:
   ```bash
   mkdir -p logs/backend logs/worker backups/{postgres,redis,sqlite,vault}
   mkdir -p infrastructure/ssl/{certs,private}
   mkdir -p infrastructure/postgres/init-scripts
   ```

3. Place SSL certificates:
   ```bash
   # Place your SSL certificate and key
   cp your-cert.pem infrastructure/ssl/certs/runebolt.pem
   cp your-key.pem infrastructure/ssl/private/runebolt.key
   ```

4. Initialize Vault (first run only):
   ```bash
   docker compose -f docker-compose.prod.yml up -d vault
   # Follow Vault initialization procedures
   # Save unseal keys and root token securely
   ```

5. Run database migrations:
   ```bash
   docker compose -f docker-compose.prod.yml up -d postgres
   # Wait for postgres to be healthy
   # Run migrations
   ```

## Deployment

### Using the deploy script:
```bash
./scripts/deploy.sh production v1.0.0
```

### Manual deployment:
```bash
# 1. Set version
export VERSION=v1.0.0

# 2. Pull latest images
docker compose -f docker-compose.prod.yml pull

# 3. Deploy
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 4. Verify health
curl http://localhost:3001/health
curl http://localhost:3000/health
```

## Post-Deployment

- [ ] Verify all services are running: `docker compose ps`
- [ ] Check application logs: `docker compose logs -f backend-api`
- [ ] Run smoke tests
- [ ] Verify metrics in Grafana
- [ ] Check Prometheus targets: http://localhost:9090/targets
- [ ] Confirm backups are working
- [ ] Update deployment log

## Monitoring URLs

- Grafana: http://localhost:3003 (or https://grafana.runebolt.io)
- Prometheus: http://localhost:9090
- HAProxy Stats: http://localhost:8404/stats
- Vault UI: http://localhost:8200

## Backup Verification

Run a test backup:
```bash
./scripts/backup.sh full --dry-run  # Preview
./scripts/backup.sh full            # Actual backup
```

## Rollback Procedure

If deployment fails:
```bash
./scripts/deploy.sh production --rollback
```

Or manually:
```bash
# Stop current version
docker compose -f docker-compose.prod.yml down

# Start previous version
export VERSION=previous-version
docker compose -f docker-compose.prod.yml up -d
```

## Emergency Contacts

- Primary On-Call: [Your phone/email]
- Secondary: [Backup contact]
- Escalation: [Manager contact]
