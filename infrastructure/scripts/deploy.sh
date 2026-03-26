#!/bin/bash
# Deploy script for RuneBolt
set -e

ENV=${1:-staging}
VERSION=${2:-latest}

echo "Deploying RuneBolt to $ENV (version: $VERSION)"

# Update stack
docker stack deploy -c docker-compose.yml runebolt

# Verify
echo "Verifying deployment..."
sleep 30
curl -f http://localhost:3001/health || exit 1

echo "Deployment complete!"
