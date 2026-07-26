/**
 * Builder for Runestone OP_RETURN outputs.
 *
 * Creates valid OP_RETURN scripts encoding Rune protocol operations
 * into Bitcoin transactions using LEB128 varint encoding and
 * delta-encoded edict sequences per the Runes protocol specification.
 *
 * Wire format:
 *   OP_RETURN (0x6a) | OP_13 (0x5d) | <data pushes containing LEB128 payload>
 *
 * Payload structure:
 *   [tag-value pairs...] [Body tag (0)] [edicts as delta-encoded quadruples...]
 */

import { DOG_RUNE_ID } from './RuneConstants';
import { RuneParser, RunestoneTag } from './RuneParser';

/**
 * Encode an unsigned integer as LEB128 (Little Endian Base 128).
 * Used throughout the Runes protocol for compact integer encoding.
 */
export function encodeLEB128(value: bigint): Buffer {
  if (value < 0n) {
    throw new Error('LEB128 encoding does not support negative values');
  }
  const bytes: number[] = [];
  do {
    let byte = Number(value & 0x7fn);
    value >>= 7n;
    if (value !== 0n) byte |= 0x80;
    bytes.push(byte);
  } while (value !== 0n);
  return Buffer.from(bytes);
}

/**
 * Wrap a raw Runestone payload in a valid OP_RETURN script.
 * The payload is split into data pushes as required by Bitcoin script rules.
 *
 * Returns a complete scriptPubKey: OP_RETURN OP_13 <push data...>
 */
function wrapInOpReturn(payload: Buffer): Buffer {
  const parts: Buffer[] = [
    Buffer.from([0x6a]), // OP_RETURN
    Buffer.from([0x5d]), // OP_13 (Runestone protocol tag)
  ];

  // Push the payload using minimal push encoding
  // Bitcoin script allows pushes up to 520 bytes per push
  const MAX_PUSH = 520;
  let offset = 0;

  while (offset < payload.length) {
    const remaining = payload.length - offset;
    const chunkLen = Math.min(remaining, MAX_PUSH);
    const chunk = payload.subarray(offset, offset + chunkLen);

    if (chunkLen <= 0x4b) {
      // Direct push: length byte IS the opcode
      parts.push(Buffer.from([chunkLen]));
    } else if (chunkLen <= 0xff) {
      // OP_PUSHDATA1
      parts.push(Buffer.from([0x4c, chunkLen]));
    } else {
      // OP_PUSHDATA2
      parts.push(Buffer.from([0x4d, chunkLen & 0xff, (chunkLen >> 8) & 0xff]));
    }
    parts.push(chunk);
    offset += chunkLen;
  }

  return Buffer.concat(parts);
}

export class RuneBuilder {
  /**
   * Build an OP_RETURN output containing a Runestone that transfers
   * a specified amount of a rune to a given output index.
   *
   * The edict directs `amount` of `runeId` to transaction output `destinationIndex`.
   */
  static buildRunestoneOutput(
    runeId: string,
    amount: bigint,
    destinationIndex: number
  ): Buffer {
    const { block, tx } = RuneParser.decodeRuneId(runeId);

    // Build payload: Body tag followed by a single edict
    // Edict format: [block, tx, amount, output] — all LEB128 encoded
    // First edict uses absolute values (no prior edict to delta from)
    const payload = Buffer.concat([
      encodeLEB128(BigInt(RunestoneTag.Body)), // Body tag = 0
      encodeLEB128(BigInt(block)),             // block (absolute, first edict)
      encodeLEB128(BigInt(tx)),                // tx (absolute, first edict)
      encodeLEB128(amount),                    // amount
      encodeLEB128(BigInt(destinationIndex)),   // output index
    ]);

    return wrapInOpReturn(payload);
  }

  /**
   * Build a Runestone with a Pointer field and a single edict.
   * The Pointer directs any unallocated runes to the specified output.
   */
  static buildRunestoneWithPointer(
    runeId: string,
    amount: bigint,
    destinationIndex: number,
    pointerIndex: number
  ): Buffer {
    const { block, tx } = RuneParser.decodeRuneId(runeId);

    const payload = Buffer.concat([
      // Pointer tag-value pair
      encodeLEB128(BigInt(RunestoneTag.Pointer)),
      encodeLEB128(BigInt(pointerIndex)),
      // Body tag then edict
      encodeLEB128(BigInt(RunestoneTag.Body)),
      encodeLEB128(BigInt(block)),
      encodeLEB128(BigInt(tx)),
      encodeLEB128(amount),
      encodeLEB128(BigInt(destinationIndex)),
    ]);

    return wrapInOpReturn(payload);
  }

  /**
   * Build a Runestone for a channel commitment/closing transaction.
   * Encodes two edicts splitting rune amounts between user and hub outputs.
   *
   * Output layout:
   *   Output 0: OP_RETURN (Runestone) — value 0
   *   Output 1: User's rune balance — dust (546 sats)
   *   Output 2: Hub's rune balance — dust (546 sats)
   *
   * The edicts use delta encoding: the second edict's rune ID is
   * encoded as the delta from the first (0:0 for the same rune).
   */
  static buildCommitmentRunestone(
    _channelId: string,
    localBalance: bigint,
    remoteBalance: bigint
  ): Buffer {
    const { block, tx } = RuneParser.decodeRuneId(DOG_RUNE_ID);

    const edictParts: Buffer[] = [];

    // Edict 1: localBalance -> output 1 (user)
    // First edict: absolute rune ID
    edictParts.push(encodeLEB128(BigInt(block)));  // block (absolute)
    edictParts.push(encodeLEB128(BigInt(tx)));     // tx (absolute)
    edictParts.push(encodeLEB128(localBalance));   // amount
    edictParts.push(encodeLEB128(1n));             // output index 1

    // Edict 2: remoteBalance -> output 2 (hub)
    // Delta from previous edict: same rune, so delta = 0:0
    edictParts.push(encodeLEB128(0n));             // block delta = 0
    edictParts.push(encodeLEB128(0n));             // tx delta = 0
    edictParts.push(encodeLEB128(remoteBalance));  // amount
    edictParts.push(encodeLEB128(2n));             // output index 2

    const payload = Buffer.concat([
      encodeLEB128(BigInt(RunestoneTag.Body)),    // Body tag
      ...edictParts,
    ]);

    return wrapInOpReturn(payload);
  }

  /**
   * Build a Runestone for batched multi-transfer operations.
   * Each transfer specifies a rune ID, amount, and destination output index.
   *
   * Edicts are sorted by rune ID (block, then tx) for canonical encoding,
   * then delta-encoded.
   */
  static buildMultiTransferRunestone(
    transfers: Array<{
      runeId: string;
      amount: bigint;
      outputIndex: number;
    }>
  ): Buffer {
    if (transfers.length === 0) {
      throw new Error('Cannot build Runestone with no transfers');
    }

    // Parse and sort by rune ID for canonical ordering
    const parsed = transfers.map((t) => ({
      ...RuneParser.decodeRuneId(t.runeId),
      amount: t.amount,
      outputIndex: t.outputIndex,
    }));
    parsed.sort((a, b) => a.block - b.block || a.tx - b.tx);

    const edictParts: Buffer[] = [];
    let prevBlock = 0;
    let prevTx = 0;

    for (const edict of parsed) {
      const blockDelta = edict.block - prevBlock;
      const txDelta = blockDelta !== 0 ? edict.tx : edict.tx - prevTx;

      edictParts.push(encodeLEB128(BigInt(blockDelta)));
      edictParts.push(encodeLEB128(BigInt(txDelta)));
      edictParts.push(encodeLEB128(edict.amount));
      edictParts.push(encodeLEB128(BigInt(edict.outputIndex)));

      prevBlock = edict.block;
      prevTx = edict.tx;
    }

    const payload = Buffer.concat([
      encodeLEB128(BigInt(RunestoneTag.Body)),
      ...edictParts,
    ]);

    return wrapInOpReturn(payload);
  }
}
