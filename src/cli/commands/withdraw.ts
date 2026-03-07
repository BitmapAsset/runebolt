import { Command } from 'commander';
import { apiRequest } from '../client';

export const withdrawCommand = new Command('withdraw')
  .description('Pay a Lightning invoice and receive Runes on-chain')
  .requiredOption('--rune <name>', 'Rune name (e.g., DOG)')
  .requiredOption('--amount <amount>', 'Amount of runes to withdraw')
  .requiredOption('--address <address>', 'Bitcoin address to receive runes')
  .action(async (opts) => {
    try {
      console.log(`Initiating withdrawal: ${opts.amount} ${opts.rune}...`);

      const swap = await apiRequest('POST', '/swap/withdraw', {
        runeName: opts.rune,
        runeAmount: opts.amount,
        destinationAddress: opts.address,
      });

      console.log('\nWithdrawal swap created:');
      console.log(`  Swap ID:    ${swap.id}`);
      console.log(`  State:      ${swap.state}`);
      console.log(`  Rune:       ${swap.runeName}`);
      console.log(`  Amount:     ${swap.runeAmount}`);
      console.log(`  Pay Invoice (${swap.satoshiAmount} sats):`);
      console.log(`  ${swap.lightningInvoice}`);
      console.log(`  Expires:    ${swap.expiresAt}`);
      console.log('\nPay the invoice above to complete the withdrawal.');
      console.log(`Track status: runebolt status --swap ${swap.id}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
