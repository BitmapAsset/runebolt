# RuneBolt Performance Roadmap

## Executive Summary

Current RuneBolt architecture analyzed and optimized for mass adoption (millions of users, billions of transactions).

## Current State Bottlenecks

### 1. Database Layer (SQLite)
- **Write contention**: Database-level locking serializes concurrent writes
- **No connection pooling**: Each connection is isolated
- **Single-node constraint**: Cannot scale horizontally
- **Query issues**: OR conditions prevent index usage in transfer lookups

### 2. Architecture Issues
- Synchronous operations block event loop
- No worker thread utilization
- In-memory commitment storage (lost on restart)
- No rate limiting or DDoS protection
- Single WebSocket server (no horizontal scaling)

### 3. Resource Management
- Unbounded data growth (no pruning)
- No caching layer
- No connection limits
- Memory leaks possible in WebSocket manager

## Performance Targets

| Metric | Current | 12-Month | 24-Month |
|--------|---------|----------|----------|
| TPS | ~100 | 2,000 | 10,000+ |
| Users | ~1,000 | 50,000 | 500,000+ |
| Latency p99 | ~50ms | <20ms | <10ms |
| Availability | Single point | 99.9% | 99.99% |

## Migration Path: SQLite → PostgreSQL

### Schema Optimizations

```sql
-- Partitioned transfers table for time-series data
CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_channel UUID NOT NULL REFERENCES channels(id),
    to_channel UUID NOT NULL REFERENCES channels(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    memo VARCHAR(256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE transfers_2026_03 PARTITION OF transfers
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Optimized indexes (no OR conditions)
CREATE INDEX idx_transfers_sender ON transfers(from_channel, created_at DESC) 
    INCLUDE (id, to_channel, amount, memo);
CREATE INDEX idx_transfers_recipient ON transfers(to_channel, created_at DESC)
    INCLUDE (id, from_channel, amount, memo);

-- Partial index for hot data only
CREATE INDEX idx_channels_active ON channels(user_pubkey, state) 
    WHERE state = 'OPEN';
```

## Critical Path Optimizations

### 1. Transfer Execution (Hot Path)

**Current Issues:**
- Synchronous database transaction
- Balance updates are blocking
- No caching of channel state
- Commitment manager uses in-memory store

**Optimized Transfer Flow:**
```typescript
// Optimized transfer with caching and worker threads
class OptimizedRuneLedger {
  async transfer(fromId: string, toId: string, amount: bigint): Promise<Transfer> {
    // 1. Check cache first (sub-millisecond)
    const fromBalance = await this.cache.getChannelBalance(fromId);
    const toBalance = await this.cache.getChannelBalance(toId);
    
    // 2. Validate without DB hit
    if (!fromBalance || fromBalance.local < amount) {
      throw new Error('Insufficient balance');
    }
    
    // 3. Execute in worker thread (non-blocking)
    return this.workerPool.execute('transfer', {
      fromId, toId, amount,
      fromBalance, toBalance
    });
  }
}
```

### 2. WebSocket Scaling

```typescript
// Redis-backed WebSocket for horizontal scaling
class ScalableWebSocketManager {
  private redis: Redis;
  
  async broadcastToChannel(channelId: string, event: string, data: unknown) {
    // Publish to Redis pub/sub
    await this.redis.publish(`channel:${channelId}`, JSON.stringify({event, data}));
  }
}
```

### 3. Rate Limiting

```typescript
// Token bucket rate limiter per user
class RateLimiter {
  async checkLimit(pubkey: string, action: string): Promise<boolean> {
    const key = `ratelimit:${pubkey}:${action}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }
    
    return current <= 100; // 100 requests per minute
  }
}
```

## Monitoring Dashboard Specs

### Metrics to Track

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| transfer_latency_p99 | Histogram | > 50ms |
| transfer_rate | Counter | - |
| active_channels | Gauge | - |
| ws_connections | Gauge | > 10,000 |
| db_pool_wait_time | Histogram | > 10ms |
| redis_hit_rate | Gauge | < 90% |
| error_rate | Counter | > 1% |

### Grafana Dashboard Panels
1. Real-time TPS graph
2. Latency percentiles (p50, p95, p99)
3. Database connection pool status
4. Cache hit/miss rates
5. Channel state distribution
6. Error rate by endpoint
7. WebSocket connection count
8. Bitcoin mempool fee estimates

## Implementation Roadmap

### Phase 1 (Weeks 1-4): Foundation
- [ ] PostgreSQL migration scripts
- [ ] Connection pooling setup
- [ ] Basic Redis caching (channel balances)
- [ ] Rate limiting middleware

### Phase 2 (Weeks 5-8): Scaling
- [ ] Worker thread pool for transfers
- [ ] Database partitioning for transfers
- [ ] WebSocket Redis pub/sub
- [ ] Health checks and graceful shutdown

### Phase 3 (Weeks 9-12): Production
- [ ] Horizontal scaling support (stateless nodes)
- [ ] Comprehensive monitoring
- [ ] Load testing and optimization
- [ ] Data retention policies

### Phase 4 (Months 4-6): Advanced
- [ ] Multi-region deployment
- [ ] Automatic failover
- [ ] Advanced caching strategies
- [ ] Channel pruning and archival

## Lightning Network Research Findings

### LND vs CLN Insights
- LND: Better payment success rate, optimized pathfinding
- CLN: More modular, better for custom implementations
- Both use similar channel state machine patterns

### Key Scalability Lessons
1. **Batch operations**: Process multiple HTLCs in single commitment
2. **Routing optimization**: Use channel liquidity hints for pathfinding
3. **Gossip pruning**: Limit network topology updates
4. **State compaction**: Periodic cleanup of old channel states

### Bitcoin L2 Throughput Limits
- Lightning: Theoretical 1M+ TPS (limited by channel capacity)
- Practical: 100-1000 TPS per node
- RuneBolt hub model: Can batch many user transfers off-chain

## Code Samples

### Optimized Database Queries

```typescript
// BEFORE: Slow OR query
const query = `
  SELECT t.* FROM transfers t
  JOIN channels c ON (t.from_channel = c.id OR t.to_channel = c.id)
  WHERE c.user_pubkey = $1
  ORDER BY t.created_at DESC LIMIT $2 OFFSET $3
`;

// AFTER: Two fast queries merged
const sent = await db.query(
  `SELECT * FROM transfers WHERE from_channel = ANY($1)
   ORDER BY created_at DESC LIMIT $2`,
  [channelIds, limit]
);
const received = await db.query(
  `SELECT * FROM transfers WHERE to_channel = ANY($1)
   ORDER BY created_at DESC LIMIT $2`,
  [channelIds, limit]
);
// Merge and sort in memory
```

### Connection Pool Configuration

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,                    // Max connections
  min: 10,                    // Min connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,   // Kill slow queries
});
```

### Batch Transfer Processing

```typescript
class BatchTransferProcessor {
  private batch: TransferRequest[] = [];
  private batchSize = 100;
  private flushInterval = 100; // ms
  
  async addTransfer(request: TransferRequest): Promise<Transfer> {
    return new Promise((resolve, reject) => {
      this.batch.push({ ...request, resolve, reject });
      
      if (this.batch.length >= this.batchSize) {
        this.flush();
      }
    });
  }
  
  private async flush(): Promise<void> {
    const toProcess = this.batch.splice(0, this.batchSize);
    
    // Single transaction for all transfers
    await this.db.transaction(async (client) => {
      for (const transfer of toProcess) {
        try {
          const result = await this.executeTransfer(client, transfer);
          transfer.resolve(result);
        } catch (err) {
          transfer.reject(err);
        }
      }
    });
  }
}
```

## Memory Leak Prevention

```typescript
// Fixed WebSocket manager with cleanup
class MemorySafeWebSocketManager {
  private clients = new Map<string, Client>();
  private heartbeatInterval: NodeJS.Timeout;
  
  constructor() {
    // Periodic cleanup of stale connections
    this.heartbeatInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000);
  }
  
  private cleanupStaleConnections(): void {
    const now = Date.now();
    for (const [id, client] of this.clients) {
      if (now - client.lastPong > 60000) {
        client.ws.terminate(); // Force close
        this.clients.delete(id);
      }
    }
  }
}
```

## DDoS Protection

```typescript
// Multi-layer protection
class DDoSProtection {
  // Layer 1: IP-based rate limiting
  async checkIPLimit(ip: string): Promise<boolean> {
    const key = `ip:${ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 1);
    return count <= 100; // 100 req/sec per IP
  }
  
  // Layer 2: User-based rate limiting
  async checkUserLimit(pubkey: string): Promise<boolean> {
    const key = `user:${pubkey}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);
    return count <= 60; // 60 req/min per user
  }
  
  // Layer 3: Global rate limiting
  async checkGlobalLimit(): Promise<boolean> {
    const key = 'global:requests';
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 1);
    return count <= 10000; // 10k req/sec globally
  }
}
```

---

*Document Version: 1.0*
*Analysis Date: March 14, 2026*
*Target: Mass adoption scalability*