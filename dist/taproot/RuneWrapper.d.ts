import { WrapOperation, WrapRequest, UnwrapRequest } from '../types';
import { TaprootAssetManager } from './TaprootAssetManager';
export declare class RuneWrapper {
    private readonly tapd;
    private readonly operations;
    constructor(tapd: TaprootAssetManager);
    /**
     * WRAP: Lock Runes on-chain, mint equivalent Taproot Asset.
     *
     * Flow:
     * 1. User sends Runes to a locking script (commit tx)
     * 2. tapd mints a Taproot Asset with metadata pointing to the locked Runes
     * 3. Taproot Asset can now travel over Lightning channels
     */
    wrap(request: WrapRequest): Promise<WrapOperation>;
    /**
     * Confirm that the Rune locking transaction has been broadcast and confirmed.
     */
    confirmLock(opId: string, lockTxid: string): Promise<WrapOperation>;
    /**
     * UNWRAP: Burn Taproot Asset, release locked Runes back on-chain.
     *
     * Flow:
     * 1. User sends Taproot Asset back to the wrapper (burn)
     * 2. Wrapper verifies the burn proof
     * 3. Locked Runes are released to the user's destination address
     */
    unwrap(request: UnwrapRequest): Promise<WrapOperation>;
    getOperation(opId: string): WrapOperation;
    getAllOperations(): WrapOperation[];
}
//# sourceMappingURL=RuneWrapper.d.ts.map