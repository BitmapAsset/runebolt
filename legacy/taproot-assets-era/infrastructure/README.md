# RuneBolt Infrastructure

Production-grade infrastructure for RuneBolt Bitcoin L2 payment hub.

## Quick Start

### Prerequisites
- Docker & Docker Swarm
- Terraform >= 1.5
- doctl (DigitalOcean CLI)
- kubectl (optional, for K8s migration path)

### Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan -var="do_token=$DO_TOKEN"
terraform apply
```

### Deploy Application

```bash
# Initialize Swarm (on manager)
docker swarm init

# Deploy stack
docker stack deploy -c ../docker-compose.yml runebolt
```

## Directory Structure

```
infrastructure/
├── terraform/          # IaC for DigitalOcean
├── scripts/            # Automation scripts
│   └── backup.sh       # Backup automation
├── runbooks/           # Operational procedures
│   ├── 01-service-restart.md
│   ├── 02-database-restore.md
│   ├── 03-scale-infrastructure.md
│   ├── 04-vault-unseal.md
│   └── 05-incident-response.md
└── configs/            # Service configurations
    └── haproxy.cfg
```

## Monitoring

- Grafana: https://grafana.runebolt.io
- Prometheus: http://localhost:9090
- AlertManager: http://localhost:9093

## Backups

Automated backups run every 6 hours. To restore:

```bash
./scripts/backup.sh restore 20240314_120000
```

## Security

- All secrets stored in Vault
- mTLS between services
- Network segmentation via VPC
- WAF + DDoS protection (CloudFlare)

## Support

For issues, refer to the runbooks or page the on-call engineer.
