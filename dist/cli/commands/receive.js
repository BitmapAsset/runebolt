"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveCommand = void 0;
const commander_1 = require("commander");
const RuneBolt_1 = require("../../core/RuneBolt");
const config_1 = require("../../utils/config");
exports.receiveCommand = new commander_1.Command('receive')
    .description('Create a Lightning invoice to receive Taproot Asset payment')
    .requiredOption('--asset <assetId>', 'Taproot Asset ID')
    .requiredOption('--amount <amount>', 'Amount to receive')
    .option('--memo <memo>', 'Invoice memo', '')
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
        const invoice = await bolt.createInvoice(options.asset, BigInt(options.amount), options.memo);
        console.log('\n=== Invoice Created ===');
        console.log(`Payment request: ${invoice.paymentRequest}`);
        console.log(`Payment hash: ${invoice.paymentHash}`);
        console.log(`Asset: ${invoice.assetId}`);
        console.log(`Amount: ${invoice.assetAmount}`);
        console.log(`Expires: ${new Date(invoice.createdAt.getTime() + invoice.expiry * 1000).toISOString()}`);
        bolt.lock();
        await bolt.disconnect();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
});
//# sourceMappingURL=receive.js.map