"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitmapDetector = void 0;
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('BitmapDetector');
class BitmapDetector {
    ordApiUrl;
    constructor(ordApiUrl) {
        this.ordApiUrl = ordApiUrl;
    }
    /**
     * Check if a UTXO contains a Bitmap inscription.
     */
    async detectBitmap(utxo) {
        try {
            const inscriptions = await this.getInscriptionsForUtxo(utxo);
            const bitmap = inscriptions.find(i => i.isBitmap);
            return bitmap || null;
        }
        catch (err) {
            log.error({ err, txid: utxo.txid, vout: utxo.vout }, 'Bitmap detection failed');
            return null;
        }
    }
    /**
     * Get all inscriptions in a UTXO.
     */
    async getInscriptionsForUtxo(utxo) {
        const url = `${this.ordApiUrl}/output/${utxo.txid}:${utxo.vout}`;
        const res = await fetch(url, {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
            if (res.status === 404)
                return [];
            throw new Error(`Ord API error: ${res.status}`);
        }
        const data = (await res.json());
        if (!data.inscriptions || data.inscriptions.length === 0)
            return [];
        const results = [];
        for (const inscriptionId of data.inscriptions) {
            const info = await this.getInscriptionInfo(inscriptionId);
            if (info) {
                info.utxo = utxo;
                results.push(info);
            }
        }
        return results;
    }
    /**
     * Get detailed info about an inscription.
     */
    async getInscriptionInfo(inscriptionId) {
        const url = `${this.ordApiUrl}/inscription/${inscriptionId}`;
        const res = await fetch(url, {
            headers: { Accept: 'application/json' },
        });
        if (!res.ok)
            return null;
        const data = (await res.json());
        const isBitmap = this.isBitmapInscription(data);
        const bitmapNumber = isBitmap ? this.extractBitmapNumber(data) : undefined;
        return {
            inscriptionId,
            contentType: data.content_type || '',
            contentLength: data.content_length || 0,
            genesisHeight: data.genesis_height || 0,
            genesisFee: data.genesis_fee || 0,
            address: data.address || '',
            utxo: { txid: '', vout: 0, value: 0 },
            isBitmap,
            bitmapNumber,
        };
    }
    /**
     * Scan multiple UTXOs for bitmap inscriptions.
     */
    async scanForBitmaps(utxos) {
        log.info({ count: utxos.length }, 'Scanning UTXOs for bitmap inscriptions');
        const bitmaps = [];
        for (const utxo of utxos) {
            const bitmap = await this.detectBitmap(utxo);
            if (bitmap) {
                bitmaps.push(bitmap);
            }
        }
        log.info({ found: bitmaps.length }, 'Bitmap scan complete');
        return bitmaps;
    }
    isBitmapInscription(data) {
        // Bitmap inscriptions have content type text/plain and content
        // matching the pattern "NNNN.bitmap"
        if (data.content_type !== 'text/plain;charset=utf-8' &&
            data.content_type !== 'text/plain') {
            return false;
        }
        // Check if the inscription content matches bitmap pattern
        const content = data.content || '';
        return /^\d+\.bitmap$/.test(content);
    }
    extractBitmapNumber(data) {
        const content = data.content || '';
        const match = content.match(/^(\d+)\.bitmap$/);
        return match ? parseInt(match[1]) : undefined;
    }
}
exports.BitmapDetector = BitmapDetector;
//# sourceMappingURL=BitmapDetector.js.map