import { Command } from 'commander';
import { apiRequest } from '../client';

export const balanceCommand = new Command('balance')
  .description('Check Runes balances for an address')
  .requiredOption('--address <address>', 'Bitcoin address')
  .action(async (opts) => {
    try {
      const data = await apiRequest('GET', `/runes/${opts.address}`);

      console.log(`Runes balances for ${data.address}:\n`);

      if (data.balances.length === 0) {
        console.log('  No runes found.');
        return;
      }

      for (const b of data.balances) {
        console.log(`  ${b.runeName} (${b.runeId}): ${b.amount}`);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
