/**
 * RuneBolt Backend — Hub-based Rune payment channel server
 * PRODUCTION VERSION - Optimized & Secure
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import rateLimit from 'express-rate-limit';

// Database
import Database from './db/Database';

// Security config
import { rateLimits } from './config/security';

// Mainnet startup checks
import { runMainnetChecks } from './config/mainnet-checks';

// API routes
import channelRoutes from './api/routes/channelRoutes';
import transferRoutes from './api/routes/transferRoutes';
import userRoutes from './api/routes/userRoutes';
import claimRoutes from './api/routes/claimRoutes';
import authRoutes from './api/routes/authRoutes';
import wellKnownRoutes from './api/routes/wellKnownRoutes';
import feeRoutes from './api/routes/feeRoutes';
import statsRoutes from './api/routes/statsRoutes';
import assetRoutes from './api/routes/assetRoutes';

// Cache
import { getCache } from './cache/RedisCache';

const PORT = parseInt(process.env.PORT || '3141', 10);
const isProduction = process.env.NODE_ENV === 'production';
const startTime = Date.now();

// Initialize database
const db = Database.getInstance();
db.initialize();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS — locked down in production, permissive in development
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: isProduction
    ? corsOrigin
      ? corsOrigin.split(',').map(o => o.trim())
      : false
    : corsOrigin || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: rateLimits.auth.windowMs,
  max: rateLimits.auth.max,
  message: { success: false, error: 'Too many authentication attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const transferLimiter = rateLimit({
  windowMs: rateLimits.transfer.windowMs,
  max: rateLimits.transfer.max,
  message: { success: false, error: 'Transfer rate limit exceeded, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: rateLimits.general.windowMs,
  max: rateLimits.general.max,
  message: { success: false, error: 'API rate limit exceeded, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limit to all API routes
app.use('/api/', generalLimiter);

// Request logging
app.use((_req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${_req.method} ${_req.path}`);
  next();
});

// Health check endpoint with detailed checks (not rate limited)
app.get('/health', async (_req, res) => {
  const dbHealth = await db.healthCheck();
  const cache = getCache();
  const redisConnected = cache.connected();

  const status = dbHealth.healthy ? 'ok' : 'degraded';

  res.status(dbHealth.healthy ? 200 : 503).json({
    status,
    service: 'runebolt-backend',
    version: '0.2.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbHealth.healthy ? 'ok' : 'error',
        latencyMs: dbHealth.latency,
        pool: db.getPoolMetrics(),
        ...(dbHealth.error ? { error: dbHealth.error } : {}),
      },
      redis: {
        status: redisConnected ? 'ok' : 'unavailable',
      },
    },
  });
});

// API routes with specific rate limiters
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/transfers', transferLimiter, transferRoutes);
app.use('/api/v1/channels', channelRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/claims', claimRoutes);
app.use('/api/v1/fees', feeRoutes);
app.use('/api/v1', statsRoutes);
app.use('/api/v1', assetRoutes);
app.use('/.well-known', wellKnownRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'RuneBolt Backend',
    version: '0.2.0',
    description: 'Hub-based Rune payment channel server',
    endpoints: {
      health: '/health',
      channels: '/api/v1/channels',
      transfers: '/api/v1/transfers',
      users: '/api/v1/users',
      claims: '/api/v1/claims',
      auth: '/api/v1/auth',
      fees: '/api/v1/fees',
      stats: '/api/v1/stats',
      assets: '/api/v1/assets',
      escrow: '/api/v1/escrow',
    },
  });
});

// Error handling — sanitize messages in production
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: isProduction ? undefined : err.message,
  });
});

// Run mainnet checks, then start server
(async () => {
  const checksOk = await runMainnetChecks();
  if (!checksOk) {
    console.error('[RuneBolt] CRITICAL checks failed — refusing to start');
    process.exit(1);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[RuneBolt] Server running on port ${PORT}`);
    console.log(`[RuneBolt] Environment: ${isProduction ? 'production' : 'development'}`);
    console.log(`[RuneBolt] CORS origin: ${isProduction ? (corsOrigin || 'LOCKED DOWN') : 'permissive'}`);
    console.log(`[RuneBolt] Rate limiting: enabled`);
    console.log(`[RuneBolt] Health check: http://localhost:${PORT}/health`);
  });
})();

export default app;
