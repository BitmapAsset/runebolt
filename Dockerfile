# RuneBolt Production Dockerfile
# Multi-stage build for optimized production image
# Version: 1.0.0

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ \
    && npm install -g npm@latest

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# ============================================
# Stage 2: Builder (TypeScript compilation)
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install TypeScript
RUN npm install -g typescript

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci --ignore-scripts

# Copy source code
COPY src ./src

# Build TypeScript
RUN tsc --build

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S runebolt && \
    adduser -S runebolt -u 1001

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        dumb-init \
        wget \
        ca-certificates && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite with proper permissions
RUN mkdir -p /data && \
    chown -R runebolt:runebolt /data /app

# Switch to non-root user
USER runebolt

# Environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_PATH=/data/runebolt.db \
    UV_THREADPOOL_SIZE=128

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Default command (can be overridden for workers)
CMD ["node", "dist/index.js"]

# ============================================
# Stage 4: Worker (alternative target)
# ============================================
FROM production AS worker

CMD ["node", "dist/worker.js"]

# ============================================
# Metadata
# ============================================
LABEL org.opencontainers.image.title="RuneBolt Backend" \
      org.opencontainers.image.description="Bitcoin Layer 2 Payment Channel Hub" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="Bitmap Asset" \
      org.opencontainers.image.source="https://github.com/bitmap-asset/runebolt" \
      org.opencontainers.image.licenses="MIT"
