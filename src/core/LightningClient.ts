import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';
import { LightningError } from '../utils/errors';
import { BridgeConfig, LightningInvoice, LightningPayment, ChannelBalance } from '../types';

const log = createLogger('LightningClient');

// LND gRPC type definitions
interface LnrpcInvoice {
  r_hash: Buffer;
  payment_request: string;
  value: string;
  expiry: string;
  creation_date: string;
  settled: boolean;
  state: number;
  r_preimage: Buffer;
}

interface LnrpcPayment {
  payment_hash: string;
  payment_preimage: string;
  value_sat: string;
  fee_sat: string;
  status: string;
}

interface LnrpcSendResponse {
  payment_error: string;
  payment_preimage: Buffer;
  payment_route: { total_fees_msat: string };
}

interface LnrpcChannelBalanceResponse {
  local_balance: { sat: string };
  remote_balance: { sat: string };
}

export class LightningClient {
  private client: any;
  private readonly config: BridgeConfig['lightning'];

  constructor(config: BridgeConfig) {
    this.config = config.lightning;
  }

  async connect(): Promise<void> {
    log.info({ host: this.config.lndHost, port: this.config.lndPort }, 'Connecting to LND');

    const tlsCert = fs.readFileSync(this.config.tlsCertPath);
    const macaroon = fs.readFileSync(this.config.macaroonPath).toString('hex');

    const tlsCredentials = grpc.credentials.createSsl(tlsCert);
    const macaroonCredentials = grpc.credentials.createFromMetadataGenerator(
      (_args, callback) => {
        const metadata = new grpc.Metadata();
        metadata.add('macaroon', macaroon);
        callback(null, metadata);
      },
    );

    const combinedCredentials = grpc.credentials.combineChannelCredentials(
      tlsCredentials,
      macaroonCredentials,
    );

    // Load the lnrpc proto - in production, bundle the proto files
    const protoPath = path.join(__dirname, '../../proto/lightning.proto');
    if (fs.existsSync(protoPath)) {
      const packageDef = protoLoader.loadSync(protoPath, {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const lnrpc = grpc.loadPackageDefinition(packageDef).lnrpc as any;
      this.client = new lnrpc.Lightning(
        `${this.config.lndHost}:${this.config.lndPort}`,
        combinedCredentials,
      );
    } else {
      // Fallback: create a generic client for environments without proto files
      log.warn('Proto file not found, using REST fallback would be needed');
      throw new LightningError('LND proto file not found at ' + protoPath);
    }

    // Verify connection
    await this.getInfo();
    log.info('Successfully connected to LND');
  }

  private promisify<T>(method: string, request: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new LightningError('LND client not connected'));
        return;
      }
      this.client[method](request, (err: Error | null, response: T) => {
        if (err) {
          reject(new LightningError(`LND ${method} failed: ${err.message}`));
        } else {
          resolve(response);
        }
      });
    });
  }

  async getInfo(): Promise<{ alias: string; blockHeight: number; syncedToChain: boolean }> {
    const info = await this.promisify<any>('getInfo');
    return {
      alias: info.alias,
      blockHeight: info.block_height,
      syncedToChain: info.synced_to_chain,
    };
  }

  async addInvoice(valueSat: number, memo: string, expiry: number = 3600): Promise<LightningInvoice> {
    log.info({ valueSat, memo, expiry }, 'Creating Lightning invoice');
    const response = await this.promisify<LnrpcInvoice>('addInvoice', {
      value: valueSat.toString(),
      memo,
      expiry: expiry.toString(),
    });

    return {
      paymentRequest: response.payment_request,
      paymentHash: response.r_hash.toString('hex'),
      valueSat,
      expiry,
      createdAt: new Date(),
    };
  }

  async lookupInvoice(paymentHash: string): Promise<{
    settled: boolean;
    preimage: string;
    state: string;
  }> {
    const rHash = Buffer.from(paymentHash, 'hex');
    const invoice = await this.promisify<LnrpcInvoice>('lookupInvoice', {
      r_hash: rHash,
    });

    return {
      settled: invoice.settled,
      preimage: invoice.r_preimage.toString('hex'),
      state: ['OPEN', 'SETTLED', 'CANCELED', 'ACCEPTED'][invoice.state] || 'UNKNOWN',
    };
  }

  async sendPayment(paymentRequest: string): Promise<LightningPayment> {
    log.info('Sending Lightning payment');
    const response = await this.promisify<LnrpcSendResponse>('sendPaymentSync', {
      payment_request: paymentRequest,
    });

    if (response.payment_error) {
      throw new LightningError(`Payment failed: ${response.payment_error}`);
    }

    const preimage = response.payment_preimage.toString('hex');
    return {
      paymentHash: '', // derived from invoice
      preimage,
      valueSat: 0,
      feeSat: parseInt(response.payment_route?.total_fees_msat || '0') / 1000,
      status: 'succeeded',
    };
  }

  async decodePayReq(paymentRequest: string): Promise<{
    paymentHash: string;
    numSatoshis: number;
    description: string;
    expiry: number;
    timestamp: number;
  }> {
    const decoded = await this.promisify<any>('decodePayReq', {
      pay_req: paymentRequest,
    });

    return {
      paymentHash: decoded.payment_hash,
      numSatoshis: parseInt(decoded.num_satoshis),
      description: decoded.description,
      expiry: parseInt(decoded.expiry),
      timestamp: parseInt(decoded.timestamp),
    };
  }

  async getChannelBalance(): Promise<ChannelBalance> {
    const balance = await this.promisify<LnrpcChannelBalanceResponse>('channelBalance');
    return {
      localBalance: parseInt(balance.local_balance?.sat || '0'),
      remoteBalance: parseInt(balance.remote_balance?.sat || '0'),
      capacity: parseInt(balance.local_balance?.sat || '0') + parseInt(balance.remote_balance?.sat || '0'),
    };
  }

  subscribeInvoices(callback: (invoice: LnrpcInvoice) => void): void {
    if (!this.client) {
      throw new LightningError('LND client not connected');
    }

    const stream = this.client.subscribeInvoices({});
    stream.on('data', (invoice: LnrpcInvoice) => {
      callback(invoice);
    });
    stream.on('error', (err: Error) => {
      log.error({ err }, 'Invoice subscription error');
    });
    stream.on('end', () => {
      log.warn('Invoice subscription ended, reconnecting...');
      setTimeout(() => this.subscribeInvoices(callback), 5000);
    });
  }

  async close(): Promise<void> {
    if (this.client) {
      grpc.closeClient(this.client);
      this.client = null;
      log.info('LND client disconnected');
    }
  }
}
