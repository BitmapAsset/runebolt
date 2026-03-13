type CleanupFn = () => void;
/**
 * MemoryGuard tracks sensitive buffers and zeroes them after use.
 * Use withGuard() for scoped automatic cleanup.
 */
export declare class MemoryGuard {
    private readonly tracked;
    private readonly cleanups;
    track(buf: Buffer): Buffer;
    onCleanup(fn: CleanupFn): void;
    dispose(): void;
    static withGuard<T>(fn: (guard: MemoryGuard) => Promise<T>): Promise<T>;
}
export {};
//# sourceMappingURL=MemoryGuard.d.ts.map