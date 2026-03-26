import WebSocket from 'ws';
import { RuneBoltConfig, Channel, Transfer, Balance, TransferEvent, ApiResponse, ChannelState } from './types';

export class RuneBoltClient {
  private config: RuneBoltConfig;
  private ws: WebSocket | null = null;
  private transferListeners: ((event: TransferEvent) => void)[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor(config: RuneBoltConfig) {
    this.config = {
      wsUrl: config.apiUrl.replace(/^http/, 'ws'),
      ...config,
    };
  }

  // Set auth token after authentication
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  // Initialize a payment channel
  async initChannel(pubkey: string, amount: string): Promise<{ channelId: string; psbt: string; channelAddress: string }> {
    const res = await this.request<{ channelId: string; psbt: string; channelAddress: string }>('/channel/open', {
      method: 'POST',
      body: { pubkey, amount },
    });
    return res;
  }

  // Activate channel after user signs the funding PSBT
  async activateChannel(channelId: string, signedPsbt: string): Promise<Channel> {
    return this.request<Channel>('/channel/activate', {
      method: 'POST',
      body: { channelId, signedPsbt },
    });
  }

  // Send DOG to another user
  async sendDOG(params: { fromChannelId: string; recipientPubkey?: string; toChannelId?: string; amount: string; memo?: string }): Promise<Transfer> {
    return this.request<Transfer>('/transfer', {
      method: 'POST',
      body: params,
    });
  }

  // Get balance across all channels
  async getBalance(pubkey: string): Promise<Balance> {
    const user = await this.request<{ channels: Channel[] }>(`/user/${pubkey}`, { method: 'GET' });

    const channels = user.channels || [];
    const channelBalances = channels
      .filter(c => c.state === ChannelState.OPEN)
      .map(c => ({
        channelId: c.id,
        local: c.localBalance,
        remote: c.remoteBalance,
        capacity: c.capacity,
      }));

    const available = channelBalances.reduce((sum, c) => sum + BigInt(c.local), 0n).toString();
    const locked = channelBalances.reduce((sum, c) => sum + BigInt(c.capacity), 0n).toString();

    return {
      available,
      locked,
      total: available,
      channels: channelBalances,
    };
  }

  // Get channel info
  async getChannel(channelId: string): Promise<Channel> {
    return this.request<Channel>(`/channel/${channelId}`, { method: 'GET' });
  }

  // Get transfer history
  async getHistory(pubkey: string, limit = 50, offset = 0): Promise<Transfer[]> {
    return this.request<Transfer[]>(`/history/${pubkey}?limit=${limit}&offset=${offset}`, { method: 'GET' });
  }

  // Close a channel cooperatively
  async closeChannel(channelId: string): Promise<{ psbt: string }> {
    return this.request<{ psbt: string }>('/channel/close', {
      method: 'POST',
      body: { channelId },
    });
  }

  // Create a claim link
  async createClaimLink(amount: string, memo?: string): Promise<{ claimId: string; url: string }> {
    return this.request<{ claimId: string; url: string }>('/claim/create', {
      method: 'POST',
      body: { amount, memo },
    });
  }

  // Subscribe to real-time transfer events
  onTransfer(callback: (event: TransferEvent) => void): () => void {
    this.transferListeners.push(callback);

    // Start WebSocket if not connected
    if (!this.ws && !this.isConnecting) {
      this.connectWebSocket();
    }

    // Return unsubscribe function
    return () => {
      this.transferListeners = this.transferListeners.filter(cb => cb !== callback);
      if (this.transferListeners.length === 0) {
        this.disconnectWebSocket();
      }
    };
  }

  // Connect WebSocket for real-time events
  private connectWebSocket(): void {
    if (this.isConnecting || !this.config.wsUrl) return;
    this.isConnecting = true;

    const url = new URL(this.config.wsUrl);
    if (this.config.authToken) {
      url.searchParams.set('token', this.config.authToken);
    }

    this.ws = new WebSocket(url.toString());

    this.ws.on('open', () => {
      this.isConnecting = false;
      console.log('[RuneBolt SDK] WebSocket connected');
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const event = JSON.parse(data.toString());
        if (event.type === 'transfer') {
          this.transferListeners.forEach(cb => cb(event.data as TransferEvent));
        }
      } catch (err) {
        console.error('[RuneBolt SDK] Failed to parse WebSocket message:', err);
      }
    });

    this.ws.on('close', () => {
      this.isConnecting = false;
      this.ws = null;
      // Auto-reconnect if there are active listeners
      if (this.transferListeners.length > 0) {
        this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
      }
    });

    this.ws.on('error', (err) => {
      console.error('[RuneBolt SDK] WebSocket error:', err.message);
      this.isConnecting = false;
    });
  }

  private disconnectWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Disconnect and clean up
  disconnect(): void {
    this.disconnectWebSocket();
    this.transferListeners = [];
  }

  // Internal HTTP request helper
  private async request<T>(path: string, options: { method: string; body?: any }): Promise<T> {
    const url = `${this.config.apiUrl}/api/v1${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    const res = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const json: ApiResponse<T> = await res.json() as ApiResponse<T>;

    if (!json.success || !json.data) {
      throw new Error(json.error || 'Request failed');
    }

    return json.data;
  }
}
