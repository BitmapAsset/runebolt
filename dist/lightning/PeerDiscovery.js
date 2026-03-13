"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerDiscovery = void 0;
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('PeerDiscovery');
class PeerDiscovery {
    channelManager;
    knownPeers = new Map();
    constructor(channelManager) {
        this.channelManager = channelManager;
    }
    /**
     * Discover peers that support Taproot Asset channels.
     * Queries the Lightning network graph for nodes advertising
     * Taproot Asset support via feature bits.
     */
    async discoverPeers() {
        log.info('Discovering Taproot Asset capable peers');
        // In production, this would:
        // 1. Query LND's DescribeGraph for all nodes
        // 2. Filter for nodes with Taproot Asset feature bits set
        // 3. Check for nodes running tapd (via custom TLV in node announcements)
        // For now, return known peers
        return Array.from(this.knownPeers.values()).filter(p => p.supportsTaprootAssets);
    }
    /**
     * Add a known peer manually (e.g., from config or user input).
     */
    addPeer(peer) {
        this.knownPeers.set(peer.pubkey, peer);
        log.info({ pubkey: peer.pubkey.substring(0, 16) + '...', alias: peer.alias }, 'Peer added');
    }
    /**
     * Remove a peer.
     */
    removePeer(pubkey) {
        this.knownPeers.delete(pubkey);
    }
    /**
     * Get a specific peer by pubkey.
     */
    getPeer(pubkey) {
        return this.knownPeers.get(pubkey);
    }
    /**
     * List all known peers.
     */
    listPeers() {
        return Array.from(this.knownPeers.values());
    }
    /**
     * Find peers that have channels for a specific asset.
     */
    findPeersForAsset(assetId) {
        return this.listPeers().filter(p => p.supportsTaprootAssets && p.assetChannels.includes(assetId));
    }
    /**
     * Connect to a peer via LND.
     */
    async connectToPeer(pubkey, address) {
        await this.channelManager.connectPeer(pubkey, address);
        const peer = this.knownPeers.get(pubkey);
        if (peer) {
            log.info({ pubkey: pubkey.substring(0, 16) + '...' }, 'Connected to peer');
        }
    }
}
exports.PeerDiscovery = PeerDiscovery;
//# sourceMappingURL=PeerDiscovery.js.map