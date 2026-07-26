export interface RuneBoltConfig {
  apiUrl: string;
  wsUrl?: string;
  authToken?: string;
}

export interface Channel {
  id: string;
  userPubkey: string;
  capacity: string;
  localBalance: string;
  remoteBalance: string;
  state: ChannelState;
  createdAt: string;
}

export enum ChannelState {
  PENDING_OPEN = 'PENDING_OPEN',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  FORCE_CLOSING = 'FORCE_CLOSING'
}

export interface Transfer {
  id: string;
  fromChannel: string;
  toChannel: string;
  amount: string;
  memo?: string;
  createdAt: string;
}

export interface Balance {
  available: string;
  locked: string;
  total: string;
  channels: ChannelBalance[];
}

export interface ChannelBalance {
  channelId: string;
  local: string;
  remote: string;
  capacity: string;
}

export interface TransferEvent {
  transfer: Transfer;
  newBalance: Balance;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
