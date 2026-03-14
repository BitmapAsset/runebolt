import express from 'express';
import cors from 'cors';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { RuneBolt } from '../core/RuneBolt';
import { createRouter, errorHandler } from './routes';
import { setupWebSocket } from './websocket';
import { loadConfig } from '../utils/config';
import { createLogger } from '../utils/logger';

const log = createLogger('Server');

async function main(): Promise<void> {
  const config = loadConfig();
  const bolt = new RuneBolt(config);

  const app = express();

  // Trust proxy if behind reverse proxy
  app.set('trust proxy', 1);

  app.use(cors({ origin: config.server.corsOrigins, credentials: false }));
  app.use(express.json({ limit: '100kb' }));
  app.disable('x-powered-by');

  // Global rate limit: 100 requests per minute per IP
  app.use(rateLimit({
    windowMs: 60_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  }));

  // Strict rate limit for sensitive endpoints
  const sensitiveRateLimit = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later' },
  });
  app.use('/api/v1/wallet/unlock', sensitiveRateLimit);
  app.use('/api/v1/send', sensitiveRateLimit);
  app.use('/api/v1/wrap', sensitiveRateLimit);
  app.use('/api/v1/unwrap', sensitiveRateLimit);
  app.use('/api/v1/channels/open', sensitiveRateLimit);
  app.use('/api/v1/channels/close', sensitiveRateLimit);

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none';"
    );
    next();
  });

  app.use('/api/v1', createRouter(bolt));
  app.use(errorHandler);

  const server = http.createServer(app);
  setupWebSocket(server, bolt);

  // Connect to daemons
  try {
    await bolt.connect();
  } catch (err) {
    log.warn({ err }, 'Daemon connection issues (LND/tapd may not be available)');
  }

  server.listen(config.server.port, config.server.host, () => {
    log.info(
      { port: config.server.port, host: config.server.host },
      'RuneBolt API server started',
    );
    log.info(`REST API: http://${config.server.host}:${config.server.port}/api/v1`);
    log.info(`WebSocket: ws://${config.server.host}:${config.server.port}/ws`);
    log.info('No telemetry. No tracking. Self-sovereign.');
  });

  const shutdown = async () => {
    log.info('Shutting down...');
    bolt.lock();
    await bolt.disconnect();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  log.error({ err }, 'Fatal error');
  process.exit(1);
});
