import { createDeedLock } from '../src/index';
import { LightningBridge } from '../src/lightning';
import * as dotenv from 'dotenv';

dotenv.config();

// REAL RuneBolt Transfer Example
async function runTransfer() {
  console.log('⚡ RUNEBOLT TRANSFER EXAMPLE\n');
  
  // 1. Connect to Voltage node
  console.log('1️⃣ Connecting to Voltage Lightning node...');
  const bridge = new LightningBridge(
    process.env.VOLTAGE_REST_URL!,
    process.env.VOLTAGE_MACAROON!
  );
  
  const nodeInfo = await bridge.getNodeInfo();
  console.log(`   ✅ Connected to ${nodeInfo.alias}`);
  console.log(`   📡 Pubkey: ${nodeInfo.pubkey.substring(0, 20)}...`);
  
  // 2. Check balance
  const balance = await bridge.getBalance();
  console.log(`\n2️⃣ Channel balance:`);
  console.log(`   Local: ${balance.localBalance} sats`);
  console.log(`   Remote: ${balance.remoteBalance} sats`);
  
  // 3. Create deed lock
  console.log(`\n3️⃣ Creating deed lock for asset...`);
  const asset = {
    type: 'rune' as const,
    id: 'DOG•GO•TO•THE•MOON',
    amount: 1000,
    ticker: 'DOG'
  };
  
  // Create Lightning invoice for fee payment
  const feeInvoice = await bridge.createInvoice(1000, 3600);
  console.log(`   ✅ Lightning invoice created`);
  
  // Create deed lock
  const deed = createDeedLock({
    asset,
    senderPubkey: '02' + '0'.repeat(64), // Placeholder - would be real sender
    recipientPubkey: '03' + '0'.repeat(64), // Placeholder - would be real recipient
    paymentHash: feeInvoice.paymentHash,
    timeoutBlocks: 144
  });
  
  console.log(`   🔐 Deed address: ${deed.address}`);
  console.log(`   📋 Script size: ${deed.script.length} bytes`);
  
  // 4. Show transfer details
  console.log(`\n4️⃣ TRANSFER READY:`);
  console.log(`   Asset: ${asset.amount} ${asset.ticker}`);
  console.log(`   Deed: ${deed.address}`);
  console.log(`   Fee invoice: ${feeInvoice.paymentRequest.substring(0, 40)}...`);
  
  console.log(`\n⚡ Next steps:`);
  console.log(`   1. Sender deposits asset to deed address`);
  console.log(`   2. Sender pays Lightning invoice (${feeInvoice.amount} sats)`);
  console.log(`   3. Recipient gets preimage, claims asset`);
  console.log(`   4. Transfer complete in <1 second!`);
  
  return {
    deedAddress: deed.address,
    paymentRequest: feeInvoice.paymentRequest,
    paymentHash: feeInvoice.paymentHash
  };
}

// Run if called directly
if (require.main === module) {
  runTransfer()
    .then(result => {
      console.log('\n✅ Example complete!');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Error:', err.message);
      process.exit(1);
    });
}

export { runTransfer };