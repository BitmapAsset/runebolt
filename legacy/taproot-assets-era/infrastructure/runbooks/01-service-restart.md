# Runbook: Service Restart

## Overview
Quickly restart services without affecting user transactions.

## Prerequisites
- Docker Swarm access
- Vault unsealed

## Rolling Restart (Zero Downtime)

```bash
# Restart backend API (rolling)
docker service update --force runebolt_backend-api

# Restart frontend (rolling)
docker service update --force runebolt_frontend

# Restart workers
docker service update --force runebolt_backend-worker
```

## Restart Specific Container

```bash
# Get container ID
docker ps | grep backend-api

# Restart specific container
docker restart <container_id>
```

## Verify Health

```bash
# Check service health
curl http://localhost:3001/health
docker service ps runebolt_backend-api

# Check logs
docker service logs runebolt_backend-api --tail 100
```

## Rollback if Issues

```bash
docker service rollback runebolt_backend-api
```
