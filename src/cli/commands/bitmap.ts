import { Command } from 'commander';
import { apiRequest } from '../client';

export const bitmapCommand = new Command('bitmap')
  .description('Bitmap marketplace — list, buy, and manage Bitmap block sales');

bitmapCommand
  .command('list')
  .description('List a Bitmap block for sale')
  .requiredOption('--inscription <id>', 'Inscription ID (txid:vout)')
  .requiredOption('--bitmap <number>', 'Bitmap number (e.g., 820000.bitmap)')
  .requiredOption('--price <sats>', 'Price in satoshis')
  .requiredOption('--seller <address>', 'Seller Bitcoin address')
  .action(async (opts) => {
    try {
      console.log(`Listing ${opts.bitmap} for ${opts.price} sats...`);

      const listing = await apiRequest('POST', '/bitmap/list', {
        inscriptionId: opts.inscription,
        bitmapNumber: opts.bitmap,
        sellerAddress: opts.seller,
        priceSats: parseInt(opts.price, 10),
      });

      console.log('\nBitmap listing created:');
      console.log(`  Listing ID:    ${listing.id}`);
      console.log(`  State:         ${listing.state}`);
      console.log(`  Bitmap:        ${listing.bitmapNumber}`);
      console.log(`  Price:         ${listing.priceSats} sats`);
      console.log(`  LN Invoice:    ${listing.lightningInvoice}`);
      console.log(`  Expires:       ${listing.expiresAt}`);
      console.log('\nNext: Lock inscription in escrow, then confirm with:');
      console.log(`  runebolt bitmap escrow --id ${listing.id} --txid <escrow_txid>`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

bitmapCommand
  .command('escrow')
  .description('Confirm inscription locked in escrow')
  .requiredOption('--id <listingId>', 'Listing ID')
  .requiredOption('--txid <escrowTxid>', 'Escrow transaction ID')
  .action(async (opts) => {
    try {
      const listing = await apiRequest('POST', `/bitmap/${opts.id}/escrow`, {
        escrowTxid: opts.txid,
      });

      console.log('Escrow confirmed:');
      console.log(`  Listing ID:  ${listing.id}`);
      console.log(`  State:       ${listing.state}`);
      console.log(`  Escrow Txid: ${listing.escrowTxid}`);
      console.log('\nBuyers can now pay the Lightning invoice to purchase.');
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

bitmapCommand
  .command('buy')
  .description('Buy a listed Bitmap block (after paying LN invoice)')
  .requiredOption('--id <listingId>', 'Listing ID')
  .requiredOption('--address <address>', 'Your Bitcoin address to receive the inscription')
  .action(async (opts) => {
    try {
      console.log(`Purchasing Bitmap listing ${opts.id}...`);

      const listing = await apiRequest('POST', `/bitmap/${opts.id}/buy`, {
        buyerAddress: opts.address,
      });

      console.log('\nPurchase complete:');
      console.log(`  Listing ID:  ${listing.id}`);
      console.log(`  State:       ${listing.state}`);
      console.log(`  Bitmap:      ${listing.bitmapNumber}`);
      if (listing.preimage) {
        console.log(`  Preimage:    ${listing.preimage}`);
        console.log('\nUse the preimage to claim the inscription from escrow on-chain.');
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

bitmapCommand
  .command('listings')
  .description('View active Bitmap listings')
  .action(async () => {
    try {
      const data = await apiRequest('GET', '/bitmap/listings');

      console.log(`Active Bitmap listings (${data.count}):\n`);

      if (data.count === 0) {
        console.log('  No active listings.');
        return;
      }

      for (const l of data.listings) {
        console.log(`  ${l.bitmapNumber}`);
        console.log(`    ID:    ${l.id}`);
        console.log(`    Price: ${l.priceSats} sats`);
        console.log(`    State: ${l.state}`);
        console.log('');
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

bitmapCommand
  .command('cancel')
  .description('Cancel a Bitmap listing')
  .requiredOption('--id <listingId>', 'Listing ID')
  .action(async (opts) => {
    try {
      const listing = await apiRequest('DELETE', `/bitmap/${opts.id}`);

      console.log('Listing canceled:');
      console.log(`  ID:    ${listing.id}`);
      console.log(`  State: ${listing.state}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

bitmapCommand
  .command('status')
  .description('Check a Bitmap listing status')
  .requiredOption('--id <listingId>', 'Listing ID')
  .action(async (opts) => {
    try {
      const listing = await apiRequest('GET', `/bitmap/${opts.id}`);

      console.log('Bitmap Listing:');
      console.log(`  ID:           ${listing.id}`);
      console.log(`  State:        ${listing.state}`);
      console.log(`  Bitmap:       ${listing.bitmapNumber}`);
      console.log(`  Inscription:  ${listing.inscriptionId}`);
      console.log(`  Price:        ${listing.priceSats} sats`);
      console.log(`  Seller:       ${listing.sellerAddress}`);
      console.log(`  Buyer:        ${listing.buyerAddress || 'N/A'}`);
      console.log(`  Escrow Txid:  ${listing.escrowTxid || 'N/A'}`);
      console.log(`  Created:      ${listing.createdAt}`);
      console.log(`  Expires:      ${listing.expiresAt}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
