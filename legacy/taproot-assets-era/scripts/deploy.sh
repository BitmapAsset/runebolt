# RuneBolt Production Deployment Script
# Version: 1.0.0
# Usage: ./scripts/deploy.sh [staging|production] [version]

#!/bin/bash

set -euo pipefail

# ============================================
# Configuration
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_NAME="runebolt"
REGISTRY="ghcr.io/bitmap-asset"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Logging Functions
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# Usage
# ============================================
usage() {
    cat << EOF
RuneBolt Deployment Script

Usage: $0 [OPTIONS] <environment> [version]

Arguments:
    environment     Target environment: staging, production, or canary
    version         Docker image version/tag (default: latest)

Options:
    -h, --help      Show this help message
    -f, --force     Skip confirmation prompts
    -s, --skip-tests Skip smoke tests after deployment
    -r, --rollback  Rollback to previous version
    -c, --canary    Deploy as canary (5% traffic)

Examples:
    $0 staging                    # Deploy latest to staging
    $0 production v1.2.3          # Deploy v1.2.3 to production
    $0 production --canary        # Deploy as canary
    $0 production --rollback      # Rollback production
    $0 production v1.2.3 --force  # Deploy without confirmation

EOF
}

# ============================================
# Parse Arguments
# ============================================
ENVIRONMENT=""
VERSION="latest"
FORCE=false
SKIP_TESTS=false
ROLLBACK=false
CANARY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -c|--canary)
            CANARY=true
            shift
            ;;
        staging|production|canary)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            if [[ -z "$VERSION" || "$VERSION" == "latest" ]]; then
                VERSION="$1"
            fi
            shift
            ;;
    esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment is required. Use 'staging' or 'production'"
    usage
    exit 1
fi

# ============================================
# Load Environment Configuration
# ============================================
load_env_config() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        log_info "Loading environment config from $env_file"
        # shellcheck source=/dev/null
        source "$env_file"
    else
        log_warn "Environment file $env_file not found, using defaults"
    fi
    
    # Set defaults
    DEPLOY_HOST="${DEPLOY_HOST:-}"
    DEPLOY_USER="${DEPLOY_USER:-runebolt}"
    DEPLOY_PATH="${DEPLOY_PATH:-/opt/runebolt}"
    COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
}

# ============================================
# Pre-deployment Checks
# ============================================
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if docker compose is available
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        exit 1
    fi
    
    # Check if required env vars are set
    if [[ -z "${JWT_SECRET:-}" ]]; then
        log_warn "JWT_SECRET not set in environment"
    fi
    
    if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
        log_warn "POSTGRES_PASSWORD not set in environment"
    fi
    
    log_success "Pre-deployment checks passed"
}

# ============================================
# Confirm Deployment
# ============================================
confirm_deployment() {
    if [[ "$FORCE" == true ]]; then
        return 0
    fi
    
    echo ""
    echo "========================================"
    echo "Deployment Configuration:"
    echo "========================================"
    echo "Environment: $ENVIRONMENT"
    echo "Version:     $VERSION"
    echo "Canary:      $CANARY"
    echo "Rollback:    $ROLLBACK"
    echo "Host:        ${DEPLOY_HOST:-localhost}"
    echo "========================================"
    echo ""
    
    if [[ "$ENVIRONMENT" == "production" && "$ROLLBACK" == false ]]; then
        log_warn "You are about to deploy to PRODUCTION!"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    else
        read -p "Continue with deployment? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
}

# ============================================
# Deploy Function
# ============================================
deploy() {
    log_info "Starting deployment to $ENVIRONMENT..."
    
    export VERSION="$VERSION"
    
    # Pull latest images
    log_info "Pulling Docker images..."
    docker pull "$REGISTRY/$APP_NAME-backend:$VERSION" || log_warn "Backend image pull failed, will use local"
    docker pull "$REGISTRY/$APP_NAME-frontend:$VERSION" || log_warn "Frontend image pull failed, will use local"
    
    # Deploy with Docker Compose
    log_info "Deploying services..."
    cd "$PROJECT_ROOT"
    
    if [[ "$CANARY" == true ]]; then
        log_info "Deploying canary version (5% traffic)..."
        # Deploy only one replica of backend as canary
        docker compose -f "$COMPOSE_FILE" up -d backend-api-canary --no-deps
    else
        docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
    fi
    
    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 10
    
    # Check service health
    log_info "Checking service health..."
    check_health
    
    log_success "Deployment to $ENVIRONMENT completed successfully!"
}

# ============================================
# Check Health
# ============================================
check_health() {
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt $attempt/$max_attempts..."
        
        # Check backend API
        if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
            log_success "Backend API is healthy"
            
            # Check frontend
            if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
                log_success "Frontend is healthy"
                return 0
            fi
        fi
        
        sleep 2
        ((attempt++))
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    
    # Show container logs
    log_info "Container logs:"
    docker compose -f "$COMPOSE_FILE" logs --tail=50 backend-api || true
    
    exit 1
}

# ============================================
# Smoke Tests
# ============================================
smoke_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_info "Skipping smoke tests"
        return 0
    fi
    
    log_info "Running smoke tests..."
    
    # Test API health
    if ! curl -sf http://localhost:3001/health > /dev/null; then
        log_error "API health check failed"
        return 1
    fi
    
    # Test API status endpoint
    if ! curl -sf http://localhost:3001/api/status > /dev/null; then
        log_warn "API status endpoint check failed"
    fi
    
    # Test frontend
    if ! curl -sf http://localhost:3000 > /dev/null; then
        log_warn "Frontend check failed"
    fi
    
    # Test database connectivity (via API)
    if ! curl -sf http://localhost:3001/api/status | grep -q "database"; then
        log_warn "Database connectivity check failed"
    fi
    
    log_success "Smoke tests passed"
}

# ============================================
# Rollback Function
# ============================================
rollback() {
    log_warn "Initiating rollback..."
    
    # Get previous version from deployment log
    local prev_version
    if [[ -f "$PROJECT_ROOT/.deployment_log" ]]; then
        prev_version=$(tail -2 "$PROJECT_ROOT/.deployment_log" | head -1 | cut -d',' -f2)
        log_info "Rolling back to version: $prev_version"
    else
        log_error "No deployment log found, cannot determine previous version"
        exit 1
    fi
    
    # Perform rollback
    VERSION="$prev_version" deploy
    
    log_success "Rollback completed"
}

# ============================================
# Post-deployment Tasks
# ============================================
post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Cleanup old images
    log_info "Cleaning up old Docker images..."
    docker image prune -af --filter "until=168h" || true
    
    # Log deployment
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$VERSION,$ENVIRONMENT,$CANARY" >> "$PROJECT_ROOT/.deployment_log"
    
    # Send notification (if configured)
    if command -v curl &> /dev/null && [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        send_notification
    fi
    
    log_success "Post-deployment tasks completed"
}

# ============================================
# Send Notification
# ============================================
send_notification() {
    local status="success"
    local color="good"
    
    if [[ "$ROLLBACK" == true ]]; then
        status="rollback"
        color="warning"
    fi
    
    curl -s -X POST -H 'Content-type: application/json' \
        --data "{
            \"attachments\": [{
                \"color\": \"$color\",
                \"title\": \"RuneBolt Deployment: $status\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                    {\"title\": \"Version\", \"value\": \"$VERSION\", \"short\": true},
                    {\"title\": \"Canary\", \"value\": \"$CANARY\", \"short\": true}
                ],
                \"footer\": \"RuneBot Deployment System\",
                \"ts\": $(date +%s)
            }]
        }" \
        "$SLACK_WEBHOOK_URL" > /dev/null || true
}

# ============================================
# Main
# ============================================
main() {
    log_info "RuneBolt Deployment Script v1.0.0"
    log_info "Target: $ENVIRONMENT, Version: $VERSION"
    
    load_env_config
    
    if [[ "$ROLLBACK" == true ]]; then
        confirm_deployment
        rollback
    else
        pre_deployment_checks
        confirm_deployment
        deploy
        smoke_tests
        post_deployment
    fi
    
    echo ""
    log_success "Deployment process completed!"
    echo ""
    echo "Useful commands:"
    echo "  View logs:     docker compose -f $COMPOSE_FILE logs -f"
    echo "  Check status:  docker compose -f $COMPOSE_FILE ps"
    echo "  Scale service: docker compose -f $COMPOSE_FILE up -d --scale backend-api=5"
    echo ""
}

# Run main
main "$@"
