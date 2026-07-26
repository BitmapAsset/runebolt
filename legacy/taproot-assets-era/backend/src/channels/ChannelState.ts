/**
 * Channel state machine and type definitions.
 */

export enum ChannelState {
  PENDING_OPEN = 'PENDING_OPEN',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  FORCE_CLOSING = 'FORCE_CLOSING',
}

/**
 * Valid state transitions for the channel lifecycle.
 *
 * PENDING_OPEN -> OPEN (funding tx confirmed)
 * PENDING_OPEN -> CLOSED (funding failed or cancelled)
 * OPEN -> CLOSING (cooperative close initiated)
 * OPEN -> FORCE_CLOSING (unilateral close)
 * CLOSING -> CLOSED (closing tx confirmed)
 * FORCE_CLOSING -> CLOSED (timelock expired and sweep confirmed)
 */
const VALID_TRANSITIONS: Record<ChannelState, ChannelState[]> = {
  [ChannelState.PENDING_OPEN]: [ChannelState.OPEN, ChannelState.CLOSED],
  [ChannelState.OPEN]: [ChannelState.CLOSING, ChannelState.FORCE_CLOSING],
  [ChannelState.CLOSING]: [ChannelState.CLOSED],
  [ChannelState.CLOSED]: [],
  [ChannelState.FORCE_CLOSING]: [ChannelState.CLOSED],
};

/**
 * Check whether a state transition is valid.
 */
export function canTransition(from: ChannelState, to: ChannelState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validate and perform a state transition, throwing if invalid.
 */
export function assertTransition(from: ChannelState, to: ChannelState): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid channel state transition: ${from} -> ${to}. ` +
        `Allowed transitions from ${from}: [${VALID_TRANSITIONS[from].join(', ')}]`
    );
  }
}

/**
 * Channel data structure.
 */
export interface Channel {
  id: string;
  userPubkey: string;
  runeboltPubkey: string;
  fundingTxid: string | null;
  fundingVout: number | null;
  capacity: bigint;
  localBalance: bigint;
  remoteBalance: bigint;
  state: ChannelState;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert a database row to a Channel object.
 */
export function channelFromRow(row: {
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
}): Channel {
  return {
    id: row.id,
    userPubkey: row.user_pubkey,
    runeboltPubkey: row.runebolt_pubkey,
    fundingTxid: row.funding_txid,
    fundingVout: row.funding_vout,
    capacity: BigInt(row.capacity),
    localBalance: BigInt(row.local_balance),
    remoteBalance: BigInt(row.remote_balance),
    state: row.state as ChannelState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Serialize a Channel for JSON responses (bigints -> strings).
 */
export function channelToJson(channel: Channel): Record<string, unknown> {
  return {
    id: channel.id,
    userPubkey: channel.userPubkey,
    runeboltPubkey: channel.runeboltPubkey,
    fundingTxid: channel.fundingTxid,
    fundingVout: channel.fundingVout,
    capacity: channel.capacity.toString(),
    localBalance: channel.localBalance.toString(),
    remoteBalance: channel.remoteBalance.toString(),
    state: channel.state,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  };
}
