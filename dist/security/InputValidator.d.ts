import { z } from 'zod';
export declare class InputValidator {
    static validateAddress(address: string, network: string): boolean;
    static validateTxid(txid: string): boolean;
    static validateHex(hex: string, expectedLength?: number): boolean;
    static validatePubkey(pubkey: string): boolean;
    static validateAmount(amount: bigint): boolean;
    static validatePort(port: number): boolean;
    static sanitizeString(input: string, maxLength?: number): string;
    static validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
        success: true;
        data: T;
    } | {
        success: false;
        error: string;
    };
}
//# sourceMappingURL=InputValidator.d.ts.map