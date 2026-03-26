import Redis from 'ioredis';
import { EventEmitter } from 'events';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  retryStrategy?: (times: number) => number | null;
}



/**
 * RedisCache - High-performance caching layer for RuneBolt
 * 
 * Caches:
 * - User balances (channel states)
 * - Hot transfers (recent high-volume channels)
 * - Rate limit counters
 * - Session data
 */
export class RedisCache extends EventEmitter {
  private client: Redis;
  private isConnected: boolean = false;
  private defaultTTL: number = 300; // 5 minutes default

  // Cache key prefixes
  private static readonly PREFIXES = {
    CHANNEL_BALANCE: 'ch:bal:',
    CHANNEL_STATE: 'ch:state:',
    USER_CHANNELS: 'usr:ch:',
    TRANSFER_BATCH: 'xfer:batch:',
    RATE_LIMIT: 'ratelimit:',
    HOT_CHANNEL: 'hot:ch:',
    LOCK: 'lock:',
  } as const;

  constructor(config?: Partial<CacheConfig>) {
    super();

    const redisConfig: CacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      ...config,
    };

    try {
      this.client = new Redis({
        ...redisConfig,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.log('[RedisCache] Max retries reached, running without cache');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 2000);
        },
      });
      this.setupEventHandlers();
      // Try to connect but don't block startup
      this.client.connect().catch(() => {
        console.log('[RedisCache] Redis not available — running in no-cache mode');
        this.isConnected = false;
      });
    } catch {
      console.log('[RedisCache] Redis initialization failed — running in no-cache mode');
      this.client = null as any;
      this.isConnected = false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;
    
    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('[RedisCache] Connected to Redis');
      this.emit('connect');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      // Don't spam logs - just note once
      if (err.message.includes('ECONNREFUSED')) {
        // Expected when Redis is not installed
      } else {
        console.error('[RedisCache] Redis error:', err.message);
      }
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });
  }

  /**
   * Get the underlying Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  connected(): boolean {
    return this.isConnected;
  }

  /**
   * Generic get method with JSON parsing
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      return null;
    }
  }

  /**
   * Generic set method with JSON serialization
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds ?? this.defaultTTL;
      await this.client.setex(key, ttl, serialized);
    } catch (err) {
      console.error('[RedisCache] Set error:', err);
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      // silent
    }
  }

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      // silent
    }
  }

  /**
   * Get channel balance from cache
   */
  async getChannelBalance(channelId: string): Promise<{ local: bigint; remote: bigint; capacity: bigint } | null> {
    const cached = await this.get<{ local: string; remote: string; capacity: string }>(
      RedisCache.PREFIXES.CHANNEL_BALANCE + channelId
    );
    if (!cached) return null;
    return {
      local: BigInt(cached.local),
      remote: BigInt(cached.remote),
      capacity: BigInt(cached.capacity),
    };
  }

  /**
   * Set channel balance in cache
   */
  async setChannelBalance(
    channelId: string,
    balance: { local: bigint; remote: bigint; capacity: bigint },
    ttlSeconds: number = 60
  ): Promise<void> {
    await this.set(
      RedisCache.PREFIXES.CHANNEL_BALANCE + channelId,
      {
        local: balance.local.toString(),
        remote: balance.remote.toString(),
        capacity: balance.capacity.toString(),
      },
      ttlSeconds
    );
  }

  /**
   * Invalidate channel balance cache
   */
  async invalidateChannelBalance(channelId: string): Promise<void> {
    await this.del(RedisCache.PREFIXES.CHANNEL_BALANCE + channelId);
  }

  /**
   * Get channel state from cache
   */
  async getChannelState(channelId: string): Promise<string | null> {
    return this.get<string>(RedisCache.PREFIXES.CHANNEL_STATE + channelId);
  }

  /**
   * Set channel state in cache
   */
  async setChannelState(channelId: string, state: string, ttlSeconds: number = 300): Promise<void> {
    await this.set(RedisCache.PREFIXES.CHANNEL_STATE + channelId, state, ttlSeconds);
  }

  /**
   * Get user channels from cache
   */
  async getUserChannels(pubkey: string): Promise<string[] | null> {
    return this.get<string[]>(RedisCache.PREFIXES.USER_CHANNELS + pubkey);
  }

  /**
   * Set user channels in cache
   */
  async setUserChannels(pubkey: string, channelIds: string[], ttlSeconds: number = 300): Promise<void> {
    await this.set(RedisCache.PREFIXES.USER_CHANNELS + pubkey, channelIds, ttlSeconds);
  }

  /**
   * Invalidate user channels cache
   */
  async invalidateUserChannels(pubkey: string): Promise<void> {
    await this.del(RedisCache.PREFIXES.USER_CHANNELS + pubkey);
  }

  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    if (!this.isConnected || !this.client) return 0;
    try {
      const multi = this.client.multi();
      const fullKey = RedisCache.PREFIXES.RATE_LIMIT + key;
      multi.incr(fullKey);
      multi.expire(fullKey, windowSeconds);
      const results = await multi.exec();
      return (results?.[0]?.[1] as number) || 0;
    } catch (err) {
      console.error('[RedisCache] Rate limit increment error:', err);
      return 0;
    }
  }

  /**
   * Get current rate limit count
   */
  async getRateLimitCount(key: string): Promise<number> {
    if (!this.isConnected || !this.client) return 0;
    try {
      const count = await this.client.get(RedisCache.PREFIXES.RATE_LIMIT + key);
      return parseInt(count || '0', 10);
    } catch (err) {
      console.error('[RedisCache] Rate limit get error:', err);
      return 0;
    }
  }

  /**
   * Mark a channel as "hot" (high transfer volume)
   */
  async markHotChannel(channelId: string, score: number = 1): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.zincrby(RedisCache.PREFIXES.HOT_CHANNEL, score, channelId);
      // Expire the sorted set entries after 1 hour
      await this.client.expire(RedisCache.PREFIXES.HOT_CHANNEL, 3600);
    } catch (err) {
      console.error('[RedisCache] Mark hot channel error:', err);
    }
  }

  /**
   * Get hot channels (top N by activity)
   */
  async getHotChannels(limit: number = 100): Promise<string[]> {
    if (!this.isConnected || !this.client) return [];
    try {
      return await this.client.zrevrange(RedisCache.PREFIXES.HOT_CHANNEL, 0, limit - 1);
    } catch (err) {
      console.error('[RedisCache] Get hot channels error:', err);
      return [];
    }
  }

  /**
   * Acquire distributed lock
   */
  async acquireLock(lockKey: string, ttlSeconds: number = 10): Promise<string | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const token = `${Date.now()}-${Math.random()}`;
      const fullKey = RedisCache.PREFIXES.LOCK + lockKey;
      const result = await this.client.set(fullKey, token, 'EX', ttlSeconds, 'NX');
      return result === 'OK' ? token : null;
    } catch (err) {
      console.error('[RedisCache] Acquire lock error:', err);
      return null;
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(lockKey: string, token: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try {
      const fullKey = RedisCache.PREFIXES.LOCK + lockKey;
      const currentToken = await this.client.get(fullKey);
      if (currentToken === token) {
        await this.client.del(fullKey);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[RedisCache] Release lock error:', err);
      return false;
    }
  }

  /**
   * Execute operation with distributed lock
   */
  async withLock<T>(lockKey: string, operation: () => Promise<T>, ttlSeconds: number = 10): Promise<T | null> {
    const token = await this.acquireLock(lockKey, ttlSeconds);
    if (!token) return null;

    try {
      const result = await operation();
      return result;
    } finally {
      await this.releaseLock(lockKey, token);
    }
  }

  /**
   * Add transfer to batch for processing
   */
  async addToBatch(batchId: string, transferData: unknown): Promise<number> {
    if (!this.isConnected || !this.client) return 0;
    try {
      const key = RedisCache.PREFIXES.TRANSFER_BATCH + batchId;
      const result = await this.client.lpush(key, JSON.stringify(transferData));
      return result;
    } catch (err) {
      console.error('[RedisCache] Add to batch error:', err);
      return 0;
    }
  }

  /**
   * Get and clear batch
   */
  async getAndClearBatch(batchId: string): Promise<unknown[]> {
    if (!this.isConnected || !this.client) return [];
    try {
      const key = RedisCache.PREFIXES.TRANSFER_BATCH + batchId;
      const multi = this.client.multi();
      multi.lrange(key, 0, -1);
      multi.del(key);
      const results = await multi.exec();
      
      if (!results || !results[0]) return [];
      const items = results[0][1] as string[];
      return items.map(item => JSON.parse(item));
    } catch (err) {
      console.error('[RedisCache] Get batch error:', err);
      return [];
    }
  }

  /**
   * Publish message to Redis pub/sub (for WebSocket scaling)
   */
  async publish(channel: string, message: unknown): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.publish(channel, JSON.stringify(message));
    } catch (err) {
      console.error('[RedisCache] Publish error:', err);
    }
  }

  /**
   * Subscribe to Redis pub/sub channel
   */
  subscribe(channel: string, callback: (message: unknown) => void): void {
    if (!this.isConnected || !this.client) return;
    const subscriber = this.client.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (_chan: string, message: string) => {
      try {
        callback(JSON.parse(message));
      } catch (err) {
        console.error('[RedisCache] Message parse error:', err);
      }
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ connected: boolean; keys: number; hitRate?: number }> {
    try {
      const keyspace = await this.client.info('keyspace');
      
      // Parse key count from keyspace info
      const keyMatch = keyspace.match(/keys=(\d+)/);
      const keys = keyMatch ? parseInt(keyMatch[1], 10) : 0;

      return {
        connected: this.isConnected,
        keys,
      };
    } catch (err) {
      return { connected: false, keys: 0 };
    }
  }

  /**
   * Ping Redis to check connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (!this.client) return;
    await this.client.quit();
    this.isConnected = false;
  }
}

// Singleton instance
let cacheInstance: RedisCache | null = null;

export function getCache(): RedisCache {
  if (!cacheInstance) {
    cacheInstance = new RedisCache();
  }
  return cacheInstance;
}

export function resetCache(): void {
  cacheInstance = null;
}

export default RedisCache;
