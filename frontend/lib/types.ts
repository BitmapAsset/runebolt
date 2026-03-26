export enum ChannelState {
  PENDING_OPEN = 'PENDING_OPEN',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  FORCE_CLOSING = 'FORCE_CLOSING',
}

export interface Channel {
  id: string;
  counterparty: string;
  localBalance: number;
  remoteBalance: number;
  capacity: number;
  state: ChannelState;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transfer {
  id: string;
  direction: 'sent' | 'received';
  amount: number;
  counterparty: string;
  counterpartyName?: string;
  channelId: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

export interface User {
  address: string;
  publicKey: string;
  username?: string;
  runeboltAddress: string;
  balance: number;
  usdBalance: number;
}

export interface ClaimLink {
  id: string;
  amount: number;
  sender: string;
  senderName?: string;
  expiresAt?: Date;
  claimed: boolean;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  balance: number;
  loading: boolean;
}

export interface FeeStatus {
  pubkey: string;
  totalTransfers: number;
  freeRemaining: number;
  feeRate: number;
  isFree: boolean;
}

export interface Stats {
  totalUsers: number;
  totalTransfers: number;
  totalVolume: number;
  avgSpeed: number;
}
