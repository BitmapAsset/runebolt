import { InscriptionInfo, UtxoRef } from '../types';
export declare class BitmapDetector {
    private readonly ordApiUrl;
    constructor(ordApiUrl: string);
    /**
     * Check if a UTXO contains a Bitmap inscription.
     */
    detectBitmap(utxo: UtxoRef): Promise<InscriptionInfo | null>;
    /**
     * Get all inscriptions in a UTXO.
     */
    getInscriptionsForUtxo(utxo: UtxoRef): Promise<InscriptionInfo[]>;
    /**
     * Get detailed info about an inscription.
     */
    getInscriptionInfo(inscriptionId: string): Promise<InscriptionInfo | null>;
    /**
     * Scan multiple UTXOs for bitmap inscriptions.
     */
    scanForBitmaps(utxos: UtxoRef[]): Promise<InscriptionInfo[]>;
    private isBitmapInscription;
    private extractBitmapNumber;
}
//# sourceMappingURL=BitmapDetector.d.ts.map