import { AssetChannel, RuneBoltConfig } from '../types';
import { TaprootAssetManager } from './TaprootAssetManager';
export declare class AssetChannelManager {
    private readonly tapd;
    private readonly channels;
    private readonly lndHost;
    private readonly lndPort;
    constructor(tapd: TaprootAssetManager, config: RuneBoltConfig);
    /**
     * Open a Taproot Asset Lightning channel with a peer.
     * This creates a channel that can carry both BTC and Taproot Assets.
     */
    openChannel(peerPubkey: string, assetId: string, localAmount: bigint, pushAmount?: bigint): Promise<AssetChannel>;
    /**
     * Close a Taproot Asset channel cooperatively.
     */
    closeChannel(channelId: string): Promise<{
        closingTxid: string;
    }>;
    /**
     * List all Taproot Asset channels.
     */
    listChannels(activeOnly?: boolean): AssetChannel[];
    /**
     * Get channels for a specific asset.
     */
    getChannelsForAsset(assetId: string): AssetChannel[];
    /**
     * Get total capacity for an asset across all channels.
     */
    getTotalCapacity(assetId: string): {
        local: bigint;
        remote: bigint;
        total: bigint;
    };
    /**
     * Update channel balances after a payment.
     */
    updateBalance(channelId: string, localDelta: bigint): void;
}
//# sourceMappingURL=AssetChannelManager.d.ts.map