import { InscriptionInfo, UtxoRef, TaprootAsset } from '../types';
import { TaprootAssetManager } from '../taproot/TaprootAssetManager';
import { BitmapDetector } from './BitmapDetector';
export declare class InscriptionTransfer {
    private readonly tapd;
    private readonly detector;
    constructor(tapd: TaprootAssetManager, detector: BitmapDetector);
    /**
     * Wrap an Ordinals inscription into a Taproot Asset for Lightning transport.
     *
     * Inscriptions are unique (amount = 1), so the Taproot Asset is also unique.
     * Metadata embeds the inscription ID for verification on unwrap.
     */
    wrapInscription(inscriptionInfo: InscriptionInfo, sourceUtxo: UtxoRef): Promise<{
        assetId: string;
        mintTxid: string;
    }>;
    /**
     * Unwrap a Taproot Asset back to the original Ordinals inscription.
     * Verifies the asset's metadata matches the expected inscription.
     */
    unwrapInscription(asset: TaprootAsset, destinationAddress: string): Promise<{
        txid: string;
    }>;
    /**
     * Transfer an inscription over Lightning via its Taproot Asset wrapper.
     */
    transferViaLightning(assetId: string, invoice: string): Promise<{
        paymentHash: string;
    }>;
}
//# sourceMappingURL=InscriptionTransfer.d.ts.map