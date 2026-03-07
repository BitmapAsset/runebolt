import { Command } from 'commander';
import { apiRequest } from '../client';

export const statusCommand = new Command('status')
  .description('Check swap status')
  .requiredOption('--swap <id>', 'Swap ID')
  .action(async (opts) => {
    try {
      const swap = await apiRequest('GET', `/swap/${opts.swap}`);

      console.log('Swap Status:');
      console.log(`  ID:          ${swap.id}`);
      console.log(`  Direction:   ${swap.direction}`);
      console.log(`  State:       ${swap.state}`);
      console.log(`  Rune:        ${swap.runeName}`);
      console.log(`  Amount:      ${swap.runeAmount}`);
      console.log(`  Sats:        ${swap.satoshiAmount}`);
      console.log(`  HTLC Txid:   ${swap.htlcTxid || 'N/A'}`);
      console.log(`  Claim Txid:  ${swap.claimTxid || 'N/A'}`);
      console.log(`  Preimage:    ${swap.preimage || 'N/A'}`);
      console.log(`  Created:     ${swap.createdAt}`);
      console.log(`  Updated:     ${swap.updatedAt}`);
      console.log(`  Expires:     ${swap.expiresAt}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
