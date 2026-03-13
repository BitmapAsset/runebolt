/**
 * In-memory rate limiter for wallet unlock attempts.
 * Prevents brute-force attacks on the wallet password.
 */
export declare class RateLimiter {
    private attempts;
    private readonly maxAttempts;
    private readonly lockoutDurationMs;
    private readonly windowMs;
    constructor(maxAttempts?: number, lockoutDurationMs?: number, windowMs?: number);
    isAllowed(key: string): boolean;
    recordAttempt(key: string, success: boolean): void;
    getRemainingLockout(key: string): number;
    reset(key: string): void;
}
//# sourceMappingURL=RateLimiter.d.ts.map