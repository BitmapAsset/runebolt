# Runbook: Database Restore

## Overview
Restore PostgreSQL from backup.

## Prerequisites
- Access to S3 backup bucket
- PostgreSQL primary stopped

## Full Restore

```bash
# 1. Stop application writes
docker service scale runebolt_backend-api=0

# 2. Stop PostgreSQL
docker stop runebolt_postgres-primary

# 3. Clear old data
rm -rf /var/lib/postgresql/data/*

# 4. Download backup
aws s3 cp s3://runebolt-backups/postgresql/runebolt_YYYYMMDD.sql.gz /tmp/

# 5. Restore
gunzip < /tmp/runebolt_YYYYMMDD.sql.gz | psql -U runebolt runebolt

# 6. Start PostgreSQL
docker start runebolt_postgres-primary

# 7. Verify
curl http://localhost:3001/health

# 8. Scale back up
docker service scale runebolt_backend-api=3
```

## Point-in-Time Recovery

```bash
# Restore to specific time (using WAL)
pg_basebackup -D /var/lib/postgresql/data -X fetch

# Replay WAL to specific point
pg_waldump /var/lib/postgresql/wal/* | head -100
```
