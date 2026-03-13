"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlockCommand = void 0;
const commander_1 = require("commander");
const RuneBolt_1 = require("../../core/RuneBolt");
const config_1 = require("../../utils/config");
exports.unlockCommand = new commander_1.Command('unlock')
    .description('Unlock the wallet')
    .action(async () => {
    try {
        const config = (0, config_1.loadConfig)();
        const bolt = new RuneBolt_1.RuneBolt(config);
        process.stdout.write('Enter wallet password: ');
        const stdin = process.stdin;
        stdin.resume();
        stdin.setEncoding('utf-8');
        const password = await new Promise((resolve) => {
            stdin.once('data', (data) => {
                stdin.pause();
                resolve(data.trim());
            });
        });
        const info = await bolt.unlock(password);
        console.log(`Wallet unlocked. Fingerprint: ${info.fingerprint}`);
        console.log(`Network: ${info.network}`);
        console.log(`Addresses:`);
        for (const addr of info.addresses) {
            console.log(`  [${addr.index}] ${addr.address} (${addr.type})`);
        }
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
});
//# sourceMappingURL=unlock.js.map