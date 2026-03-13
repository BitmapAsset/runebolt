#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const unlock_1 = require("./commands/unlock");
const balance_1 = require("./commands/balance");
const send_1 = require("./commands/send");
const receive_1 = require("./commands/receive");
const wrap_1 = require("./commands/wrap");
const unwrap_1 = require("./commands/unwrap");
const channels_1 = require("./commands/channels");
const peers_1 = require("./commands/peers");
const program = new commander_1.Command();
program
    .name('runebolt')
    .description('RuneBolt - Self-sovereign Runes-over-Lightning wallet using Taproot Assets')
    .version('1.0.0');
program.addCommand(init_1.initCommand);
program.addCommand(unlock_1.unlockCommand);
program.addCommand(balance_1.balanceCommand);
program.addCommand(send_1.sendCommand);
program.addCommand(receive_1.receiveCommand);
program.addCommand(wrap_1.wrapCommand);
program.addCommand(unwrap_1.unwrapCommand);
program.addCommand(channels_1.channelsCommand);
program.addCommand(peers_1.peersCommand);
program.parse();
//# sourceMappingURL=index.js.map