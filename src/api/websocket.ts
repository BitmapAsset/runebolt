import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { RuneBolt } from '../core/RuneBolt';
import { createLogger } from '../utils/logger';

const log = createLogger('WebSocket');

const MAX_CONNECTIONS = 50;
const HEARTBEAT_INTERVAL_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 300_000; // 5 minutes idle timeout

// Events safe to broadcast publicly (no sensitive data like keys/preimages)
const PUBLIC_EVENTS = new Set([
  'balance_updated',
  'channel_opened',
  'channel_closed',
  'transfer_completed',
  'block_height',
]);

export function setupWebSocket(server: http.Server, bolt: RuneBolt): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 64 * 1024, // 64KB max message size
    verifyClient: (info, callback) => {
      if (wss.clients.size >= MAX_CONNECTIONS) {
        log.warn('WebSocket connection rejected: max connections reached');
        callback(false, 429, 'Too many connections');
        return;
      }
      callback(true);
    },
  });

  // Heartbeat to detect and close stale connections
  const heartbeatInterval = setInterval(() => {
    for (const ws of wss.clients) {
      const client = ws as WebSocket & { isAlive?: boolean };
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws: WebSocket) => {
    const client = ws as WebSocket & { isAlive?: boolean };
    client.isAlive = true;
    log.info({ totalClients: wss.clients.size }, 'WebSocket client connected');

    client.on('pong', () => {
      client.isAlive = true;
    });

    // Auto-close after idle timeout
    let timeout = setTimeout(() => {
      log.info('WebSocket client timed out');
      ws.close(1000, 'Connection timeout');
    }, CONNECTION_TIMEOUT_MS);

    ws.on('message', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        ws.close(1000, 'Connection timeout');
      }, CONNECTION_TIMEOUT_MS);
    });

    ws.on('error', (err) => {
      log.error({ err }, 'WebSocket error');
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      log.info({ totalClients: wss.clients.size - 1 }, 'WebSocket client disconnected');
    });
  });

  // Forward only public wallet events (filter out sensitive data)
  bolt.onUpdate((update) => {
    if (!PUBLIC_EVENTS.has(update.event)) return;

    const message = JSON.stringify({
      event: update.event,
      data: update.data,
      timestamp: update.timestamp.toISOString(),
    });

    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  log.info('WebSocket server initialized');
  return wss;
}
