import { LightningPeer } from '../types';
import { ChannelManager } from './ChannelManager';
export declare class PeerDiscovery {
    private readonly channelManager;
    private readonly knownPeers;
    constructor(channelManager: ChannelManager);
    /**
     * Discover peers that support Taproot Asset channels.
     * Queries the Lightning network graph for nodes advertising
     * Taproot Asset support via feature bits.
     */
    discoverPeers(): Promise<LightningPeer[]>;
    /**
     * Add a known peer manually (e.g., from config or user input).
     */
    addPeer(peer: LightningPeer): void;
    /**
     * Remove a peer.
     */
    removePeer(pubkey: string): void;
    /**
     * Get a specific peer by pubkey.
     */
    getPeer(pubkey: string): LightningPeer | undefined;
    /**
     * List all known peers.
     */
    listPeers(): LightningPeer[];
    /**
     * Find peers that have channels for a specific asset.
     */
    findPeersForAsset(assetId: string): LightningPeer[];
    /**
     * Connect to a peer via LND.
     */
    connectToPeer(pubkey: string, address: string): Promise<void>;
}
//# sourceMappingURL=PeerDiscovery.d.ts.map