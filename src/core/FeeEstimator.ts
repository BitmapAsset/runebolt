import { createLogger } from '../utils/logger';
import { BridgeConfig, FeeEstimate } from '../types';

const log = createLogger('FeeEstimator');

export class FeeEstimator {
  private readonly rpcUrl: string;
  private readonly rpcUser: string;
  private readonly rpcPass: string;
  private cachedEstimate: FeeEstimate | null = null;
  private cacheExpiry = 0;

  constructor(config: BridgeConfig) {
    this.rpcUrl = config.bitcoin.rpcUrl;
    this.rpcUser = config.bitcoin.rpcUser;
    this.rpcPass = config.bitcoin.rpcPass;
  }

  async estimateFees(): Promise<FeeEstimate> {
    if (this.cachedEstimate && Date.now() < this.cacheExpiry) {
      return this.cachedEstimate;
    }

    log.info('Estimating on-chain fees');

    try {
      const [fast, medium, slow] = await Promise.all([
        this.bitcoinRpc('estimatesmartfee', [2]),
        this.bitcoinRpc('estimatesmartfee', [6]),
        this.bitcoinRpc('estimatesmartfee', [12]),
      ]);

      const estimate: FeeEstimate = {
        fastestFee: this.btcPerKbToSatPerVb(fast.feerate ?? 0.0002),
        halfHourFee: this.btcPerKbToSatPerVb(medium.feerate ?? 0.00015),
        hourFee: this.btcPerKbToSatPerVb(slow.feerate ?? 0.0001),
        minimumFee: 1,
      };

      this.cachedEstimate = estimate;
      this.cacheExpiry = Date.now() + 60_000; // cache for 1 minute

      log.info({ estimate }, 'Fee estimate updated');
      return estimate;
    } catch (err) {
      log.warn({ err }, 'Fee estimation failed, using defaults');
      return {
        fastestFee: 20,
        halfHourFee: 10,
        hourFee: 5,
        minimumFee: 1,
      };
    }
  }

  async getRecommendedFeeRate(): Promise<number> {
    const estimate = await this.estimateFees();
    return estimate.halfHourFee;
  }

  private btcPerKbToSatPerVb(btcPerKb: number): number {
    return Math.ceil((btcPerKb * 1e8) / 1000);
  }

  private async bitcoinRpc(method: string, params: unknown[]): Promise<any> {
    const body = JSON.stringify({
      jsonrpc: '1.0',
      id: Date.now(),
      method,
      params,
    });

    const res = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${this.rpcUser}:${this.rpcPass}`).toString('base64'),
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Bitcoin RPC error: ${res.status}`);
    }

    const data = (await res.json()) as { result: any; error: any };
    if (data.error) {
      throw new Error(`Bitcoin RPC: ${data.error.message}`);
    }

    return data.result;
  }
}
