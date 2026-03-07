import { Command } from 'commander';
import { apiRequest } from '../client';

export const depositCommand = new Command('deposit')
  .description('Deposit Runes on-chain and receive a Lightning payment')
  .requiredOption('--rune <name>', 'Rune name (e.g., DOG)')
  .requiredOption('--amount <amount>', 'Amount of runes to deposit')
  .requiredOption('--lightning <invoice>', 'Lightning invoice to pay')
  .requiredOption('--refund <address>', 'Bitcoin address for refund if swap fails')
  .action(async (opts) => {
    try {
      console.log(`Initiating deposit: ${opts.amount} ${opts.rune}...`);

      const swap = await apiRequest('POST', '/swap/deposit', {
        runeName: opts.rune,
        runeAmount: opts.amount,
        lightningInvoice: opts.lightning,
        refundAddress: opts.refund,
      });

      console.log('\nDeposit swap created:');
      console.log(`  Swap ID:      ${swap.id}`);
      console.log(`  State:        ${swap.state}`);
      console.log(`  Rune:         ${swap.runeName}`);
      console.log(`  Amount:       ${swap.runeAmount}`);
      console.log(`  Payment Hash: ${swap.paymentHash}`);
      console.log(`  Expires:      ${swap.expiresAt}`);
      console.log('\nNext: Send runes to the HTLC address, then confirm with:');
      console.log(`  runebolt status --swap ${swap.id}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
