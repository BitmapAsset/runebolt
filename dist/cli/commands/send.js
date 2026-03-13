"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCommand = void 0;
const commander_1 = require("commander");
const RuneBolt_1 = require("../../core/RuneBolt");
const config_1 = require("../../utils/config");
exports.sendCommand = new commander_1.Command('send')
    .description('Send a Taproot Asset payment over Lightning')
    .requiredOption('--asset <assetId>', 'Taproot Asset ID')
    .requiredOption('--invoice <invoice>', 'Lightning invoice to pay')
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
        console.log('Sending payment...');
        const payment = await bolt.sendAssetPayment(options.asset, options.invoice);
        console.log(`Payment ${payment.status}!`);
        console.log(`Payment hash: ${payment.paymentHash}`);
        console.log(`Fee: ${payment.feeSat} sats`);
        bolt.lock();
        await bolt.disconnect();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
});
//# sourceMappingURL=send.js.map