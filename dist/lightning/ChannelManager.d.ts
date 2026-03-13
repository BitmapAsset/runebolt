import { RuneBoltConfig } from '../types';
interface LndChannelInfo {
    channelId: string;
    remotePubkey: string;
    capacity: string;
    localBalance: string;
    remoteBalance: string;
    active: boolean;
}
export declare class ChannelManager {
    private client;
    private readonly config;
    constructor(config: RuneBoltConfig);
    connect(): Promise<void>;
    private promisify;
    getInfo(): Promise<{
        alias: string;
        blockHeight: number;
        syncedToChain: boolean;
        pubkey: string;
    }>;
    listChannels(): Promise<LndChannelInfo[]>;
    connectPeer(pubkey: string, host: string): Promise<void>;
    openChannel(peerPubkey: string, localFundingSats: number, pushSats?: number): Promise<string>;
    closeChannel(channelPoint: string, force?: boolean): Promise<string>;
    getChannelBalance(): Promise<{
        local: number;
        remote: number;
    }>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=ChannelManager.d.ts.map