import { LightningBridge } from '../src/lightning';
import * as dotenv from 'dotenv';

dotenv.config();

// Real Voltage Node Test
const VOLTAGE_URL = process.env.VOLTAGE_REST_URL || '';
const VOLTAGE_MACAROON = process.env.VOLTAGE_MACAROON || '';

describe('RuneBolt with REAL Voltage Node', () => {
  let bridge: LightningBridge;
  
  beforeAll(() => {
    if (!VOLTAGE_URL || !VOLTAGE_MACAROON) {
      throw new Error('Missing Voltage credentials in .env');
    }
    bridge = new LightningBridge(VOLTAGE_URL, VOLTAGE_MACAROON);
  });
  
  test('should connect to Voltage node', async () => {
    const info = await bridge.getNodeInfo();
    console.log('Node pubkey:', info.pubkey);
    expect(info.pubkey).toBeDefined();
    expect(info.alias).toBe('runebolt-node');
  });
  
  test('should create REAL Lightning invoice', async () => {
    const invoice = await bridge.createInvoice(1000, 3600);
    console.log('Invoice:', invoice.paymentRequest);
    expect(invoice.paymentRequest).toContain('lnbc');
    expect(invoice.paymentHash).toHaveLength(64);
  }, 30000);
  
  test('should check node balance', async () => {
    const balance = await bridge.getBalance();
    console.log('Channel balance:', balance.localBalance);
    expect(balance.localBalance).toBeGreaterThan(0);
  });
});

// Manual test runner
if (require.main === module) {
  console.log('🔌 Connecting to Voltage node:', VOLTAGE_URL);
  const bridge = new LightningBridge(VOLTAGE_URL, VOLTAGE_MACAROON);
  
  bridge.getNodeInfo().then(info => {
    console.log('✅ Connected!');
    console.log('Node:', info.alias);
    console.log('Pubkey:', info.pubkey);
    return bridge.createInvoice(1000, 3600);
  }).then(invoice => {
    console.log('✅ Invoice created!');
    console.log('Payment request:', invoice.paymentRequest.substring(0, 50) + '...');
    console.log('Amount:', invoice.amount, 'sats');
  }).catch(err => {
    console.error('❌ Error:', err.message);
  });
}