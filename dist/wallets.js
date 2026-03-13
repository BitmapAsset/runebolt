"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnisatConnector = void 0;
exports.createWalletConnector = createWalletConnector;
class UnisatConnector {
    name = 'Unisat';
    async connect() {
        if (typeof window === 'undefined' || !window.unisat) {
            throw new Error('Unisat wallet not installed');
        }
        const accounts = await window.unisat.requestAccounts();
        return accounts[0];
    }
    async signPsbt(psbt) {
        return await window.unisat.signPsbt(psbt);
    }
    async getPublicKey() {
        return await window.unisat.getPublicKey();
    }
}
exports.UnisatConnector = UnisatConnector;
function createWalletConnector(name) {
    if (name === 'unisat')
        return new UnisatConnector();
    throw new Error(`Wallet ${name} not yet implemented`);
}
//# sourceMappingURL=wallets.js.map