import axios from 'axios';

export interface LightningInvoice {
  paymentRequest: string;
  paymentHash: string;
  amount: number;
  expiry: number;
}

export interface PaymentResult {
  success: boolean;
  preimage?: string;
  error?: string;
}

export interface NodeInfo {
  pubkey: string;
  alias: string;
  version: string;
  chains: any[];
}

export interface ChannelBalance {
  localBalance: number;
  remoteBalance: number;
}

export class LightningBridge {
  private nodeUrl: string;
  private macaroon: string;
  
  constructor(nodeUrl: string, macaroon: string) {
    this.nodeUrl = nodeUrl;
    this.macaroon = macaroon;
  }
  
  async getNodeInfo(): Promise<NodeInfo> {
    const response = await axios.get(`${this.nodeUrl}/v1/getinfo`, {
      headers: { 'Grpc-Metadata-macaroon': this.macaroon }
    });
    return {
      pubkey: response.data.identity_pubkey,
      alias: response.data.alias,
      version: response.data.version,
      chains: response.data.chains
    };
  }
  
  async getBalance(): Promise<ChannelBalance> {
    const response = await axios.get(`${this.nodeUrl}/v1/balance/channels`, {
      headers: { 'Grpc-Metadata-macaroon': this.macaroon }
    });
    return {
      localBalance: parseInt(response.data.local_balance?.sat || '0'),
      remoteBalance: parseInt(response.data.remote_balance?.sat || '0')
    };
  }
  
  async createInvoice(amountSats: number, expirySeconds: number = 3600): Promise<LightningInvoice> {
    const response = await axios.post(
      `${this.nodeUrl}/v1/invoices`,
      { value: amountSats, expiry: expirySeconds, memo: 'RuneBolt Deed Payment' },
      { headers: { 'Grpc-Metadata-macaroon': this.macaroon } }
    );
    
    return {
      paymentRequest: response.data.payment_request,
      paymentHash: response.data.r_hash,
      amount: amountSats,
      expiry: expirySeconds
    };
  }
  
  async sendPayment(paymentRequest: string): Promise<PaymentResult> {
    try {
      const response = await axios.post(
        `${this.nodeUrl}/v1/channels/transactions`,
        { payment_request: paymentRequest, timeout_seconds: 60 },
        { headers: { 'Grpc-Metadata-macaroon': this.macaroon } }
      );
      
      if (response.data.payment_preimage) {
        return { success: true, preimage: response.data.payment_preimage };
      }
      return { success: false, error: 'Payment failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  async checkPayment(paymentHash: string): Promise<PaymentResult> {
    try {
      const response = await axios.get(
        `${this.nodeUrl}/v1/invoice/${Buffer.from(paymentHash, 'hex').toString('base64')}`,
        { headers: { 'Grpc-Metadata-macaroon': this.macaroon } }
      );
      
      if (response.data.settled) {
        return { success: true, preimage: response.data.payment_preimage };
      }
      return { success: false, error: 'Payment not yet received' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}