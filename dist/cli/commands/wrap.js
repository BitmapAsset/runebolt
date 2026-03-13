"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapCommand = void 0;
const commander_1 = require("commander");
const RuneBolt_1 = require("../../core/RuneBolt");
const config_1 = require("../../utils/config");
exports.wrapCommand = new commander_1.Command('wrap')
    .description('Wrap Runes into Taproot Assets for Lightning transport')
    .requiredOption('--rune <name>', 'Rune name')
    .requiredOption('--amount <amount>', 'Amount to wrap')
    .requiredOption('--utxo <txid:vout>', 'Source UTXO containing the Runes')
    .action(async (options) => {
    try {
        const config = (0, config_1.loadConfig)();
        const bolt = new RuneBolt_1.RuneBolt(config);
        process.stdout.write('Password: ');
        const stdin = process.stdin;
        stdin.resume();
        stdin.setEncoding('utf-8');
        const password = await new Promise((resolve) => {
            stdin.once('data', (data) => { stdin.pause(); resolve(data.trim()); });
        });
        await bolt.unlock(password);
        await bolt.connect();
        const [txid, voutStr] = options.utxo.split(':');
        const pubkey = bolt.keyManager.getTaprootPubkey("m/86'/1'/0'/0/0");
        const request = {
            runeId: { block: 0, tx: 0 },
            runeName: options.rune.toUpperCase(),
            amount: BigInt(options.amount),
            sourceUtxo: { txid, vout: parseInt(voutStr), value: 546 },
            destinationPubkey: pubkey,
        };
        console.log(`Wrapping ${options.amount} ${options.rune}...`);
        const result = await bolt.wrap(request);
        console.log(`Wrap initiated!`);
        console.log(`Operation ID: ${result.operationId}`);
        if (result.assetId) {
            console.log(`Asset ID: ${result.assetId}`);
        }
        bolt.lock();
        await bolt.disconnect();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
});
//# sourceMappingURL=wrap.js.map