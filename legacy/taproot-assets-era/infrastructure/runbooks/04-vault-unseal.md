# Runbook: Vault Unseal

## Prerequisites
- 3 unseal keys from secure storage

## Unseal Process

```bash
# Check status
docker exec runebolt_vault vault status

# Unseal (run 3 times with different keys)
docker exec runebolt_vault vault operator unseal <key-1>
docker exec runebolt_vault vault operator unseal <key-2>
docker exec runebolt_vault vault operator unseal <key-3>

# Verify
vault status
```

## If Auto-Unseal Fails

```bash
# Check logs
docker logs runebolt_vault

# Check Consul backend
docker exec consul consul members
```
