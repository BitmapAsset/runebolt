import { AuditEntry } from '../types';
/**
 * Tamper-evident local audit log using hash chains.
 * Each entry's hash includes the previous entry's hash.
 */
export declare class AuditLog {
    private readonly logPath;
    private lastHash;
    constructor(logPath: string);
    private loadLastHash;
    log(action: string, details?: Record<string, unknown>): AuditEntry;
    verify(): {
        valid: boolean;
        entries: number;
        brokenAt?: number;
    };
    private redactSensitive;
}
//# sourceMappingURL=AuditLog.d.ts.map