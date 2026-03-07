import crypto from 'crypto';

export class MockLightningClient {
  private invoices = new Map<string, {
    paymentRequest: string;
    paymentHash: string;
    preimage: string;
    valueSat: number;
    settled: boolean;
  }>();

  async connect(): Promise<void> {}

  async getInfo() {
    return { alias: 'mock-lnd', blockHeight: 800000, syncedToChain: true };
  }

  async addInvoice(valueSat: number, memo: string, expiry: number = 3600) {
    const preimage = crypto.randomBytes(32);
    const paymentHash = crypto.createHash('sha256').update(preimage).digest().toString('hex');
    const paymentRequest = `lnbcrt${valueSat}n1mock${paymentHash.slice(0, 20)}`;

    this.invoices.set(paymentHash, {
      paymentRequest,
      paymentHash,
      preimage: preimage.toString('hex'),
      valueSat,
      settled: false,
    });

    return {
      paymentRequest,
      paymentHash,
      valueSat,
      expiry,
      createdAt: new Date(),
    };
  }

  async lookupInvoice(paymentHash: string) {
    const invoice = this.invoices.get(paymentHash);
    return {
      settled: invoice?.settled ?? false,
      preimage: invoice?.preimage ?? '',
      state: invoice?.settled ? 'SETTLED' : 'OPEN',
    };
  }

  async sendPayment(paymentRequest: string) {
    const preimage = crypto.randomBytes(32).toString('hex');
    return {
      paymentHash: crypto.createHash('sha256')
        .update(Buffer.from(preimage, 'hex'))
        .digest()
        .toString('hex'),
      preimage,
      valueSat: 1000,
      feeSat: 1,
      status: 'succeeded' as const,
    };
  }

  async decodePayReq(paymentRequest: string) {
    return {
      paymentHash: crypto.randomBytes(32).toString('hex'),
      numSatoshis: 1000,
      description: 'mock invoice',
      expiry: 3600,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  async getChannelBalance() {
    return { localBalance: 1000000, remoteBalance: 500000, capacity: 1500000 };
  }

  settleInvoice(paymentHash: string): void {
    const invoice = this.invoices.get(paymentHash);
    if (invoice) invoice.settled = true;
  }

  subscribeInvoices(_callback: (invoice: any) => void): void {}

  async close(): Promise<void> {}
}
