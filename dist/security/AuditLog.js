"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Tamper-evident local audit log using hash chains.
 * Each entry's hash includes the previous entry's hash.
 */
class AuditLog {
    logPath;
    lastHash = '0'.repeat(64);
    constructor(logPath) {
        this.logPath = logPath;
        const dir = path_1.default.dirname(logPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        this.loadLastHash();
    }
    loadLastHash() {
        if (!fs_1.default.existsSync(this.logPath))
            return;
        const content = fs_1.default.readFileSync(this.logPath, 'utf-8').trim();
        if (!content)
            return;
        const lines = content.split('\n');
        const lastLine = lines[lines.length - 1];
        try {
            const entry = JSON.parse(lastLine);
            this.lastHash = entry.hash;
        }
        catch {
            // Corrupted log - start fresh chain from current state
        }
    }
    log(action, details = {}) {
        const entry = {
            id: crypto_1.default.randomUUID(),
            timestamp: new Date(),
            action,
            details: this.redactSensitive(details),
            previousHash: this.lastHash,
            hash: '',
        };
        // Compute hash of entry (excluding hash field itself)
        const hashInput = JSON.stringify({
            id: entry.id,
            timestamp: entry.timestamp.toISOString(),
            action: entry.action,
            details: entry.details,
            previousHash: entry.previousHash,
        });
        entry.hash = crypto_1.default.createHash('sha256').update(hashInput).digest('hex');
        this.lastHash = entry.hash;
        // Append to file
        const line = JSON.stringify({
            ...entry,
            timestamp: entry.timestamp.toISOString(),
        });
        fs_1.default.appendFileSync(this.logPath, line + '\n');
        return entry;
    }
    verify() {
        if (!fs_1.default.existsSync(this.logPath))
            return { valid: true, entries: 0 };
        const content = fs_1.default.readFileSync(this.logPath, 'utf-8').trim();
        if (!content)
            return { valid: true, entries: 0 };
        const lines = content.split('\n');
        let previousHash = '0'.repeat(64);
        for (let i = 0; i < lines.length; i++) {
            try {
                const entry = JSON.parse(lines[i]);
                if (entry.previousHash !== previousHash) {
                    return { valid: false, entries: lines.length, brokenAt: i };
                }
                const hashInput = JSON.stringify({
                    id: entry.id,
                    timestamp: entry.timestamp,
                    action: entry.action,
                    details: entry.details,
                    previousHash: entry.previousHash,
                });
                const expectedHash = crypto_1.default.createHash('sha256').update(hashInput).digest('hex');
                if (entry.hash !== expectedHash) {
                    return { valid: false, entries: lines.length, brokenAt: i };
                }
                previousHash = entry.hash;
            }
            catch {
                return { valid: false, entries: lines.length, brokenAt: i };
            }
        }
        return { valid: true, entries: lines.length };
    }
    redactSensitive(details) {
        const sensitiveKeys = ['privateKey', 'privkey', 'secret', 'password', 'mnemonic', 'seed', 'preimage'];
        const redacted = { ...details };
        for (const key of sensitiveKeys) {
            if (key in redacted) {
                redacted[key] = '[REDACTED]';
            }
        }
        return redacted;
    }
}
exports.AuditLog = AuditLog;
//# sourceMappingURL=AuditLog.js.map