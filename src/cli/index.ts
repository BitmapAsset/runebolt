#!/usr/bin/env node

import { Command } from 'commander';
import { depositCommand } from './commands/deposit';
import { withdrawCommand } from './commands/withdraw';
import { statusCommand } from './commands/status';
import { balanceCommand } from './commands/balance';
import { bitmapCommand } from './commands/bitmap';

const program = new Command();

program
  .name('runebolt')
  .description('RuneBolt - Runes Lightning Bridge & Bitmap Marketplace CLI')
  .version('0.1.0');

program.addCommand(depositCommand);
program.addCommand(withdrawCommand);
program.addCommand(statusCommand);
program.addCommand(balanceCommand);
program.addCommand(bitmapCommand);

program.parse();
