"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.balanceCommand = void 0;
const commander_1 = require("commander");
const RuneBolt_1 = require("../../core/RuneBolt");
const config_1 = require("../../utils/config");
exports.balanceCommand = new commander_1.Command('balance')
    .description('Show wallet balances (BTC, Runes, Taproot Assets)')
    .action(async () => {
    try {
        const config = (0, config_1.loadConfig)();
        const bolt = new RuneBolt_1.RuneBolt(config);
        // Wallet must be unlocked first
        process.stdout.write('Password: ');
        const stdin = process.stdin;
        stdin.resume();
        stdin.setEncoding('utf-8');
        const password = await new Promise((resolve) => {
            stdin.once('data', (data) => { stdin.pause(); resolve(data.trim()); });
        });
        await bolt.unlock(password);
        await bolt.connect();
        const balances = await bolt.getBalances();
        console.log('\n=== RuneBolt Balances ===\n');
        console.log(`BTC: ${balances.btcSats} sats (${(balances.btcSats / 1e8).toFixed(8)} BTC)`);
        console.log('\nRunes:');
        if (balances.runes.size === 0) {
            console.log('  (none)');
        }
        else {
            for (const [name, info] of balances.runes) {
                console.log(`  ${name}: ${info.total} (${info.runeId.block}:${info.runeId.tx})`);
            }
        }
        console.log('\nTaproot Assets:');
        if (balances.taprootAssets.length === 0) {
            console.log('  (none)');
        }
        else {
            for (const asset of balances.taprootAssets) {
                console.log(`  ${asset.name}: ${asset.amount} (${asset.assetId.substring(0, 16)}...)`);
            }
        }
        console.log('\nChannels:');
        if (balances.channels.length === 0) {
            console.log('  (none)');
        }
        else {
            for (const ch of balances.channels) {
                console.log(`  ${ch.channelId}: local=${ch.localBalance} remote=${ch.remoteBalance} (${ch.active ? 'active' : 'inactive'})`);
            }
        }
        bolt.lock();
        await bolt.disconnect();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
});
//# sourceMappingURL=balance.js.map