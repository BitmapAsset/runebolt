import { API_URL } from './constants';
import { Channel, Transfer, ClaimLink, FeeStatus, Stats } from './types';

const AUTH_TOKEN_KEY = 'runebolt_jwt';

class RuneBoltAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  setToken(token: string) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  clearToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/runebolt/app';
      }
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth flow
  async challenge(pubkey: string) {
    return this.request<{ challengeId: string; message: string }>(
      '/auth/auth/challenge',
      {
        method: 'POST',
        body: JSON.stringify({ pubkey }),
      }
    );
  }

  async verify(challengeId: string, signature: string) {
    const result = await this.request<{ token: string; user: { address: string; username?: string } }>(
      '/auth/auth/wallet/verify',
      {
        method: 'POST',
        body: JSON.stringify({ challengeId, signature }),
      }
    );
    this.setToken(result.token);
    return result;
  }

  // Channels
  async getChannels() {
    return this.request<Channel[]>('/channels');
  }

  async openChannel(amount: number) {
    return this.request<Channel>('/channels/open', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async closeChannel(channelId: string) {
    return this.request<{ txid: string }>(`/channels/${channelId}/close`, {
      method: 'POST',
    });
  }

  // Transfers
  async transfer(to: string, amount: number, memo?: string) {
    return this.request<Transfer>('/transfers', {
      method: 'POST',
      body: JSON.stringify({ to, amount, memo }),
    });
  }

  async getTransfers(limit: number = 20) {
    return this.request<{ transfers: Transfer[]; total: number }>(
      `/transfers/history?limit=${limit}`
    );
  }

  // Fees
  async getFeeStatus(pubkey: string) {
    return this.request<FeeStatus>(`/fees/status/${pubkey}`);
  }

  // Stats
  async getStats() {
    return this.request<Stats>('/stats');
  }

  // Claims (kept for compatibility)
  async createClaimLink(amount: number) {
    return this.request<ClaimLink>('/claim/create', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async claimLink(claimId: string) {
    return this.request<{ transfer: Transfer }>(`/claim/${claimId}`, {
      method: 'POST',
    });
  }

  async getClaimLink(claimId: string) {
    return this.request<ClaimLink>(`/claim/${claimId}`);
  }
}

export const api = new RuneBoltAPI();
export default RuneBoltAPI;
