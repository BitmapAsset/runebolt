import crypto from 'crypto';
import * as bitcoin from 'bitcoinjs-lib';
import { HTLCManager } from '../../src/core/HTLCManager';
import { BridgeConfig, HTLCParams, RuneId } from '../../src/types';

const mockConfig: BridgeConfig = {
  network: 'regtest',
  mode: 'custodial',
  bitcoin: { rpcUrl: '', rpcUser: '', rpcPass: '' },
  lightning: { lndHost: '', lndPort: 0, tlsCertPath: '', macaroonPath: '' },
  indexer: { ordApiUrl: '', unisatApiUrl: '', unisatApiKey: '' },
  bridge: {
    htlcTimeoutBlocks: 144,
    minSwapAmount: 1000n,
    maxSwapAmount: 100000000n,
    feeRateBps: 50,
    bridgeAddress: '',
    bridgePrivkeyPath: '',
  },
  server: { port: 3000, host: '0.0.0.0', corsOrigins: ['*'] },
};

describe('HTLCManager', () => {
  let htlcManager: HTLCManager;
  let defaultParams: HTLCParams;

  beforeEach(() => {
    htlcManager = new HTLCManager(mockConfig);

    const preimage = crypto.randomBytes(32);
    const paymentHash = crypto.createHash('sha256').update(preimage).digest();
    const claimerKey = crypto.randomBytes(33);
    claimerKey[0] = 0x02; // compressed pubkey prefix
    const refunderKey = crypto.randomBytes(33);
    refunderKey[0] = 0x02;

    defaultParams = {
      paymentHash,
      claimerPubkey: claimerKey,
      refunderPubkey: refunderKey,
      timelock: 800144,
      runeId: { block: 840000, tx: 1 },
      runeAmount: 1000n,
    };
  });

  describe('buildHTLCScript', () => {
    it('should build a valid HTLC redeem script', () => {
      const script = htlcManager.buildHTLCScript(defaultParams);
      expect(script).toBeInstanceOf(Buffer);
      expect(script.length).toBeGreaterThan(0);

      // Decompile and verify structure
      const decompiled = bitcoin.script.decompile(script);
      expect(decompiled).not.toBeNull();
      expect(decompiled![0]).toBe(bitcoin.opcodes.OP_IF);
      expect(decompiled![1]).toBe(bitcoin.opcodes.OP_SHA256);
    });

    it('should include the payment hash in the script', () => {
      const script = htlcManager.buildHTLCScript(defaultParams);
      const decompiled = bitcoin.script.decompile(script)!;

      // Payment hash should be the 3rd element (index 2)
      expect(Buffer.isBuffer(decompiled[2])).toBe(true);
      expect(decompiled[2]).toEqual(defaultParams.paymentHash);
    });

    it('should include both pubkeys', () => {
      const script = htlcManager.buildHTLCScript(defaultParams);
      const scriptHex = script.toString('hex');

      expect(scriptHex).toContain(defaultParams.claimerPubkey.toString('hex'));
      expect(scriptHex).toContain(defaultParams.refunderPubkey.toString('hex'));
    });

    it('should include CHECKLOCKTIMEVERIFY', () => {
      const script = htlcManager.buildHTLCScript(defaultParams);
      const decompiled = bitcoin.script.decompile(script)!;

      const hasClTV = decompiled.some((op) => op === bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY);
      expect(hasClTV).toBe(true);
    });
  });

  describe('getHTLCAddress', () => {
    it('should generate a valid P2WSH address', () => {
      const script = htlcManager.buildHTLCScript(defaultParams);
      const address = htlcManager.getHTLCAddress(script);

      expect(address).toBeDefined();
      expect(address.startsWith('bcrt1')).toBe(true); // regtest bech32
    });

    it('should generate deterministic addresses', () => {
      const script = htlcManager.buildHTLCScript(defaultParams);
      const addr1 = htlcManager.getHTLCAddress(script);
      const addr2 = htlcManager.getHTLCAddress(script);

      expect(addr1).toBe(addr2);
    });
  });

  describe('encodeRunestone', () => {
    it('should encode a valid runestone OP_RETURN', () => {
      const runeId: RuneId = { block: 840000, tx: 1 };
      const runestone = htlcManager.encodeRunestone(runeId, 1000n, 1);

      expect(runestone).toBeInstanceOf(Buffer);

      // Decompile to verify OP_RETURN structure
      const decompiled = bitcoin.script.decompile(runestone)!;
      expect(decompiled[0]).toBe(bitcoin.opcodes.OP_RETURN);
      expect(decompiled[1]).toBe(bitcoin.opcodes.OP_13); // Runestone magic
    });

    it('should handle large rune amounts', () => {
      const runeId: RuneId = { block: 840000, tx: 1 };
      const largeAmount = 100000000000000n;
      const runestone = htlcManager.encodeRunestone(runeId, largeAmount, 1);

      expect(runestone).toBeInstanceOf(Buffer);
      expect(runestone.length).toBeGreaterThan(0);
    });
  });

  describe('buildLockTransaction', () => {
    it('should build a valid PSBT with HTLC output', () => {
      const inputUtxo = {
        txid: 'a'.repeat(64),
        vout: 0,
        value: 10000,
        scriptPubKey: Buffer.alloc(34),
      };

      const { psbt, htlcAddress, redeemScript } = htlcManager.buildLockTransaction(
        defaultParams,
        inputUtxo,
        10,
      );

      expect(psbt).toBeInstanceOf(bitcoin.Psbt);
      expect(htlcAddress).toBeDefined();
      expect(redeemScript).toBeInstanceOf(Buffer);
      expect(psbt.txOutputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('HTLC state tracking', () => {
    it('should register and retrieve HTLC state', () => {
      const txid = 'a'.repeat(64);
      htlcManager.registerHTLC(txid, 0, defaultParams);

      const state = htlcManager.getHTLCState(txid, 0);
      expect(state).toBeDefined();
      expect(state!.locked).toBe(true);
      expect(state!.claimed).toBe(false);
      expect(state!.refunded).toBe(false);
    });

    it('should mark HTLC as claimed', () => {
      const txid = 'b'.repeat(64);
      htlcManager.registerHTLC(txid, 0, defaultParams);
      htlcManager.markClaimed(txid, 0);

      const state = htlcManager.getHTLCState(txid, 0);
      expect(state!.claimed).toBe(true);
      expect(state!.locked).toBe(false);
    });

    it('should mark HTLC as refunded', () => {
      const txid = 'c'.repeat(64);
      htlcManager.registerHTLC(txid, 0, defaultParams);
      htlcManager.markRefunded(txid, 0);

      const state = htlcManager.getHTLCState(txid, 0);
      expect(state!.refunded).toBe(true);
      expect(state!.locked).toBe(false);
    });

    it('should return undefined for unknown HTLC', () => {
      const state = htlcManager.getHTLCState('unknown', 0);
      expect(state).toBeUndefined();
    });
  });

  describe('witness builders', () => {
    it('should build a claim witness with correct structure', () => {
      const signature = crypto.randomBytes(72);
      const preimage = crypto.randomBytes(32);
      const redeemScript = htlcManager.buildHTLCScript(defaultParams);

      const witness = htlcManager.buildClaimWitness(signature, preimage, redeemScript);

      expect(witness).toHaveLength(4);
      expect(witness[0]).toEqual(signature);
      expect(witness[1]).toEqual(preimage);
      expect(witness[2]).toEqual(Buffer.from([0x01])); // OP_TRUE
      expect(witness[3]).toEqual(redeemScript);
    });

    it('should build a refund witness with correct structure', () => {
      const signature = crypto.randomBytes(72);
      const redeemScript = htlcManager.buildHTLCScript(defaultParams);

      const witness = htlcManager.buildRefundWitness(signature, redeemScript);

      expect(witness).toHaveLength(3);
      expect(witness[0]).toEqual(signature);
      expect(witness[1]).toEqual(Buffer.from([])); // OP_FALSE
      expect(witness[2]).toEqual(redeemScript);
    });
  });
});
