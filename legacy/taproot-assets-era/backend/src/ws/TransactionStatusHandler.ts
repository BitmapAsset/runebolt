/**
 * WebSocket handlers for real-time transaction status updates
 * Enables push notifications for pending, confirming, and confirmed transactions
 */

import { WebSocket } from 'ws';
import Database from '../db/Database';

interface TransactionUpdate {
  id: string;
  type: 'transfer' | 'claim' | 'deposit' | 'withdrawal';
  status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  amount?: number;
  recipient?: string;
  sender?: string;
  timestamp: number;
  progress?: number;
  estimatedTime?: string;
  error?: string;
}

interface ClientSubscription {
  pubkey: string;
  ws: WebSocket;
  subscriptions: Set<string>;
}

// In-memory client registry (use Redis pub/sub for multi-instance in production)
const clients = new Map<string, ClientSubscription>();

/**
 * Subscribe a WebSocket client to transaction updates for a pubkey
 */
export function subscribeToTransactions(
  clientId: string,
  pubkey: string,
  ws: WebSocket
): void {
  const existing = clients.get(clientId);
  if (existing) {
    existing.pubkey = pubkey;
    existing.subscriptions.add(pubkey);
  } else {
    clients.set(clientId, {
      pubkey,
      ws,
      subscriptions: new Set([pubkey]),
    });
  }
  console.log(`[WS] Client ${clientId} subscribed to pubkey ${pubkey}`);
}

/**
 * Unsubscribe a client from all updates
 */
export function unsubscribeClient(clientId: string): void {
  clients.delete(clientId);
  console.log(`[WS] Client ${clientId} unsubscribed`);
}

/**
 * Broadcast a transaction update to all subscribed clients
 */
export function broadcastTransactionUpdate(
  pubkey: string,
  update: TransactionUpdate
): void {
  const message = JSON.stringify({
    type: 'transaction_update',
    data: update,
  });

  let sentCount = 0;
  for (const [_clientId, client] of clients) {
    if (client.subscriptions.has(pubkey) || client.pubkey === pubkey) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
        sentCount++;
      }
    }
  }

  console.log(`[WS] Broadcast transaction ${update.id} to ${sentCount} clients`);
}

/**
 * Send a transaction status update to a specific client
 */
export function sendTransactionStatus(
  clientId: string,
  update: TransactionUpdate
): boolean {
  const client = clients.get(clientId);
  if (!client || client.ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  client.ws.send(JSON.stringify({
    type: 'transaction_update',
    data: update,
  }));
  return true;
}

/**
 * Create a new transaction and broadcast its initial pending status
 */
export async function createAndBroadcastTransaction(
  tx: {
    id: string;
    type: TransactionUpdate['type'];
    from_pubkey?: string;
    to_pubkey?: string;
    amount?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const db = Database.getInstance();
  
  // Save to database
  await db.createTransactionStatus(tx);

  // Broadcast to involved parties
  const update: TransactionUpdate = {
    id: tx.id,
    type: tx.type,
    status: 'pending',
    amount: tx.amount,
    sender: tx.from_pubkey,
    recipient: tx.to_pubkey,
    timestamp: Date.now(),
    progress: 0,
    estimatedTime: tx.type === 'transfer' ? '< 1 second' : '~10 minutes',
  };

  if (tx.from_pubkey) {
    broadcastTransactionUpdate(tx.from_pubkey, update);
  }
  if (tx.to_pubkey && tx.to_pubkey !== tx.from_pubkey) {
    broadcastTransactionUpdate(tx.to_pubkey, { ...update, status: 'pending' });
  }
}

/**
 * Update transaction status and broadcast to subscribers
 */
export async function updateAndBroadcastTransaction(
  txId: string,
  status: TransactionUpdate['status'],
  metadata?: Record<string, unknown>
): Promise<void> {
  const db = Database.getInstance();
  
  // Update in database
  await db.updateTransactionStatus(txId, status, metadata);

  // Get transaction details
  const tx = await db.getTransactionStatus(txId);
  if (!tx) return;

  // Build update message
  const update: TransactionUpdate = {
    id: txId,
    type: tx.type as TransactionUpdate['type'],
    status,
    amount: tx.amount || undefined,
    sender: tx.from_pubkey || undefined,
    recipient: tx.to_pubkey || undefined,
    timestamp: Date.now(),
    progress: status === 'pending' ? 25 : status === 'confirming' ? 75 : 100,
    estimatedTime: status === 'confirmed' ? 'Complete' : status === 'failed' ? 'Failed' : undefined,
    error: metadata?.error as string | undefined,
  };

  // Broadcast to involved parties
  if (tx.from_pubkey) {
    broadcastTransactionUpdate(tx.from_pubkey, update);
  }
  if (tx.to_pubkey && tx.to_pubkey !== tx.from_pubkey) {
    broadcastTransactionUpdate(tx.to_pubkey, update);
  }
}

/**
 * Get active transaction count for metrics
 */
export function getActiveSubscriptionCount(): number {
  return clients.size;
}

/**
 * Handle WebSocket message for transaction subscription
 */
export function handleTransactionMessage(
  clientId: string,
  message: unknown,
  ws: WebSocket
): void {
  const msg = message as { type: string; pubkey?: string; action?: string };
  
  if (msg.type === 'subscribe_transactions' && msg.pubkey) {
    subscribeToTransactions(clientId, msg.pubkey, ws);
    
    // Send acknowledgment
    ws.send(JSON.stringify({
      type: 'subscribed',
      pubkey: msg.pubkey,
    }));
  }
  
  if (msg.type === 'unsubscribe_transactions') {
    unsubscribeClient(clientId);
  }
}

export default {
  subscribeToTransactions,
  unsubscribeClient,
  broadcastTransactionUpdate,
  sendTransactionStatus,
  createAndBroadcastTransaction,
  updateAndBroadcastTransaction,
  getActiveSubscriptionCount,
  handleTransactionMessage,
};
