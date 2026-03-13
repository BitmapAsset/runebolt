export declare class RuneBoltError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, statusCode?: number, details?: Record<string, unknown> | undefined);
}
export declare class WalletError extends RuneBoltError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class WrapError extends RuneBoltError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class LightningError extends RuneBoltError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class TaprootAssetError extends RuneBoltError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class InsufficientFundsError extends RuneBoltError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class SecurityError extends RuneBoltError {
    constructor(message: string, details?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map