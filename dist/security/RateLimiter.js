"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
/**
 * In-memory rate limiter for wallet unlock attempts.
 * Prevents brute-force attacks on the wallet password.
 */
class RateLimiter {
    attempts = new Map();
    maxAttempts;
    lockoutDurationMs;
    windowMs;
    constructor(maxAttempts = 5, lockoutDurationMs = 300_000, windowMs = 600_000) {
        this.maxAttempts = maxAttempts;
        this.lockoutDurationMs = lockoutDurationMs;
        this.windowMs = windowMs;
    }
    isAllowed(key) {
        const now = Date.now();
        const entry = this.attempts.get(key);
        if (!entry)
            return true;
        if (entry.lockedUntil > now)
            return false;
        if (now - entry.firstAttempt > this.windowMs) {
            this.attempts.delete(key);
            return true;
        }
        return entry.count < this.maxAttempts;
    }
    recordAttempt(key, success) {
        const now = Date.now();
        if (success) {
            this.attempts.delete(key);
            return;
        }
        const entry = this.attempts.get(key);
        if (!entry || now - entry.firstAttempt > this.windowMs) {
            const newEntry = { count: 1, firstAttempt: now, lockedUntil: 0 };
            if (newEntry.count >= this.maxAttempts) {
                newEntry.lockedUntil = now + this.lockoutDurationMs;
            }
            this.attempts.set(key, newEntry);
            return;
        }
        entry.count++;
        if (entry.count >= this.maxAttempts) {
            entry.lockedUntil = now + this.lockoutDurationMs;
        }
    }
    getRemainingLockout(key) {
        const entry = this.attempts.get(key);
        if (!entry)
            return 0;
        const remaining = entry.lockedUntil - Date.now();
        return remaining > 0 ? remaining : 0;
    }
    reset(key) {
        this.attempts.delete(key);
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map