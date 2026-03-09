/**
 * Phase 2 Wallet Automation Tests
 *
 * Tests for TaprootUtils, DeedNotifier, DeedWatcher, AutoClaimer, and quickSend.
 */

import * as crypto from 'crypto';
import * as bitcoin from 'bitcoinjs-lib';
import { initEccLib } from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

initEccLib(ecc);

import {
  extractInternalKey,
  taprootAddressToXOnlyPubkey,
  isValidTaprootAddress,
  pubkeyToTaprootAddress,
} from '../src/wallet/TaprootUtils';

import {
  encodeNotification,
  decodeNotification,
} from '../src/wallet/DeedNotifier';

import { DeedWatcher, IncomingDeed } from '../src/wallet/DeedWatcher';
import { AutoClaimer, WalletConfig, AutoClaimerConfig } from '../src/wallet/AutoClaimer';
import { BitcoinRPC, RawTransaction } from '../src/wallet/BitcoinRPC';

// ──────────────────────────────────────────────
// TaprootUtils Tests
// ──────────────────────────────────────────────

describe('TaprootUtils', () => {
  // Generate a deterministic x-only pubkey for testing
  const testPrivkey = crypto.createHash('sha256').update('test-seed-runebolt').digest();
  const testPubkeyFull = Buffer.from(ecc.pointFromScalar(testPrivkey)!);
  const testXOnlyPubkey = testPubkeyFull.subarray(1, 33);

  test('pubkeyToTaprootAddress generates valid bc1p address', () => {
    const address = pubkeyToTaprootAddress(testXOnlyPubkey, bitcoin.networks.bitcoin);
    expect(address).toMatch(/^bc1p/);
    expect(isValidTaprootAddress(address)).toBe(true);
  });

  test('pubkeyToTaprootAddress generates valid tb1p address for testnet', () => {
    const address = pubkeyToTaprootAddress(testXOnlyPubkey, bitcoin.networks.testnet);
    expect(address).toMatch(/^tb1p/);
    expect(isValidTaprootAddress(address)).toBe(true);
  });

  test('pubkeyToTaprootAddress generates valid bcrt1p address for regtest', () => {
    const address = pubkeyToTaprootAddress(testXOnlyPubkey, bitcoin.networks.regtest);
    expect(address).toMatch(/^bcrt1p/);
    expect(isValidTaprootAddress(address)).toBe(true);
  });

  test('extractInternalKey roundtrips with pubkeyToTaprootAddress', () => {
    const address = pubkeyToTaprootAddress(testXOnlyPubkey, bitcoin.networks.bitcoin);
    const extracted = extractInternalKey(address);
    expect(extracted).toEqual(testXOnlyPubkey);
  });

  test('taprootAddressToXOnlyPubkey is alias for extractInternalKey', () => {
    const address = pubkeyToTaprootAddress(testXOnlyPubkey, bitcoin.networks.bitcoin);
    const a = extractInternalKey(address);
    const b = taprootAddressToXOnlyPubkey(address);
    expect(a).toEqual(b);
  });

  test('isValidTaprootAddress rejects non-taproot addresses', () => {
    expect(isValidTaprootAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(false);
    expect(isValidTaprootAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(false);
    expect(isValidTaprootAddress('')).toBe(false);
    expect(isValidTaprootAddress('not-an-address')).toBe(false);
  });

  test('isValidTaprootAddress accepts valid bc1p addresses', () => {
    const address = pubkeyToTaprootAddress(testXOnlyPubkey, bitcoin.networks.bitcoin);
    expect(isValidTaprootAddress(address)).toBe(true);
  });

  test('extractInternalKey throws on invalid address', () => {
    expect(() => extractInternalKey('bc1qinvalid')).toThrow();
  });

  test('pubkeyToTaprootAddress throws on wrong-length key', () => {
    expect(() => pubkeyToTaprootAddress(Buffer.alloc(16), bitcoin.networks.bitcoin)).toThrow(
      'x-only pubkey must be exactly 32 bytes'
    );
  });
});

// ──────────────────────────────────────────────
// DeedNotifier — OP_RETURN encoding/decoding
// ──────────────────────────────────────────────

describe('DeedNotifier OP_RETURN', () => {
  const preimage = crypto.randomBytes(32);
  const paymentHash = crypto.createHash('sha256').update(preimage).digest();
  const deedLockTxid = 'aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344';

  test('encodeNotification produces valid buffer', () => {
    const encoded = encodeNotification(preimage, paymentHash, deedLockTxid);
    expect(encoded.length).toBeLessThanOrEqual(80);
    expect(encoded.length).toBe(80); // RUNEBOLT(8) + preimage(32) + hash(32) + txid(8)
    expect(encoded.subarray(0, 8).toString()).toBe('RUNEBOLT');
  });

  test('decodeNotification roundtrips with encodeNotification', () => {
    const encoded = encodeNotification(preimage, paymentHash, deedLockTxid);
    const decoded = decodeNotification(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.preimage).toEqual(preimage);
    expect(decoded!.paymentHash).toEqual(paymentHash);
    expect(decoded!.deedLockTxid).toBe(deedLockTxid.slice(0, 16)); // Truncated to 8 bytes
  });

  test('decodeNotification returns null for non-RuneBolt data', () => {
    const garbage = crypto.randomBytes(80);
    expect(decodeNotification(garbage)).toBeNull();
  });

  test('decodeNotification returns null for short data', () => {
    expect(decodeNotification(Buffer.from('RUNEBOLT'))).toBeNull();
  });

  test('decodeNotification returns null for invalid preimage/hash pair', () => {
    const badData = Buffer.concat([
      Buffer.from('RUNEBOLT'),
      crypto.randomBytes(32), // random "preimage"
      crypto.randomBytes(32), // random "hash" (won't match)
      crypto.randomBytes(8),
    ]);
    expect(decodeNotification(badData)).toBeNull();
  });

  test('encodeNotification throws on wrong preimage length', () => {
    expect(() => encodeNotification(Buffer.alloc(16), paymentHash, deedLockTxid)).toThrow(
      'Preimage must be 32 bytes'
    );
  });

  test('encodeNotification throws on mismatched preimage/hash', () => {
    const wrongHash = crypto.randomBytes(32);
    expect(() => encodeNotification(preimage, wrongHash, deedLockTxid)).toThrow(
      'Preimage does not match payment hash'
    );
  });
});

// ──────────────────────────────────────────────
// DeedWatcher — notification parsing
// ──────────────────────────────────────────────

describe('DeedWatcher notification parsing', () => {
  test('parseNotification extracts deed from OP_RETURN tx', () => {
    const preimage = crypto.randomBytes(32);
    const paymentHash = crypto.createHash('sha256').update(preimage).digest();
    const deedLockTxid = 'ff'.repeat(32);

    const opReturnData = encodeNotification(preimage, paymentHash, deedLockTxid);

    // Build a mock OP_RETURN scriptPubKey: OP_RETURN (6a) + OP_PUSHDATA1 (4c) + len + data
    // 80 bytes > 75, so we need OP_PUSHDATA1 encoding
    const scriptHex = Buffer.concat([
      Buffer.from([0x6a]),               // OP_RETURN
      Buffer.from([0x4c]),               // OP_PUSHDATA1
      Buffer.from([opReturnData.length]),// length byte
      opReturnData,
    ]).toString('hex');

    const mockTx: RawTransaction = {
      txid: 'aa'.repeat(32),
      hex: '',
      vin: [],
      vout: [
        {
          value: 0.00000546,
          n: 0,
          scriptPubKey: { hex: '0014' + 'bb'.repeat(20), type: 'witness_v0_keyhash' },
        },
        {
          value: 0,
          n: 1,
          scriptPubKey: { hex: scriptHex, type: 'nulldata' },
        },
      ],
    };

    const rpc = BitcoinRPC.mempool();
    const watcher = new DeedWatcher('bc1ptest', rpc);
    const result = watcher.parseNotification(mockTx);

    expect(result).not.toBeNull();
    expect(result!.preimage).toEqual(preimage);
    expect(result!.paymentHash).toEqual(paymentHash);
    expect(result!.notificationTxid).toBe('aa'.repeat(32));
  });

  test('parseNotification returns null for non-notification tx', () => {
    const mockTx: RawTransaction = {
      txid: 'cc'.repeat(32),
      hex: '',
      vin: [],
      vout: [
        {
          value: 0.001,
          n: 0,
          scriptPubKey: { hex: '0014' + 'dd'.repeat(20), type: 'witness_v0_keyhash' },
        },
      ],
    };

    const rpc = BitcoinRPC.mempool();
    const watcher = new DeedWatcher('bc1ptest', rpc);
    expect(watcher.parseNotification(mockTx)).toBeNull();
  });
});

// ──────────────────────────────────────────────
// AutoClaimer — batch logic
// ──────────────────────────────────────────────

describe('AutoClaimer batch logic', () => {
  function makeDeed(id: string): IncomingDeed {
    const preimage = crypto.createHash('sha256').update(`deed-${id}`).digest();
    return {
      notificationTxid: id.repeat(32).slice(0, 64),
      deedLockTxid: (id + 'f').repeat(32).slice(0, 64),
      preimage,
      paymentHash: crypto.createHash('sha256').update(preimage).digest(),
      assetType: 'rune',
    };
  }

  test('AutoClaimer config defaults are correct', () => {
    const wallet: WalletConfig = {
      privateKey: Buffer.alloc(32, 1),
      publicKey: Buffer.alloc(32, 2),
      network: bitcoin.networks.regtest,
    };
    const rpc = BitcoinRPC.mempool();
    const watcher = new DeedWatcher('bcrt1ptest', rpc);
    const claimer = new AutoClaimer(wallet, rpc, watcher);

    expect(claimer.config.zeroConfTrust).toBe(false);
    expect(claimer.config.zeroConfMaxSats).toBe(100_000);
    expect(claimer.config.batchDelayMs).toBe(30_000);
    expect(claimer.config.destinationAddress).toBe('');
  });

  test('AutoClaimer start throws without destinationAddress', () => {
    const wallet: WalletConfig = {
      privateKey: Buffer.alloc(32, 1),
      publicKey: Buffer.alloc(32, 2),
      network: bitcoin.networks.regtest,
    };
    const rpc = BitcoinRPC.mempool();
    const watcher = new DeedWatcher('bcrt1ptest', rpc);
    const claimer = new AutoClaimer(wallet, rpc, watcher);

    expect(() => claimer.start()).toThrow('destinationAddress must be configured');
  });

  test('AutoClaimer getClaimHistory starts empty', () => {
    const wallet: WalletConfig = {
      privateKey: Buffer.alloc(32, 1),
      publicKey: Buffer.alloc(32, 2),
      network: bitcoin.networks.regtest,
    };
    const rpc = BitcoinRPC.mempool();
    const watcher = new DeedWatcher('bcrt1ptest', rpc);
    const claimer = new AutoClaimer(wallet, rpc, watcher);

    expect(claimer.getClaimHistory()).toEqual([]);
  });
});

// ──────────────────────────────────────────────
// BitcoinRPC factory methods
// ──────────────────────────────────────────────

describe('BitcoinRPC', () => {
  test('mempool() creates instance with mempool backend', () => {
    const rpc = BitcoinRPC.mempool();
    expect(rpc).toBeInstanceOf(BitcoinRPC);
  });

  test('mempool() accepts custom base URL', () => {
    const rpc = BitcoinRPC.mempool('https://mempool.custom.com');
    expect(rpc).toBeInstanceOf(BitcoinRPC);
  });

  test('bitcoind() creates instance with bitcoind backend', () => {
    const rpc = BitcoinRPC.bitcoind('http://localhost:8332', 'user', 'pass');
    expect(rpc).toBeInstanceOf(BitcoinRPC);
  });
});

// ──────────────────────────────────────────────
// QuickSend integration (mock-level)
// ──────────────────────────────────────────────

describe('quickSend', () => {
  test('quickSend is exported and callable', async () => {
    const { quickSend } = await import('../src/wallet');
    expect(typeof quickSend).toBe('function');
  });

  test('sendAsset validates Taproot address', async () => {
    const { sendAsset } = await import('../src/wallet/RuneBoltSend');
    await expect(
      sendAsset({
        recipientTaprootAddress: 'bc1qnotaproot',
        asset: { type: 'rune', id: '840000:1', amount: 100n },
        senderWallet: {
          privateKey: Buffer.alloc(32, 1),
          utxos: [],
          address: 'bc1qsender',
        },
      })
    ).rejects.toThrow('Invalid Taproot address');
  });
});
