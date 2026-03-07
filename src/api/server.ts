import express from 'express';
import cors from 'cors';
import http from 'http';
import { RunesBridge } from '../core/RunesBridge';
import { createRouter, errorHandler } from './routes';
import { createBitmapRouter } from './bitmap-routes';
import { setupWebSocket } from './websocket';
import { loadConfig } from '../utils/config';
import { createLogger } from '../utils/logger';

const log = createLogger('Server');

async function main(): Promise<void> {
  const config = loadConfig();
  const bridge = new RunesBridge(config);

  const app = express();

  app.use(cors({ origin: config.server.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));
  app.disable('x-powered-by');

  // Mount API routes
  app.use('/api/v1', createRouter(bridge));
  app.use('/api/v1', createBitmapRouter(bridge.bitmapMarketplace));

  // Error handler
  app.use(errorHandler);

  const server = http.createServer(app);

  // Setup WebSocket
  setupWebSocket(server, bridge);

  // Start the bridge
  try {
    await bridge.start();
  } catch (err) {
    log.warn({ err }, 'Bridge start encountered issues (LND may not be available)');
  }

  server.listen(config.server.port, config.server.host, () => {
    log.info(
      { port: config.server.port, host: config.server.host },
      'RuneBolt API server started',
    );
    log.info(`REST API: http://${config.server.host}:${config.server.port}/api/v1`);
    log.info(`WebSocket: ws://${config.server.host}:${config.server.port}/ws`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    log.info('Shutting down...');
    await bridge.stop();
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
