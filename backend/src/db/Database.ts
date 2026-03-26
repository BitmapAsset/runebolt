import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import path from 'path';
import fs from 'fs';

export interface ChannelRow {
  id: string;
  user_pubkey: string;
  runebolt_pubkey: string;
  funding_txid: string | null;
  funding_vout: number | null;
  capacity: number;
  local_balance: number;
  remote_balance: number;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface TransferRow {
  id: string;
  from_channel: string;
  to_channel: string;
  amount: number;
  memo: string | null;
  nonce: string | null;
  client_signature: string | null;
  transfer_hash: string | null;
  created_at: string;
}

export interface UserRow {
  pubkey: string;
  username: string | null;
  created_at: string;
}

export interface ClaimLinkRow {
  id: string;
  creator_pubkey: string;
  amount: number;
  memo: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface ChallengeRow {
  id: string;
  pubkey: string;
  challenge: string;
  expires_at: string;
}

export interface FeeRecordRow {
  id: string;
  transfer_id: string;
  pubkey: string;
  amount: number;
  fee_type: string;
  fee_rate: number;
  collected_at: string;
}

export interface UserTransactionCountRow {
  pubkey: string;
  count: number;
  last_reset: string;
}

export interface UserTierRow {
  pubkey: string;
  tier: string;
  created_at: string;
  updated_at: string;
}

export interface CommitmentRow {
  id: string;
  channel_id: string;
  sequence: number;
  local_balance: number;
  remote_balance: number;
  commitment_tx: string | null;
  signature: string | null;
  created_at: string;
}

export interface RevocationSecretRow {
  id: string;
  channel_id: string;
  sequence: number;
  secret: string;
  created_at: string;
}

export interface DisputeRow {
  id: string;
  channel_id: string;
  initiated_by: string;
  status: string;
  latest_sequence: number;
  challenge_deadline: string;
  broadcast_txid: string | null;
  created_at: string;
  updated_at: string;
}

export interface BreachAttemptRow {
  id: string;
  channel_id: string;
  detected_at: string;
  breach_txid: string;
  breach_tx_hex: string;
  penalty_txid: string | null;
  penalty_tx_hex: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PoolMetrics {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * Database - PostgreSQL connection pool manager for RuneBolt
 * 
 * Features:
 * - Connection pooling with configurable min/max connections
 * - Automatic prepared statements
 * - Transaction support
 * - Health checks and metrics
 */
class Database {
  private static instance: Database;
  private pool!: Pool;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Initialize the database connection pool
   */
  initialize(connectionString?: string): void {
    if (this.isInitialized) {
      return;
    }

    const connString = connectionString || process.env.DATABASE_URL;
    if (!connString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString: connString,
      max: parseInt(process.env.DB_POOL_MAX || '50', 10),
      min: parseInt(process.env.DB_POOL_MIN || '10', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '10000', 10),
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('[Database] Unexpected pool error:', err);
    });

    this.isInitialized = true;
    console.log('[Database] PostgreSQL pool initialized');
  }

  /**
   * Run migrations from SQL file
   */
  async runMigrations(migrationsPath?: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const migrationsDir = migrationsPath || path.join(__dirname, '../../migrations');
      const migrationFiles = fs.existsSync(migrationsDir)
        ? fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
        : [];

      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        const schema = fs.readFileSync(filePath, 'utf-8');
        await client.query(schema);
        console.log(`[Database] Migration applied: ${file}`);
      }

      console.log('[Database] All migrations completed');
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  /**
   * Execute a single-row query
   */
  async queryOne<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<T | undefined> {
    const result = await this.pool.query<T>(sql, params);
    return result.rows[0];
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ==================== Channel Methods ====================

  async getChannel(id: string): Promise<ChannelRow | undefined> {
    const result = await this.queryOne<ChannelRow>(
      'SELECT * FROM channels WHERE id = $1',
      [id]
    );
    return result;
  }

  async getChannelsByPubkey(pubkey: string): Promise<ChannelRow[]> {
    const result = await this.query<ChannelRow>(
      'SELECT * FROM channels WHERE user_pubkey = $1 ORDER BY created_at DESC',
      [pubkey]
    );
    return result.rows;
  }

  async createChannel(channel: {
    id: string;
    user_pubkey: string;
    runebolt_pubkey: string;
    funding_txid: string | null;
    funding_vout: number | null;
    capacity: number | string;
    local_balance: number | string;
    remote_balance: number | string;
    state: string;
  }): Promise<void> {
    await this.query(
      `INSERT INTO channels (id, user_pubkey, runebolt_pubkey, funding_txid, funding_vout, capacity, local_balance, remote_balance, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [channel.id, channel.user_pubkey, channel.runebolt_pubkey, channel.funding_txid, 
       channel.funding_vout, channel.capacity, channel.local_balance, channel.remote_balance, channel.state]
    );
  }

  async updateChannel(channel: {
    id: string;
    funding_txid: string | null;
    funding_vout: number | null;
    capacity: number | string;
    local_balance: number | string;
    remote_balance: number | string;
    state: string;
  }): Promise<void> {
    await this.query(
      `UPDATE channels 
       SET funding_txid = $1, funding_vout = $2, capacity = $3, local_balance = $4, 
           remote_balance = $5, state = $6, updated_at = NOW()
       WHERE id = $7`,
      [channel.funding_txid, channel.funding_vout, channel.capacity, channel.local_balance,
       channel.remote_balance, channel.state, channel.id]
    );
  }

  async updateChannelState(id: string, state: string): Promise<void> {
    await this.query(
      'UPDATE channels SET state = $1, updated_at = NOW() WHERE id = $2',
      [state, id]
    );
  }

  async updateChannelBalances(id: string, localBalance: number | string, remoteBalance: number | string): Promise<void> {
    await this.query(
      'UPDATE channels SET local_balance = $1, remote_balance = $2, updated_at = NOW() WHERE id = $3',
      [localBalance, remoteBalance, id]
    );
  }

  // ==================== Transfer Methods ====================

  async createTransfer(transfer: {
    id: string;
    from_channel: string;
    to_channel: string;
    amount: number | string;
    memo: string | null;
    nonce?: string | null;
    client_signature?: string | null;
    transfer_hash?: string | null;
  }): Promise<void> {
    await this.query(
      `INSERT INTO transfers (id, from_channel, to_channel, amount, memo, nonce, client_signature, transfer_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [transfer.id, transfer.from_channel, transfer.to_channel, transfer.amount, transfer.memo,
       transfer.nonce || null, transfer.client_signature || null, transfer.transfer_hash || null]
    );
  }

  async getTransferByNonce(nonce: string): Promise<{ id: string } | undefined> {
    return this.queryOne<{ id: string }>(
      'SELECT id FROM transfers WHERE nonce = $1',
      [nonce]
    );
  }

  async getTransfersByChannel(channelId: string, limit: number = 50, offset: number = 0): Promise<TransferRow[]> {
    const result = await this.query<TransferRow>(
      `SELECT * FROM transfers 
       WHERE from_channel = $1 OR to_channel = $1 
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [channelId, limit, offset]
    );
    return result.rows;
  }

  async getTransfersBySender(channelIds: string[], limit: number = 50): Promise<TransferRow[]> {
    const result = await this.query<TransferRow>(
      `SELECT * FROM transfers 
       WHERE from_channel = ANY($1)
       ORDER BY created_at DESC LIMIT $2`,
      [channelIds, limit]
    );
    return result.rows;
  }

  async getTransfersByRecipient(channelIds: string[], limit: number = 50): Promise<TransferRow[]> {
    const result = await this.query<TransferRow>(
      `SELECT * FROM transfers 
       WHERE to_channel = ANY($1)
       ORDER BY created_at DESC LIMIT $2`,
      [channelIds, limit]
    );
    return result.rows;
  }

  async getTransfersByPubkey(pubkey: string, limit: number = 50, offset: number = 0): Promise<TransferRow[]> {
    const channelsResult = await this.query<{ id: string }>(
      'SELECT id FROM channels WHERE user_pubkey = $1',
      [pubkey]
    );
    const channelIds = channelsResult.rows.map(r => r.id);

    if (channelIds.length === 0) return [];

    const [sent, received] = await Promise.all([
      this.getTransfersBySender(channelIds, limit),
      this.getTransfersByRecipient(channelIds, limit),
    ]);

    const all = [...sent, ...received];
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return all.slice(offset, offset + limit);
  }

  // ==================== User Methods ====================

  async getUser(pubkey: string): Promise<UserRow | undefined> {
    return this.queryOne<UserRow>('SELECT * FROM users WHERE pubkey = $1', [pubkey]);
  }

  async getUserByUsername(username: string): Promise<UserRow | undefined> {
    return this.queryOne<UserRow>('SELECT * FROM users WHERE username = $1', [username]);
  }

  async createUser(pubkey: string): Promise<void> {
    await this.query(
      'INSERT INTO users (pubkey) VALUES ($1) ON CONFLICT (pubkey) DO NOTHING',
      [pubkey]
    );
  }

  async updateUsername(pubkey: string, username: string): Promise<void> {
    await this.query('UPDATE users SET username = $1 WHERE pubkey = $2', [username, pubkey]);
  }

  // ==================== Claim Link Methods ====================

  async createClaimLink(link: {
    id: string;
    creator_pubkey: string;
    amount: number;
    memo: string | null;
    expires_at: string;
  }): Promise<void> {
    await this.query(
      `INSERT INTO claim_links (id, creator_pubkey, amount, memo, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [link.id, link.creator_pubkey, link.amount, link.memo, link.expires_at]
    );
  }

  async getClaimLink(id: string): Promise<ClaimLinkRow | undefined> {
    return this.queryOne<ClaimLinkRow>('SELECT * FROM claim_links WHERE id = $1', [id]);
  }

  async claimLink(id: string, claimedBy: string): Promise<void> {
    await this.query(
      'UPDATE claim_links SET claimed_by = $1, claimed_at = NOW() WHERE id = $2',
      [claimedBy, id]
    );
  }

  // ==================== Challenge Methods ====================

  async createChallenge(challenge: {
    id: string;
    pubkey: string;
    challenge: string;
    expires_at: string;
  }): Promise<void> {
    await this.transaction(async (client) => {
      await client.query('DELETE FROM challenges WHERE expires_at < NOW()');
      await client.query(
        'INSERT INTO challenges (id, pubkey, challenge, expires_at) VALUES ($1, $2, $3, $4)',
        [challenge.id, challenge.pubkey, challenge.challenge, challenge.expires_at]
      );
    });
  }

  async getChallenge(id: string): Promise<ChallengeRow | undefined> {
    return this.queryOne<ChallengeRow>('SELECT * FROM challenges WHERE id = $1', [id]);
  }

  async deleteChallenge(id: string): Promise<void> {
    await this.query('DELETE FROM challenges WHERE id = $1', [id]);
  }

  // ==================== Commitment Methods ====================

  async createCommitment(commitment: {
    channel_id: string;
    sequence: number;
    local_balance: number;
    remote_balance: number;
    commitment_tx?: string;
    signature?: string;
  }): Promise<void> {
    await this.query(
      `INSERT INTO commitments (channel_id, sequence, local_balance, remote_balance, commitment_tx, signature)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [commitment.channel_id, commitment.sequence, commitment.local_balance, 
       commitment.remote_balance, commitment.commitment_tx || null, commitment.signature || null]
    );
  }

  async getLatestCommitment(channelId: string): Promise<CommitmentRow | undefined> {
    return this.queryOne<CommitmentRow>(
      'SELECT * FROM commitments WHERE channel_id = $1 ORDER BY sequence DESC LIMIT 1',
      [channelId]
    );
  }

  async getCommitmentsByChannel(channelId: string, limit: number = 10): Promise<CommitmentRow[]> {
    const result = await this.query<CommitmentRow>(
      'SELECT * FROM commitments WHERE channel_id = $1 ORDER BY sequence DESC LIMIT $2',
      [channelId, limit]
    );
    return result.rows;
  }

  // ==================== Health & Metrics ====================

  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return { healthy: true, latency: Date.now() - start };
    } catch (err) {
      return { 
        healthy: false, 
        latency: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  getPoolMetrics(): PoolMetrics {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  async createNextPartition(): Promise<void> {
    try {
      await this.query('SELECT create_transfer_partition()');
      console.log('[Database] Created next month partition');
    } catch (err) {
      console.error('[Database] Failed to create partition:', err);
    }
  }

  async cleanupExpiredData(): Promise<void> {
    try {
      await this.query('SELECT cleanup_expired_data()');
      console.log('[Database] Cleaned up expired data');
    } catch (err) {
      console.error('[Database] Failed to cleanup:', err);
    }
  }

  // ==================== Transaction Status Methods ====================

  async createTransactionStatus(tx: {
    id: string;
    type: string;
    from_pubkey?: string;
    to_pubkey?: string;
    amount?: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.query(
      `INSERT INTO transaction_status (id, type, status, from_pubkey, to_pubkey, amount, metadata, created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, NOW(), NOW())`,
      [tx.id, tx.type, tx.from_pubkey || null, tx.to_pubkey || null, tx.amount || null, 
       tx.metadata ? JSON.stringify(tx.metadata) : null]
    );
  }

  async updateTransactionStatus(
    id: string, 
    status: string, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const completedAt = status === 'confirmed' || status === 'failed' ? 'NOW()' : null;
    await this.query(
      `UPDATE transaction_status 
       SET status = $1, updated_at = NOW(), 
           completed_at = ${completedAt},
           metadata = COALESCE($2, metadata)
       WHERE id = $3`,
      [status, metadata ? JSON.stringify(metadata) : null, id]
    );
  }

  async getTransactionStatus(id: string): Promise<{
    id: string;
    type: string;
    status: string;
    from_pubkey: string | null;
    to_pubkey: string | null;
    amount: number | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  } | undefined> {
    const row = await this.queryOne<{
      id: string;
      type: string;
      status: string;
      from_pubkey: string | null;
      to_pubkey: string | null;
      amount: number | null;
      metadata: string | null;
      created_at: string;
      updated_at: string;
      completed_at: string | null;
    }>('SELECT * FROM transaction_status WHERE id = $1', [id]);
    
    if (!row) return undefined;
    
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    };
  }

  async getTransactionsByPubkey(
    pubkey: string, 
    limit: number = 20
  ): Promise<Array<{
    id: string;
    type: string;
    status: string;
    from_pubkey: string | null;
    to_pubkey: string | null;
    amount: number | null;
    created_at: string;
    updated_at: string;
  }>> {
    const result = await this.query<{
      id: string;
      type: string;
      status: string;
      from_pubkey: string | null;
      to_pubkey: string | null;
      amount: number | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, type, status, from_pubkey, to_pubkey, amount, created_at, updated_at
       FROM transaction_status 
       WHERE from_pubkey = $1 OR to_pubkey = $1
       ORDER BY updated_at DESC LIMIT $2`,
      [pubkey, limit]
    );
    return result.rows;
  }

  // ==================== Transaction Count Methods ====================

  async getTransactionCount(pubkey: string): Promise<UserTransactionCountRow | undefined> {
    return this.queryOne<UserTransactionCountRow>(
      'SELECT * FROM user_transaction_counts WHERE pubkey = $1',
      [pubkey]
    );
  }

  async incrementTransactionCount(pubkey: string): Promise<number> {
    const result = await this.queryOne<{ count: number }>(
      `INSERT INTO user_transaction_counts (pubkey, count)
       VALUES ($1, 1)
       ON CONFLICT (pubkey) DO UPDATE SET count = user_transaction_counts.count + 1
       RETURNING count`,
      [pubkey]
    );
    return result?.count ?? 1;
  }

  // ==================== Fee Record Methods ====================

  async createFeeRecord(fee: {
    transfer_id: string;
    pubkey: string;
    amount: number | string;
    fee_type: string;
    fee_rate: number;
  }): Promise<void> {
    await this.query(
      `INSERT INTO fee_records (transfer_id, pubkey, amount, fee_type, fee_rate)
       VALUES ($1, $2, $3, $4, $5)`,
      [fee.transfer_id, fee.pubkey, fee.amount, fee.fee_type, fee.fee_rate]
    );
  }

  async getFeesByPubkey(pubkey: string, limit: number = 50): Promise<FeeRecordRow[]> {
    const result = await this.query<FeeRecordRow>(
      'SELECT * FROM fee_records WHERE pubkey = $1 ORDER BY collected_at DESC LIMIT $2',
      [pubkey, limit]
    );
    return result.rows;
  }

  // ==================== User Tier Methods ====================

  async getUserTier(pubkey: string): Promise<UserTierRow | undefined> {
    return this.queryOne<UserTierRow>(
      'SELECT * FROM user_tiers WHERE pubkey = $1',
      [pubkey]
    );
  }

  async ensureUserTier(pubkey: string): Promise<UserTierRow> {
    const result = await this.queryOne<UserTierRow>(
      `INSERT INTO user_tiers (pubkey, tier)
       VALUES ($1, 'free')
       ON CONFLICT (pubkey) DO UPDATE SET pubkey = user_tiers.pubkey
       RETURNING *`,
      [pubkey]
    );
    return result!;
  }

  async updateUserTier(pubkey: string, tier: string): Promise<void> {
    await this.query(
      `INSERT INTO user_tiers (pubkey, tier)
       VALUES ($1, $2)
       ON CONFLICT (pubkey) DO UPDATE SET tier = $2`,
      [pubkey, tier]
    );
  }

  // ==================== Revocation Secret Methods ====================

  async storeRevocationSecret(
    channelId: string,
    sequence: number,
    secret: string
  ): Promise<void> {
    await this.query(
      `INSERT INTO revocation_secrets (channel_id, sequence, secret)
       VALUES ($1, $2, $3)
       ON CONFLICT (channel_id, sequence) DO UPDATE SET secret = $3`,
      [channelId, sequence, secret]
    );
  }

  async getRevocationSecrets(channelId: string): Promise<RevocationSecretRow[]> {
    const result = await this.query<RevocationSecretRow>(
      'SELECT * FROM revocation_secrets WHERE channel_id = $1 ORDER BY sequence ASC',
      [channelId]
    );
    return result.rows;
  }

  async getRevocationSecret(
    channelId: string,
    sequence: number
  ): Promise<RevocationSecretRow | undefined> {
    return this.queryOne<RevocationSecretRow>(
      'SELECT * FROM revocation_secrets WHERE channel_id = $1 AND sequence = $2',
      [channelId, sequence]
    );
  }

  // ==================== Dispute Methods ====================

  async createDispute(dispute: {
    channel_id: string;
    initiated_by: string;
    latest_sequence: number;
    challenge_deadline: string;
    broadcast_txid: string | null;
  }): Promise<DisputeRow> {
    const result = await this.queryOne<DisputeRow>(
      `INSERT INTO disputes (channel_id, initiated_by, latest_sequence, challenge_deadline, broadcast_txid)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (channel_id) DO UPDATE
         SET initiated_by = $2, status = 'open', latest_sequence = $3,
             challenge_deadline = $4, broadcast_txid = $5, updated_at = NOW()
       RETURNING *`,
      [dispute.channel_id, dispute.initiated_by, dispute.latest_sequence,
       dispute.challenge_deadline, dispute.broadcast_txid]
    );
    return result!;
  }

  async getDispute(channelId: string): Promise<DisputeRow | undefined> {
    return this.queryOne<DisputeRow>(
      'SELECT * FROM disputes WHERE channel_id = $1',
      [channelId]
    );
  }

  async resolveDispute(channelId: string): Promise<DisputeRow> {
    const result = await this.queryOne<DisputeRow>(
      `UPDATE disputes SET status = 'resolved', updated_at = NOW()
       WHERE channel_id = $1 RETURNING *`,
      [channelId]
    );
    if (!result) {
      throw new Error(`No dispute found for channel ${channelId}`);
    }
    return result;
  }

  // ==================== Breach Attempt Methods ====================

  async recordBreach(breach: {
    channel_id: string;
    breach_txid: string;
    breach_tx_hex: string;
    penalty_txid: string | null;
    penalty_tx_hex: string | null;
    status: string;
  }): Promise<BreachAttemptRow> {
    const result = await this.queryOne<BreachAttemptRow>(
      `INSERT INTO breach_attempts (channel_id, breach_txid, breach_tx_hex, penalty_txid, penalty_tx_hex, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [breach.channel_id, breach.breach_txid, breach.breach_tx_hex,
       breach.penalty_txid, breach.penalty_tx_hex, breach.status]
    );
    return result!;
  }

  async getBreaches(channelId: string): Promise<BreachAttemptRow[]> {
    const result = await this.query<BreachAttemptRow>(
      'SELECT * FROM breach_attempts WHERE channel_id = $1 ORDER BY detected_at DESC',
      [channelId]
    );
    return result.rows;
  }

  // ==================== Stats Methods ====================

  async getPublicStats(): Promise<{
    totalUsers: number;
    totalTransfers: number;
    totalVolume: string;
    totalChannels: number;
    openChannels: number;
  }> {
    const [users, transfers, volume, channels, openChannels] = await Promise.all([
      this.queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users'),
      this.queryOne<{ count: string }>('SELECT COUNT(*) as count FROM transfers'),
      this.queryOne<{ total: string }>('SELECT COALESCE(SUM(amount), 0) as total FROM transfers'),
      this.queryOne<{ count: string }>('SELECT COUNT(*) as count FROM channels'),
      this.queryOne<{ count: string }>("SELECT COUNT(*) as count FROM channels WHERE state = 'OPEN'"),
    ]);

    return {
      totalUsers: parseInt(users?.count || '0', 10),
      totalTransfers: parseInt(transfers?.count || '0', 10),
      totalVolume: volume?.total || '0',
      totalChannels: parseInt(channels?.count || '0', 10),
      openChannels: parseInt(openChannels?.count || '0', 10),
    };
  }

  // ==================== Asset Methods ====================

  async getAsset(id: string): Promise<{ id: string; name: string; type: string; config: Record<string, unknown>; created_at: string } | undefined> {
    const row = await this.queryOne<{ id: string; name: string; type: string; config: string; created_at: string }>(
      'SELECT * FROM assets WHERE id = $1',
      [id]
    );
    if (!row) return undefined;
    return { ...row, config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config };
  }

  async getAllAssets(): Promise<Array<{ id: string; name: string; type: string; config: Record<string, unknown>; created_at: string }>> {
    const result = await this.query<{ id: string; name: string; type: string; config: string; created_at: string }>(
      'SELECT * FROM assets ORDER BY id'
    );
    return result.rows.map(row => ({
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    }));
  }

  async upsertAsset(asset: { id: string; name: string; type: string; config: Record<string, unknown> }): Promise<void> {
    await this.query(
      `INSERT INTO assets (id, name, type, config)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = $2, type = $3, config = $4`,
      [asset.id, asset.name, asset.type, JSON.stringify(asset.config)]
    );
  }

  // ==================== Escrow Methods ====================

  async getEscrow(id: string): Promise<{
    id: string; seller_pubkey: string; buyer_pubkey: string; inscription_id: string;
    price_asset: string; price_amount: string; status: string; timeout_at: string; created_at: string;
  } | undefined> {
    return this.queryOne(
      'SELECT * FROM escrows WHERE id = $1',
      [id]
    );
  }

  async getEscrowsByPubkey(pubkey: string): Promise<Array<{
    id: string; seller_pubkey: string; buyer_pubkey: string; inscription_id: string;
    price_asset: string; price_amount: string; status: string; timeout_at: string; created_at: string;
  }>> {
    const result = await this.query(
      'SELECT * FROM escrows WHERE seller_pubkey = $1 OR buyer_pubkey = $1 ORDER BY created_at DESC',
      [pubkey]
    );
    return result.rows as Array<{
      id: string; seller_pubkey: string; buyer_pubkey: string; inscription_id: string;
      price_asset: string; price_amount: string; status: string; timeout_at: string; created_at: string;
    }>;
  }

  async getExpiredEscrows(): Promise<Array<{ id: string; status: string }>> {
    const result = await this.query<{ id: string; status: string }>(
      `SELECT id, status FROM escrows
       WHERE timeout_at < NOW() AND status NOT IN ('completed', 'refunded', 'expired')`
    );
    return result.rows;
  }

  async expireEscrow(id: string): Promise<void> {
    await this.query(
      "UPDATE escrows SET status = 'expired' WHERE id = $1",
      [id]
    );
  }

  // ==================== Asset Balance Methods ====================

  async getAssetBalance(userPubkey: string, assetId: string): Promise<string> {
    const row = await this.queryOne<{ balance: string }>(
      'SELECT balance FROM asset_balances WHERE user_pubkey = $1 AND asset_id = $2',
      [userPubkey, assetId]
    );
    return row?.balance ?? '0';
  }

  async getAssetBalancesByPubkey(userPubkey: string): Promise<Array<{ asset_id: string; balance: string; updated_at: string }>> {
    const result = await this.query<{ asset_id: string; balance: string; updated_at: string }>(
      'SELECT asset_id, balance, updated_at FROM asset_balances WHERE user_pubkey = $1',
      [userPubkey]
    );
    return result.rows;
  }

  async updateAssetBalance(userPubkey: string, assetId: string, amount: string): Promise<void> {
    await this.query(
      `INSERT INTO asset_balances (user_pubkey, asset_id, balance, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_pubkey, asset_id)
       DO UPDATE SET balance = asset_balances.balance + $3::numeric, updated_at = NOW()`,
      [userPubkey, assetId, amount]
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
    console.log('[Database] Pool closed');
  }
}

export default Database;