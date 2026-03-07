import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { RunesBridge } from '../core/RunesBridge';
import { SwapUpdate } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('WebSocket');

interface SubscribedClient {
  ws: WebSocket;
  swapIds: Set<string>;
}

const MAX_WS_CLIENTS = 200;
const MAX_MESSAGE_SIZE = 4096; // bytes
const MAX_SUBSCRIPTIONS_PER_CLIENT = 50;

export function setupWebSocket(server: http.Server, bridge: RunesBridge): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MESSAGE_SIZE });
  const clients = new Map<WebSocket, SubscribedClient>();

  wss.on('connection', (ws) => {
    if (clients.size >= MAX_WS_CLIENTS) {
      log.warn('WebSocket connection rejected: max clients reached');
      ws.close(1013, 'Too many connections');
      return;
    }

    log.info({ clientCount: clients.size + 1 }, 'WebSocket client connected');
    const client: SubscribedClient = { ws, swapIds: new Set() };
    clients.set(ws, client);

    ws.on('message', (data) => {
      try {
        const raw = data.toString();
        if (raw.length > MAX_MESSAGE_SIZE) {
          ws.send(JSON.stringify({ error: 'Message too large' }));
          return;
        }
        const msg = JSON.parse(raw);
        if (typeof msg.action !== 'string') {
          ws.send(JSON.stringify({ error: 'Missing action field' }));
          return;
        }
        handleMessage(client, msg);
      } catch (err) {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      log.info('WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      log.error({ err }, 'WebSocket error');
      clients.delete(ws);
    });

    ws.send(JSON.stringify({ type: 'connected', message: 'RuneBolt WebSocket connected' }));
  });

  // Forward swap updates to subscribed clients
  bridge.onSwapUpdate((update: SwapUpdate) => {
    const payload = JSON.stringify({
      type: 'swap_update',
      ...update,
      timestamp: update.timestamp.toISOString(),
    });

    for (const client of clients.values()) {
      if (client.swapIds.has(update.swapId) || client.swapIds.has('*')) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(payload);
        }
      }
    }
  });

  log.info('WebSocket server initialized');
  return wss;
}

function handleMessage(client: SubscribedClient, msg: { action: string; swapId?: string }): void {
  switch (msg.action) {
    case 'subscribe':
      if (msg.swapId) {
        if (client.swapIds.size >= MAX_SUBSCRIPTIONS_PER_CLIENT) {
          client.ws.send(JSON.stringify({ error: 'Too many subscriptions' }));
          return;
        }
        client.swapIds.add(msg.swapId);
        client.ws.send(JSON.stringify({ type: 'subscribed', swapId: msg.swapId }));
      }
      break;
    case 'subscribe_all':
      client.swapIds.add('*');
      client.ws.send(JSON.stringify({ type: 'subscribed', swapId: '*' }));
      break;
    case 'unsubscribe':
      if (msg.swapId) {
        client.swapIds.delete(msg.swapId);
        client.ws.send(JSON.stringify({ type: 'unsubscribed', swapId: msg.swapId }));
      }
      break;
    default:
      client.ws.send(JSON.stringify({ error: `Unknown action: ${msg.action}` }));
  }
}
