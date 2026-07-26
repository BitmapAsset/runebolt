/**
 * WebSocket server for real-time channel updates and transfer notifications.
 *
 * SECURITY HARDENING:
 * - JWT authentication required on connection upgrade
 * - Message size limit (64KB)
 * - Rate limiting (100 messages/minute per connection)
 * - Heartbeat ping/pong (30s interval, 90s timeout kills dead connections)
 * - JSON structure validation before processing
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer as WsServer, WebSocket } from 'ws';
import { verifyToken, AuthPayload } from '../auth/AuthMiddleware';

/** Maximum message size in bytes (64KB) */
const MAX_MESSAGE_SIZE = 64 * 1024;
/** Maximum messages per rate limit window */
const RATE_LIMIT_MAX = 100;
/** Rate limit window in milliseconds (60 seconds) */
const RATE_LIMIT_WINDOW_MS = 60_000;
/** Heartbeat ping interval (30 seconds) */
const HEARTBEAT_INTERVAL_MS = 30_000;
/** Connection considered dead after this many ms without pong (90 seconds) */
const HEARTBEAT_TIMEOUT_MS = 90_000;

interface AuthenticatedClient {
  ws: WebSocket;
  pubkey: string;
  subscribedChannels: Set<string>;
  /** Timestamps of recent messages for rate limiting */
  messageTimestamps: number[];
  /** Last time we received a pong from this client */
  lastPong: number;
  /** Whether we are waiting for a pong response */
  awaitingPong: boolean;
}

export class WebSocketManager {
  private wss: WsServer;
  private clients: Map<string, AuthenticatedClient> = new Map();
  // Map from channel ID to set of connected client IDs
  private channelSubscriptions: Map<string, Set<string>> = new Map();
  // Map from pubkey to set of client IDs (a user may have multiple connections)
  private pubkeyClients: Map<string, Set<string>> = new Map();
  private clientIdCounter = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WsServer({
      server,
      path: '/ws',
      maxPayload: MAX_MESSAGE_SIZE,
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req.url || '');
    });

    // Start heartbeat check
    this.heartbeatTimer = setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL_MS);

    console.log('[WebSocket] Server initialized on /ws');
  }

  /**
   * Check all connections for heartbeat health.
   * Sends ping to alive connections, terminates dead ones.
   */
  private checkHeartbeats(): void {
    const now = Date.now();

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState !== WebSocket.OPEN) {
        this.handleDisconnect(clientId);
        continue;
      }

      // If we sent a ping and haven't gotten a pong within the timeout, kill it
      if (client.awaitingPong && (now - client.lastPong) > HEARTBEAT_TIMEOUT_MS) {
        console.log(`[WebSocket] Heartbeat timeout for ${clientId}, terminating`);
        client.ws.terminate();
        this.handleDisconnect(clientId);
        continue;
      }

      // Send ping
      client.awaitingPong = true;
      client.ws.ping();
    }
  }

  private handleConnection(ws: WebSocket, url: string): void {
    const clientId = `client_${++this.clientIdCounter}`;

    // Extract token from query string
    const urlParams = new URL(url, 'http://localhost');
    const token = urlParams.searchParams.get('token');

    // SECURITY: Require authentication — reject connections without valid JWT
    if (!token) {
      ws.send(
        JSON.stringify({
          event: 'error',
          data: { message: 'Authentication required: provide ?token=<jwt>' },
        })
      );
      ws.close(4001, 'Authentication required');
      return;
    }

    let auth: AuthPayload;
    try {
      auth = verifyToken(token);
      console.log(`[WebSocket] Authenticated: ${auth.pubkey.slice(0, 16)}...`);
    } catch {
      console.log(`[WebSocket] Invalid token for ${clientId}`);
      ws.send(
        JSON.stringify({
          event: 'error',
          data: { message: 'Invalid authentication token' },
        })
      );
      ws.close(4001, 'Authentication failed');
      return;
    }

    const now = Date.now();
    const client: AuthenticatedClient = {
      ws,
      pubkey: auth.pubkey,
      subscribedChannels: new Set(),
      messageTimestamps: [],
      lastPong: now,
      awaitingPong: false,
    };

    this.clients.set(clientId, client);

    // Track pubkey -> clients mapping
    if (!this.pubkeyClients.has(auth.pubkey)) {
      this.pubkeyClients.set(auth.pubkey, new Set());
    }
    this.pubkeyClients.get(auth.pubkey)!.add(clientId);

    // Send welcome message
    ws.send(
      JSON.stringify({
        event: 'connected',
        data: {
          clientId,
          authenticated: true,
          pubkey: auth.pubkey.slice(0, 16),
        },
      })
    );

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      client.lastPong = Date.now();
      client.awaitingPong = false;
    });

    // Handle incoming messages
    ws.on('message', (data) => {
      const raw = data.toString();

      // SECURITY: Message size check (defense in depth — maxPayload handles binary)
      if (raw.length > MAX_MESSAGE_SIZE) {
        ws.send(
          JSON.stringify({
            event: 'error',
            data: { message: 'Message exceeds maximum size of 64KB' },
          })
        );
        return;
      }

      // SECURITY: Rate limiting
      if (!this.checkRateLimit(client)) {
        ws.send(
          JSON.stringify({
            event: 'error',
            data: { message: `Rate limit exceeded: max ${RATE_LIMIT_MAX} messages per minute` },
          })
        );
        return;
      }

      this.handleMessage(clientId, raw);
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (err) => {
      console.log(`[WebSocket] Error for ${clientId}:`, err.message);
      this.handleDisconnect(clientId);
    });

    console.log(`[WebSocket] New connection: ${clientId}`);
  }

  /**
   * Check and enforce rate limiting for a client.
   * Returns true if message is allowed, false if rate limited.
   */
  private checkRateLimit(client: AuthenticatedClient): boolean {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Remove timestamps outside the window
    client.messageTimestamps = client.messageTimestamps.filter(ts => ts > windowStart);

    if (client.messageTimestamps.length >= RATE_LIMIT_MAX) {
      return false;
    }

    client.messageTimestamps.push(now);
    return true;
  }

  private handleMessage(clientId: string, raw: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // SECURITY: Validate JSON structure before processing
    let message: { event?: unknown; data?: unknown };
    try {
      message = JSON.parse(raw) as { event?: unknown; data?: unknown };
    } catch {
      client.ws.send(
        JSON.stringify({
          event: 'error',
          data: { message: 'Invalid JSON message' },
        })
      );
      return;
    }

    // Validate message has required structure
    if (!message || typeof message !== 'object' || typeof message.event !== 'string') {
      client.ws.send(
        JSON.stringify({
          event: 'error',
          data: { message: 'Message must have a string "event" field' },
        })
      );
      return;
    }

    switch (message.event) {
      case 'subscribe': {
        const data = message.data as { channelId?: string } | undefined;
        const channelId = data?.channelId;
        if (!channelId || typeof channelId !== 'string') {
          client.ws.send(
            JSON.stringify({
              event: 'error',
              data: { message: 'channelId is required for subscribe' },
            })
          );
          return;
        }

        // Subscribe to channel updates
        client.subscribedChannels.add(channelId);
        if (!this.channelSubscriptions.has(channelId)) {
          this.channelSubscriptions.set(channelId, new Set());
        }
        this.channelSubscriptions.get(channelId)!.add(clientId);

        client.ws.send(
          JSON.stringify({
            event: 'subscribed',
            data: { channelId },
          })
        );

        console.log(`[WebSocket] ${clientId} subscribed to channel ${channelId}`);
        break;
      }

      case 'unsubscribe': {
        const data = message.data as { channelId?: string } | undefined;
        const channelId = data?.channelId;
        if (channelId && typeof channelId === 'string') {
          client.subscribedChannels.delete(channelId);
          this.channelSubscriptions.get(channelId)?.delete(clientId);
        }

        client.ws.send(
          JSON.stringify({
            event: 'unsubscribed',
            data: { channelId },
          })
        );
        break;
      }

      case 'ping': {
        client.ws.send(JSON.stringify({ event: 'pong', data: {} }));
        break;
      }

      default: {
        client.ws.send(
          JSON.stringify({
            event: 'error',
            data: { message: `Unknown event: ${message.event}` },
          })
        );
      }
    }
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from channel subscriptions
    for (const channelId of client.subscribedChannels) {
      this.channelSubscriptions.get(channelId)?.delete(clientId);
      if (this.channelSubscriptions.get(channelId)?.size === 0) {
        this.channelSubscriptions.delete(channelId);
      }
    }

    // Remove from pubkey tracking
    if (client.pubkey) {
      this.pubkeyClients.get(client.pubkey)?.delete(clientId);
      if (this.pubkeyClients.get(client.pubkey)?.size === 0) {
        this.pubkeyClients.delete(client.pubkey);
      }
    }

    this.clients.delete(clientId);
    console.log(`[WebSocket] ${clientId} disconnected`);
  }

  /**
   * Broadcast an event to all clients subscribed to a specific channel.
   */
  broadcastToChannel(channelId: string, event: string, data: unknown): void {
    const subscribers = this.channelSubscriptions.get(channelId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify({ event, data });

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }

    console.log(`[WebSocket] Broadcast "${event}" to ${subscribers.size} subscribers of channel ${channelId}`);
  }

  /**
   * Broadcast an event to all connections for a specific pubkey.
   */
  broadcastToUser(pubkey: string, event: string, data: unknown): void {
    const clientIds = this.pubkeyClients.get(pubkey);
    if (!clientIds || clientIds.size === 0) return;

    const message = JSON.stringify({ event, data });

    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }

    console.log(`[WebSocket] Broadcast "${event}" to ${clientIds.size} connections for pubkey ${pubkey.slice(0, 16)}...`);
  }

  /**
   * Broadcast a channel state change to all subscribers of that channel.
   */
  broadcastChannelStateChange(channelId: string, newState: string, details?: Record<string, unknown>): void {
    this.broadcastToChannel(channelId, 'channel:state_changed', {
      channelId,
      state: newState,
      ...details,
    });
  }

  /**
   * Broadcast balance update to a specific user for a specific channel.
   */
  broadcastBalanceUpdate(pubkey: string, channelId: string, balance: {
    local: string;
    remote: string;
    capacity: string;
  }): void {
    this.broadcastToUser(pubkey, 'balance:updated', {
      channelId,
      ...balance,
    });
  }

  /**
   * Get the number of connected clients.
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Graceful shutdown: stop heartbeat and close all connections.
   */
  shutdown(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const [, client] of this.clients) {
      client.ws.close(1001, 'Server shutting down');
    }
    this.clients.clear();
    this.channelSubscriptions.clear();
    this.pubkeyClients.clear();
  }
}

// Singleton instance, initialized when the HTTP server starts
let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(server: HttpServer): WebSocketManager {
  wsManager = new WebSocketManager(server);
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}
