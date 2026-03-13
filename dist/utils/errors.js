"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityError = exports.InsufficientFundsError = exports.TaprootAssetError = exports.LightningError = exports.WrapError = exports.WalletError = exports.RuneBoltError = void 0;
class RuneBoltError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'RuneBoltError';
    }
}
exports.RuneBoltError = RuneBoltError;
class WalletError extends RuneBoltError {
    constructor(message, details) {
        super(message, 'WALLET_ERROR', 400, details);
        this.name = 'WalletError';
    }
}
exports.WalletError = WalletError;
class WrapError extends RuneBoltError {
    constructor(message, details) {
        super(message, 'WRAP_ERROR', 400, details);
        this.name = 'WrapError';
    }
}
exports.WrapError = WrapError;
class LightningError extends RuneBoltError {
    constructor(message, details) {
        super(message, 'LIGHTNING_ERROR', 502, details);
        this.name = 'LightningError';
    }
}
exports.LightningError = LightningError;
class TaprootAssetError extends RuneBoltError {
    constructor(message, details) {
        super(message, 'TAPROOT_ASSET_ERROR', 500, details);
        this.name = 'TaprootAssetError';
    }
}
exports.TaprootAssetError = TaprootAssetError;
class InsufficientFundsError extends RuneBoltError {
    constructor(message, details) {
        super(message, 'INSUFFICIENT_FUNDS', 400, details);
        this.name = 'InsufficientFundsError';
    }
}
exports.InsufficientFundsError = InsufficientFundsError;
class SecurityError extends RuneBoltError {
    constructor(message, details) {
        super(message, 'SECURITY_ERROR', 403, details);
        this.name = 'SecurityError';
    }
}
exports.SecurityError = SecurityError;
//# sourceMappingURL=errors.js.map