"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryGuard = void 0;
const CryptoUtils_1 = require("./CryptoUtils");
/**
 * MemoryGuard tracks sensitive buffers and zeroes them after use.
 * Use withGuard() for scoped automatic cleanup.
 */
class MemoryGuard {
    tracked = [];
    cleanups = [];
    track(buf) {
        this.tracked.push(buf);
        return buf;
    }
    onCleanup(fn) {
        this.cleanups.push(fn);
    }
    dispose() {
        for (const buf of this.tracked) {
            CryptoUtils_1.CryptoUtils.zeroBuffer(buf);
        }
        this.tracked.length = 0;
        for (const fn of this.cleanups) {
            try {
                fn();
            }
            catch { /* best effort */ }
        }
        this.cleanups.length = 0;
    }
    static async withGuard(fn) {
        const guard = new MemoryGuard();
        try {
            return await fn(guard);
        }
        finally {
            guard.dispose();
        }
    }
}
exports.MemoryGuard = MemoryGuard;
//# sourceMappingURL=MemoryGuard.js.map