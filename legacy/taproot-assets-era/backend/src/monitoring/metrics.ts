/**
 * Prometheus metrics setup for RuneBolt monitoring.
 * 
 * Metrics exposed:
 * - http_requests_total: Counter of HTTP requests
 * - http_request_duration_seconds: Histogram of request durations
 * - active_connections: Gauge of active WebSocket connections
 * - transfer_rate: Counter of transfers per second
 * - cache_hit_rate: Gauge of cache hit percentage
 * - db_pool_size: Gauge of database connection pool stats
 */

import promClient from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (memory, CPU, event loop lag, etc.)
promClient.collectDefaultMetrics({ register });

// HTTP request counter
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// Active WebSocket connections
const activeConnections = new promClient.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// Transfer rate counter
const transferRate = new promClient.Counter({
  name: 'transfers_total',
  help: 'Total number of transfers executed',
  labelNames: ['status'],
  registers: [register],
});

// Transfer latency histogram
const transferLatency = new promClient.Histogram({
  name: 'transfer_latency_seconds',
  help: 'Transfer execution latency in seconds',
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

// Cache hit rate
const cacheHits = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

const cacheMisses = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// Database pool metrics
const dbPoolSize = new promClient.Gauge({
  name: 'db_pool_connections',
  help: 'Database connection pool size',
  labelNames: ['state'],
  registers: [register],
});

// Worker pool metrics
const workerPoolSize = new promClient.Gauge({
  name: 'worker_pool_size',
  help: 'Worker thread pool size',
  labelNames: ['state'],
  registers: [register],
});

// Rate limit hits
const rateLimitHits = new promClient.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['tier'],
  registers: [register],
});

// Batch queue size
const batchQueueSize = new promClient.Gauge({
  name: 'transfer_batch_queue_size',
  help: 'Current size of the transfer batch queue',
  registers: [register],
});

// Middleware to track HTTP metrics
function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });
    
    httpRequestDuration.observe(
      {
        method: req.method,
        route: route,
        status_code: res.statusCode,
      },
      duration
    );
  });
  
  next();
}

// Helper to record cache hit/miss
function recordCacheHit(cacheType: string): void {
  cacheHits.inc({ cache_type: cacheType });
}

function recordCacheMiss(cacheType: string): void {
  cacheMisses.inc({ cache_type: cacheType });
}

// Helper to record transfer
function recordTransfer(status: 'success' | 'failed', latencySeconds: number): void {
  transferRate.inc({ status });
  transferLatency.observe(latencySeconds);
}

// Helper to update DB pool metrics
function updateDbPoolMetrics(total: number, idle: number, waiting: number): void {
  dbPoolSize.set({ state: 'total' }, total);
  dbPoolSize.set({ state: 'idle' }, idle);
  dbPoolSize.set({ state: 'waiting' }, waiting);
}

// Helper to update worker pool metrics
function updateWorkerPoolMetrics(total: number, active: number, queued: number): void {
  workerPoolSize.set({ state: 'total' }, total);
  workerPoolSize.set({ state: 'active' }, active);
  workerPoolSize.set({ state: 'queued' }, queued);
}

// Helper to update WebSocket connections
function updateActiveConnections(count: number): void {
  activeConnections.set(count);
}

// Helper to record rate limit hit
function recordRateLimitHit(tier: string): void {
  rateLimitHits.inc({ tier });
}

// Helper to update batch queue size
function updateBatchQueueSize(size: number): void {
  batchQueueSize.set(size);
}

export {
  register,
  metricsMiddleware,
  httpRequestsTotal,
  httpRequestDuration,
  activeConnections,
  transferRate,
  transferLatency,
  cacheHits,
  cacheMisses,
  dbPoolSize,
  workerPoolSize,
  rateLimitHits,
  batchQueueSize,
  recordCacheHit,
  recordCacheMiss,
  recordTransfer,
  updateDbPoolMetrics,
  updateWorkerPoolMetrics,
  updateActiveConnections,
  recordRateLimitHit,
  updateBatchQueueSize,
};
