#!/bin/bash
# RuneBolt Backup Automation Script
set -euo pipefail

BACKUP_DIR="/backups/runebolt"
S3_BUCKET="s3://runebolt-backups"
DATE=$(date +%Y%m%d_%H%M%S)

backup_postgres() {
    echo "Backing up PostgreSQL..."
    pg_dump -h postgres-primary -U runebolt runebolt | gzip > "$BACKUP_DIR/postgres_$DATE.sql.gz"
    aws s3 cp "$BACKUP_DIR/postgres_$DATE.sql.gz" "$S3_BUCKET/postgresql/"
}

backup_vault() {
    echo "Backing up Vault..."
    vault operator raft snapshot save "$BACKUP_DIR/vault_$DATE.snap"
    aws s3 cp "$BACKUP_DIR/vault_$DATE.snap" "$S3_BUCKET/vault/"
}

backup_redis() {
    echo "Backing up Redis..."
    redis-cli BGSAVE
    cp /data/redis/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"
    aws s3 cp "$BACKUP_DIR/redis_$DATE.rdb" "$S3_BUCKET/redis/"
}

main() {
    mkdir -p "$BACKUP_DIR"
    backup_postgres
    backup_vault
    backup_redis
    echo "Backup complete!"
}

main "$@"
