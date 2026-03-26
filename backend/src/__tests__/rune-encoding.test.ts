/**
 * Rune encoding/decoding tests for RuneBolt.
 *
 * Verifies LEB128 encoding, Runestone building, Runestone parsing,
 * and round-trip correctness against the Runes protocol specification.
 */

import { describe, it, expect } from 'vitest';
import { encodeLEB128, RuneBuilder } from '../rune/RuneBuilder';
import { decodeLEB128, RuneParser, RunestoneTag } from '../rune/RuneParser';
import {
  DOG_RUNE_ID,
  DOG_RUNE_BLOCK,
  DOG_RUNE_TX,
  formatDogAmount,
  parseDogAmount,
} from '../rune/RuneConstants';

// ==================== LEB128 Encoding Tests ====================

describe('LEB128 Encoding', () => {
  it('should encode 0 as single byte 0x00', () => {
    const buf = encodeLEB128(0n);
    expect(buf.length).toBe(1);
    expect(buf[0]).toBe(0x00);
  });

  it('should encode 1 as single byte 0x01', () => {
    const buf = encodeLEB128(1n);
    expect(buf.length).toBe(1);
    expect(buf[0]).toBe(0x01);
  });

  it('should encode 127 as single byte 0x7f', () => {
    const buf = encodeLEB128(127n);
    expect(buf.length).toBe(1);
    expect(buf[0]).toBe(0x7f);
  });

  it('should encode 128 as two bytes [0x80, 0x01]', () => {
    const buf = encodeLEB128(128n);
    expect(buf.length).toBe(2);
    expect(buf[0]).toBe(0x80);
    expect(buf[1]).toBe(0x01);
  });

  it('should encode 255 as two bytes [0xff, 0x01]', () => {
    const buf = encodeLEB128(255n);
    expect(buf.length).toBe(2);
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0x01);
  });

  it('should encode 300 as two bytes [0xac, 0x02]', () => {
    const buf = encodeLEB128(300n);
    expect(buf.length).toBe(2);
    expect(buf[0]).toBe(0xac);
    expect(buf[1]).toBe(0x02);
  });

  it('should encode DOG block 840000 correctly', () => {
    // 840000 in LEB128:
    // 840000 = 0xCD140
    // Byte 1: 0x40 | 0x80 = 0xC0
    // Byte 2: 0x28 | 0x80 = 0xA8 ... let's just verify round-trip
    const buf = encodeLEB128(BigInt(DOG_RUNE_BLOCK));
    expect(buf.length).toBeGreaterThan(1); // 840000 > 127
    expect(buf.length).toBeLessThanOrEqual(3); // 840000 < 2^21

    // Verify round-trip
    const { value, bytesRead } = decodeLEB128(buf, 0);
    expect(value).toBe(BigInt(DOG_RUNE_BLOCK));
    expect(bytesRead).toBe(buf.length);
  });

  it('should encode large values (2^32) correctly', () => {
    const val = 2n ** 32n;
    const buf = encodeLEB128(val);
    const { value } = decodeLEB128(buf, 0);
    expect(value).toBe(val);
  });

  it('should encode very large values (2^64) correctly', () => {
    const val = 2n ** 64n;
    const buf = encodeLEB128(val);
    const { value } = decodeLEB128(buf, 0);
    expect(value).toBe(val);
  });

  it('should reject negative values', () => {
    expect(() => encodeLEB128(-1n)).toThrow('negative');
  });
});

// ==================== LEB128 Decoding Tests ====================

describe('LEB128 Decoding', () => {
  it('should decode 0 from single byte', () => {
    const buf = Buffer.from([0x00]);
    const { value, bytesRead } = decodeLEB128(buf, 0);
    expect(value).toBe(0n);
    expect(bytesRead).toBe(1);
  });

  it('should decode 127 from single byte', () => {
    const buf = Buffer.from([0x7f]);
    const { value, bytesRead } = decodeLEB128(buf, 0);
    expect(value).toBe(127n);
    expect(bytesRead).toBe(1);
  });

  it('should decode multi-byte values correctly', () => {
    const buf = Buffer.from([0x80, 0x01]);
    const { value } = decodeLEB128(buf, 0);
    expect(value).toBe(128n);
  });

  it('should decode at arbitrary offset', () => {
    const buf = Buffer.from([0xff, 0xff, 0x80, 0x01, 0x00]);
    const { value, bytesRead } = decodeLEB128(buf, 2);
    expect(value).toBe(128n);
    expect(bytesRead).toBe(2);
  });

  it('should throw on truncated LEB128', () => {
    const buf = Buffer.from([0x80]); // continuation bit set but no next byte
    expect(() => decodeLEB128(buf, 0)).toThrow();
  });

  it('should throw on excessively long encoding (>18 bytes)', () => {
    // 19 bytes all with continuation bit set
    const bytes = new Array(19).fill(0x80);
    bytes.push(0x01); // terminate
    const buf = Buffer.from(bytes);
    expect(() => decodeLEB128(buf, 0)).toThrow('too long');
  });

  it('should round-trip all test values', () => {
    const testValues = [0n, 1n, 127n, 128n, 255n, 256n, 16383n, 16384n, 840000n, 2n ** 32n, 2n ** 64n - 1n];
    for (const val of testValues) {
      const encoded = encodeLEB128(val);
      const { value } = decodeLEB128(encoded, 0);
      expect(value).toBe(val);
    }
  });
});

// ==================== Rune ID Parsing Tests ====================

describe('Rune ID Encoding/Decoding', () => {
  it('should decode DOG rune ID', () => {
    const { block, tx } = RuneParser.decodeRuneId(DOG_RUNE_ID);
    expect(block).toBe(840000);
    expect(tx).toBe(3);
  });

  it('should encode rune ID', () => {
    const encoded = RuneParser.encodeRuneId(840000, 3);
    expect(encoded).toBe('840000:3');
  });

  it('should round-trip rune ID', () => {
    const { block, tx } = RuneParser.decodeRuneId('123456:789');
    expect(RuneParser.encodeRuneId(block, tx)).toBe('123456:789');
  });

  it('should reject invalid rune ID format', () => {
    expect(() => RuneParser.decodeRuneId('invalid')).toThrow('Invalid rune ID format');
    expect(() => RuneParser.decodeRuneId('abc:def')).toThrow('Invalid rune ID components');
    expect(() => RuneParser.decodeRuneId('1:2:3')).toThrow('Invalid rune ID format');
  });
});

// ==================== DOG Amount Formatting Tests ====================

describe('DOG Amount Formatting', () => {
  it('should format raw amount to display string', () => {
    expect(formatDogAmount(1234500000n)).toBe('12345.00000');
    expect(formatDogAmount(100000n)).toBe('1.00000');
    expect(formatDogAmount(0n)).toBe('0.00000');
    expect(formatDogAmount(1n)).toBe('0.00001');
    expect(formatDogAmount(99999n)).toBe('0.99999');
  });

  it('should parse display string to raw amount', () => {
    expect(parseDogAmount('12345.5')).toBe(1234550000n);
    expect(parseDogAmount('1')).toBe(100000n);
    expect(parseDogAmount('0.00001')).toBe(1n);
    expect(parseDogAmount('0')).toBe(0n);
  });

  it('should round-trip format/parse', () => {
    const values = [0n, 1n, 100000n, 1234567890n, 99999999999n];
    for (const val of values) {
      expect(parseDogAmount(formatDogAmount(val))).toBe(val);
    }
  });

  it('should truncate excess decimal places', () => {
    // parseDogAmount truncates to DOG_DECIMALS (5)
    expect(parseDogAmount('1.123456789')).toBe(parseDogAmount('1.12345'));
  });
});

// ==================== Runestone Building Tests ====================

describe('Runestone Building', () => {
  it('should build a valid single-edict Runestone', () => {
    const output = RuneBuilder.buildRunestoneOutput(DOG_RUNE_ID, 100000n, 1);
    expect(output).toBeInstanceOf(Buffer);

    // Must start with OP_RETURN (0x6a) + OP_13 (0x5d)
    expect(output[0]).toBe(0x6a);
    expect(output[1]).toBe(0x5d);

    // Should be parseable
    const parsed = RuneParser.parseRunestone(output);
    expect(parsed).not.toBeNull();
    expect(parsed!.edicts.length).toBe(1);
    expect(parsed!.edicts[0].runeId.block).toBe(DOG_RUNE_BLOCK);
    expect(parsed!.edicts[0].runeId.tx).toBe(DOG_RUNE_TX);
    expect(parsed!.edicts[0].amount).toBe(100000n);
    expect(parsed!.edicts[0].output).toBe(1);
  });

  it('should build Runestone with pointer', () => {
    const output = RuneBuilder.buildRunestoneWithPointer(DOG_RUNE_ID, 50000n, 1, 2);

    const parsed = RuneParser.parseRunestone(output);
    expect(parsed).not.toBeNull();
    expect(parsed!.pointer).toBe(2);
    expect(parsed!.edicts.length).toBe(1);
    expect(parsed!.edicts[0].amount).toBe(50000n);
    expect(parsed!.edicts[0].output).toBe(1);
  });

  it('should build commitment Runestone with two edicts (local/remote split)', () => {
    const localBalance = 70000n;
    const remoteBalance = 30000n;
    const output = RuneBuilder.buildCommitmentRunestone('test-channel', localBalance, remoteBalance);

    const parsed = RuneParser.parseRunestone(output);
    expect(parsed).not.toBeNull();
    expect(parsed!.edicts.length).toBe(2);

    // First edict: local balance -> output 1
    expect(parsed!.edicts[0].runeId.block).toBe(DOG_RUNE_BLOCK);
    expect(parsed!.edicts[0].runeId.tx).toBe(DOG_RUNE_TX);
    expect(parsed!.edicts[0].amount).toBe(localBalance);
    expect(parsed!.edicts[0].output).toBe(1);

    // Second edict: remote balance -> output 2 (delta-encoded, same rune)
    expect(parsed!.edicts[1].runeId.block).toBe(DOG_RUNE_BLOCK);
    expect(parsed!.edicts[1].runeId.tx).toBe(DOG_RUNE_TX);
    expect(parsed!.edicts[1].amount).toBe(remoteBalance);
    expect(parsed!.edicts[1].output).toBe(2);
  });

  it('should build multi-transfer Runestone with sorted edicts', () => {
    const transfers = [
      { runeId: '840001:1', amount: 500n, outputIndex: 2 },
      { runeId: '840000:3', amount: 1000n, outputIndex: 1 },
      { runeId: '840000:5', amount: 200n, outputIndex: 3 },
    ];

    const output = RuneBuilder.buildMultiTransferRunestone(transfers);
    const parsed = RuneParser.parseRunestone(output);
    expect(parsed).not.toBeNull();
    expect(parsed!.edicts.length).toBe(3);

    // Edicts should be sorted by rune ID (block, then tx)
    // 840000:3, 840000:5, 840001:1
    expect(parsed!.edicts[0].runeId.block).toBe(840000);
    expect(parsed!.edicts[0].runeId.tx).toBe(3);
    expect(parsed!.edicts[0].amount).toBe(1000n);

    expect(parsed!.edicts[1].runeId.block).toBe(840000);
    expect(parsed!.edicts[1].runeId.tx).toBe(5);
    expect(parsed!.edicts[1].amount).toBe(200n);

    expect(parsed!.edicts[2].runeId.block).toBe(840001);
    expect(parsed!.edicts[2].runeId.tx).toBe(1);
    expect(parsed!.edicts[2].amount).toBe(500n);
  });

  it('should reject empty transfer list', () => {
    expect(() => RuneBuilder.buildMultiTransferRunestone([])).toThrow('no transfers');
  });
});

// ==================== Runestone Round-Trip Tests ====================

describe('Runestone Round-Trip', () => {
  it('should round-trip single edict', () => {
    const amount = 123456789n;
    const output = RuneBuilder.buildRunestoneOutput(DOG_RUNE_ID, amount, 0);
    const parsed = RuneParser.parseRunestone(output);

    expect(parsed).not.toBeNull();
    expect(parsed!.edicts.length).toBe(1);
    expect(parsed!.edicts[0].amount).toBe(amount);
    expect(parsed!.edicts[0].runeId.block).toBe(DOG_RUNE_BLOCK);
    expect(parsed!.edicts[0].runeId.tx).toBe(DOG_RUNE_TX);
  });

  it('should round-trip commitment with zero balances', () => {
    const output = RuneBuilder.buildCommitmentRunestone('ch', 0n, 100000n);
    const parsed = RuneParser.parseRunestone(output);

    expect(parsed).not.toBeNull();
    expect(parsed!.edicts[0].amount).toBe(0n);
    expect(parsed!.edicts[1].amount).toBe(100000n);
  });

  it('should round-trip large amounts', () => {
    const largeAmount = 2n ** 53n - 1n; // MAX_SAFE_INTEGER as bigint
    const output = RuneBuilder.buildRunestoneOutput(DOG_RUNE_ID, largeAmount, 1);
    const parsed = RuneParser.parseRunestone(output);

    expect(parsed).not.toBeNull();
    expect(parsed!.edicts[0].amount).toBe(largeAmount);
  });

  it('should round-trip with various rune IDs', () => {
    const runeIds = ['0:0', '1:0', '840000:3', '999999:999'];
    for (const runeId of runeIds) {
      const output = RuneBuilder.buildRunestoneOutput(runeId, 1000n, 0);
      const parsed = RuneParser.parseRunestone(output);
      const { block, tx } = RuneParser.decodeRuneId(runeId);

      expect(parsed).not.toBeNull();
      expect(parsed!.edicts[0].runeId.block).toBe(block);
      expect(parsed!.edicts[0].runeId.tx).toBe(tx);
    }
  });
});

// ==================== Runestone Parser Edge Cases ====================

describe('Runestone Parser Edge Cases', () => {
  it('should return null for non-OP_RETURN script', () => {
    const buf = Buffer.from([0x76, 0xa9, 0x14]); // P2PKH prefix
    expect(RuneParser.parseRunestone(buf)).toBeNull();
  });

  it('should return null for OP_RETURN without OP_13', () => {
    const buf = Buffer.from([0x6a, 0x04, 0x01, 0x02, 0x03, 0x04]); // arbitrary OP_RETURN
    expect(RuneParser.parseRunestone(buf)).toBeNull();
  });

  it('should return null for buffer too short', () => {
    expect(RuneParser.parseRunestone(Buffer.from([0x6a]))).toBeNull();
    expect(RuneParser.parseRunestone(Buffer.from([]))).toBeNull();
  });

  it('should return null for empty Runestone (OP_RETURN OP_13 with no data pushes)', () => {
    // FINDING: Parser requires minimum 3 bytes (OP_RETURN + OP_13 + at least 1 push byte).
    // An empty Runestone (just OP_RETURN OP_13) returns null.
    // Per Runes spec, this SHOULD be a valid (no-op) Runestone.
    const buf = Buffer.from([0x6a, 0x5d]);
    const parsed = RuneParser.parseRunestone(buf);
    expect(parsed).toBeNull(); // Actual behavior (spec deviation)
  });

  it('should detect Runestone transactions by hex pattern', () => {
    expect(RuneParser.isRunestoneTransaction('00006a5d0100')).toBe(true);
    expect(RuneParser.isRunestoneTransaction('00006a040102')).toBe(false);
  });
});

// ==================== Known Mainnet Runestone Verification ====================

describe('Runestone Protocol Conformance', () => {
  it('should encode DOG rune body tag as 0x00 (Body = 0)', () => {
    // The Body tag in the Runes protocol is 0
    const bodyTag = encodeLEB128(BigInt(RunestoneTag.Body));
    expect(bodyTag.length).toBe(1);
    expect(bodyTag[0]).toBe(0x00);
  });

  it('should encode Pointer tag as 22 (0x16)', () => {
    const pointerTag = encodeLEB128(BigInt(RunestoneTag.Pointer));
    expect(pointerTag.length).toBe(1);
    expect(pointerTag[0]).toBe(0x16);
  });

  it('should encode Mint tag as 20 (0x14)', () => {
    const mintTag = encodeLEB128(BigInt(RunestoneTag.Mint));
    expect(mintTag.length).toBe(1);
    expect(mintTag[0]).toBe(0x14);
  });

  it('should produce correct byte layout for DOG transfer', () => {
    // A transfer of 1 DOG (100000 raw) to output 1
    const output = RuneBuilder.buildRunestoneOutput(DOG_RUNE_ID, 100000n, 1);

    // Expected structure:
    // OP_RETURN (0x6a) + OP_13 (0x5d) + push_length + payload
    expect(output[0]).toBe(0x6a);
    expect(output[1]).toBe(0x5d);

    // Parse and verify
    const parsed = RuneParser.parseRunestone(output);
    expect(parsed).not.toBeNull();
    expect(parsed!.edicts[0].runeId.block).toBe(840000);
    expect(parsed!.edicts[0].runeId.tx).toBe(3);
    expect(parsed!.edicts[0].amount).toBe(100000n);
    expect(parsed!.edicts[0].output).toBe(1);
  });

  it('should use delta encoding correctly in multi-edict Runestones', () => {
    // Two edicts for the same rune: delta should be 0:0
    const output = RuneBuilder.buildCommitmentRunestone('ch', 50000n, 50000n);
    const parsed = RuneParser.parseRunestone(output);

    expect(parsed).not.toBeNull();
    expect(parsed!.edicts.length).toBe(2);
    // Both should resolve to the same rune ID after delta decoding
    expect(parsed!.edicts[0].runeId.block).toBe(parsed!.edicts[1].runeId.block);
    expect(parsed!.edicts[0].runeId.tx).toBe(parsed!.edicts[1].runeId.tx);
  });

  it('should handle data push encoding for payloads ≤75 bytes', () => {
    // Small payload: should use direct push (opcode = length)
    const output = RuneBuilder.buildRunestoneOutput(DOG_RUNE_ID, 1n, 0);
    // After OP_RETURN (0x6a) + OP_13 (0x5d), the next byte is the push length
    const pushLen = output[2];
    expect(pushLen).toBeLessThanOrEqual(0x4b); // Direct push max
    expect(pushLen).toBe(output.length - 3); // Total - 3 header bytes
  });
});
