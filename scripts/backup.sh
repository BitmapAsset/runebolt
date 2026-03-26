#!/bin/bash
# RuneBolt Backup Automation Script
# Version: 1.0.0
# Handles: PostgreSQL, Redis, SQLite, Vault backups to S3

set -euo pipefail

# ============================================
# Configuration
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)

S3_BUCKET="${S3_BUCKET:-runebolt-backups}"
S3_REGION="${S3_REGION:-us-east-1}"
S3_ENDPOINT="${S3_ENDPOINT:-}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-runebolt}"
POSTGRES_USER="${POSTGRES_USER:-runebolt}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

usage() {
    cat << EOF
RuneBolt Backup Script

Usage: $0 [OPTIONS] <command>

Commands:
    full            Run full backup (all components)
    postgres        Backup PostgreSQL database
    redis           Backup Redis
    sqlite          Backup SQLite databases
    vault           Backup Vault
    cleanup         Clean up old backups

Options:
    -h, --help      Show this help
    -d, --dry-run   Show what would be done without executing
    -q, --quiet     Suppress output (for cron)

EOF
}

COMMAND=""
DRY_RUN=false
QUIET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help) usage; exit 0 ;;
        -d|--dry-run) DRY_RUN=true; shift ;;
        -q|--quiet) QUIET=true; shift ;;
        full|postgres|redis|sqlite|vault|cleanup) COMMAND="$1"; shift ;;
        *) shift ;;
    esac
done

upload_to_s3() {
    local file="$1"
    local s3_key="$2"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would upload $file to s3://$S3_BUCKET/$s3_key"
        return 0
    fi
    
    log_info "Uploading to S3: s3://$S3_BUCKET/$s3_key"
    
    local aws_args=""
    if [[ -n "$S3_ENDPOINT" ]]; then
        aws_args="--endpoint-url $S3_ENDPOINT"
    fi
    
    if command -v aws &> /dev/null; then
        aws s3 cp "$file" "s3://$S3_BUCKET/$s3_key" $aws_args --storage-class STANDARD_IA
    elif command -v s3cmd &> /dev/null; then
        s3cmd put "$file" "s3://$S3_BUCKET/$s3_key"
    else
        log_warn "No S3 client found. Skipping S3 upload."
        return 1
    fi
    
    log_success "Upload complete: s3://$S3_BUCKET/$s3_key"
}

compress_and_upload() {
    local input="$1"
    local s3_path="$2"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would compress and upload $input"
        return 0
    fi
    
    log_info "Compressing $input..."
    local output="$input.tar.gz"
    tar -czf "$output" -C "$(dirname "$input")" "$(basename "$input")"
    rm -rf "$input"
    
    upload_to_s3 "$output" "$s3_path/$(basename "$output")"
    
    # Create latest symlink locally
    local latest_link="$(dirname "$input")/latest$(echo "$output" | grep -o '\.[^.]*\.tar\.gz$' || echo '.tar.gz')"
    ln -sf "$(basename "$output")" "$latest_link" 2>/dev/null || true
}

send_notification() {
    local status="$1"
    local message="$2"
    
    [[ "$QUIET" == true ]] && return 0
    [[ -z "$SLACK_WEBHOOK_URL" ]] && return 0
    
    local color="good"
    [[ "$status" == "error" ]] && color="danger"
    [[ "$status" == "warning" ]] && color="warning"
    
    curl -s -X POST -H 'Content-type: application/json' \
        --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"RuneBolt Backup: $status\",\"text\":\"$message\",\"footer\":\"RuneBolt Backup\",\"ts\":$(date +%s)}]}" \
        "$SLACK_WEBHOOK_URL" > /dev/null || true
}

backup_postgres() {
    log_info "Starting PostgreSQL backup..."
    
    mkdir -p "$BACKUP_DIR/postgres"
    local backup_file="$BACKUP_DIR/postgres/runebolt_${TIMESTAMP}.sql"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would backup PostgreSQL to $backup_file"
        return 0
    fi
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    if ! pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --verbose --format=custom --file="$backup_file"; then
        log_error "PostgreSQL backup failed"
        send_notification "error" "PostgreSQL backup failed"
        return 1
    fi
    
    unset PGPASSWORD
    compress_and_upload "$backup_file" "postgres"
    log_success "PostgreSQL backup completed"
}

backup_redis() {
    log_info "Starting Redis backup..."
    
    mkdir -p "$BACKUP_DIR/redis"
    local backup_file="$BACKUP_DIR/redis/redis_${TIMESTAMP}.rdb"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would backup Redis to $backup_file"
        return 0
    fi
    
    log_info "Triggering Redis BGSAVE..."
    if [[ -n "$REDIS_PASSWORD" ]]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
    fi
    
    sleep 5
    local last_save current_save
    while true; do
        if [[ -n "$REDIS_PASSWORD" ]]; then
            last_save=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)
        else
            last_save=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)
        fi
        sleep 2
        if [[ -n "$REDIS_PASSWORD" ]]; then
            current_save=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)
        else
            current_save=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)
        fi
        [[ "$last_save" != "$current_save" ]] && break
    done
    
    docker cp "runebolt-redis:/data/dump.rdb" "$backup_file" 2>/dev/null || \
        cp "$PROJECT_ROOT/redis-data/dump.rdb" "$backup_file" 2>/dev/null || \
        log_warn "Could not copy Redis RDB file directly"
    
    if [[ -f "$backup_file" ]]; then
        compress_and_upload "$backup_file" "redis"
        log_success "Redis backup completed"
    else
        log_warn "Redis backup file not created"
    fi
}

backup_sqlite() {
    log_info "Starting SQLite backup..."
    
    mkdir -p "$BACKUP_DIR/sqlite"
    local backup_file="$BACKUP_DIR/sqlite/runebolt_${TIMESTAMP}.db"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would backup SQLite to $backup_file"
        return 0
    fi
    
    local sqlite_paths=(
        "$PROJECT_ROOT/backend/data/runebolt.db"
        "$PROJECT_ROOT/data/runebolt.db"
    )
    
    for db_path in "${sqlite_paths[@]}"; do
        if [[ -f "$db_path" ]]; then
            log_info "Backing up SQLite: $db_path"
            
            if command -v sqlite3 &> /dev/null; then
                sqlite3 "$db_path" ".backup '$backup_file'"
            else
                cp "$db_path" "$backup_file"
            fi
            
            compress_and_upload "$backup_file" "sqlite"
            log_success "SQLite backup completed"
            return 0
        fi
    done
    
    log_warn "No SQLite database found to backup"
}

backup_vault() {
    log_info "Starting Vault backup..."
    
    mkdir -p "$BACKUP_DIR/vault"
    local backup_file="$BACKUP_DIR/vault/vault_${TIMESTAMP}.snap"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would backup Vault to $backup_file"
        return 0
    fi
    
    if ! curl -sf http://localhost:8200/v1/sys/health &> /dev/null; then
        log_warn "Vault is not accessible, skipping backup"
        return 0
    fi
    
    local vault_token="${VAULT_TOKEN:-root}"
    
    if curl -sf -H "X-Vault-Token: $vault_token" \
        http://localhost:8200/v1/sys/storage/raft/snapshot -o "$backup_file"; then
        
        compress_and_upload "$backup_file" "vault"
        log_success "Vault backup completed"
    else
        log_warn "Vault snapshot failed"
    fi
}

cleanup_backups() {
    log_info "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would clean up old backups"
        return 0
    fi
    
    find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
    log_success "Cleanup completed"
}

main() {
    log_info "RuneBolt Backup Script v1.0.0"
    
    case "$COMMAND" in
        full)
            backup_postgres
            backup_redis
            backup_sqlite
            backup_vault
            cleanup_backups
            send_notification "success" "Full backup completed successfully"
            ;;
        postgres)
            backup_postgres
            send_notification "success" "PostgreSQL backup completed"
            ;;
        redis)
            backup_redis
            send_notification "success" "Redis backup completed"
            ;;
        sqlite)
            backup_sqlite
            send_notification "success" "SQLite backup completed"
            ;;
        vault)
            backup_vault
            send_notification "success" "Vault backup completed"
            ;;
        cleanup)
            cleanup_backups
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
    
    log_success "Backup process completed!"
}

main "$@"
