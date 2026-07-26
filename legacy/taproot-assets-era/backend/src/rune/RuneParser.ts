/**
 * Parser for Runestone data embedded in Bitcoin transaction outputs.
 *
 * Runestones are OP_RETURN outputs that encode Rune protocol operations
 * (etching, minting, transferring) using LEB128 varint encoding with
 * tag-value pairs and delta-encoded edict sequences.
 */

/** Runestone protocol tags */
export const enum RunestoneTag {
  Body = 0,
  Flags = 2,
  Rune = 4,
  Premine = 6,
  Cap = 8,
  Amount = 10,
  HeightStart = 12,
  HeightEnd = 14,
  OffsetStart = 16,
  OffsetEnd = 18,
  Mint = 20,
  Pointer = 22,
  Cenotaph = 126,
}

export interface RunestoneData {
  edicts: RuneEdict[];
  etching: RuneEtching | null;
  mint: RuneMint | null;
  pointer: number | null;
}

export interface RuneEdict {
  runeId: { block: number; tx: number };
  amount: bigint;
  output: number;
}

export interface RuneEtching {
  rune: string | null;
  divisibility: number;
  spacers: number;
  symbol: string | null;
  premine: bigint;
}

export interface RuneMint {
  runeId: { block: number; tx: number };
  amount: bigint;
}

/**
 * Decode a LEB128-encoded unsigned integer from a buffer.
 * Returns the decoded bigint value and the number of bytes consumed.
 */
export function decodeLEB128(
  buffer: Buffer,
  offset: number
): { value: bigint; bytesRead: number } {
  let value = 0n;
  let shift = 0n;
  let bytesRead = 0;

  while (offset + bytesRead < buffer.length) {
    const byte = buffer[offset + bytesRead];
    bytesRead++;

    value |= BigInt(byte & 0x7f) << shift;
    shift += 7n;

    if ((byte & 0x80) === 0) {
      return { value, bytesRead };
    }

    // Guard against excessively long encodings (max 18 bytes for u128)
    if (bytesRead > 18) {
      throw new Error('LEB128 encoding too long');
    }
  }

  throw new Error('Unexpected end of buffer while decoding LEB128');
}

export class RuneParser {
  /**
   * Parse a Runestone from a scriptPubKey buffer.
   * Expects a script starting with OP_RETURN (0x6a) + OP_13 (0x5d).
   */
  static parseRunestone(scriptPubKey: Buffer): RunestoneData | null {
    // Minimum: OP_RETURN + OP_13 + at least 1 data push
    if (scriptPubKey.length < 3) {
      return null;
    }

    // Validate OP_RETURN + OP_13 prefix
    if (scriptPubKey[0] !== 0x6a) {
      return null;
    }

    // Find OP_13 (0x5d) — it may follow OP_RETURN directly or after pushdata
    let payloadStart = -1;
    let pos = 1;

    if (scriptPubKey[pos] === 0x5d) {
      // OP_RETURN OP_13 — standard Runestone prefix
      pos++;
      payloadStart = pos;
    } else {
      return null;
    }

    // Extract payload: parse script data pushes after OP_13
    const payload = this.extractPayload(scriptPubKey, payloadStart);
    if (payload.length === 0) {
      return { edicts: [], etching: null, mint: null, pointer: null };
    }

    // Parse tag-value pairs and edicts from the payload
    return this.decodePayload(payload);
  }

  /**
   * Extract the concatenated payload from script data pushes.
   */
  private static extractPayload(script: Buffer, start: number): Buffer {
    const chunks: Buffer[] = [];
    let pos = start;

    while (pos < script.length) {
      const opcode = script[pos];
      pos++;

      if (opcode >= 0x01 && opcode <= 0x4b) {
        // Direct push: opcode is the length
        const len = opcode;
        if (pos + len > script.length) break;
        chunks.push(script.subarray(pos, pos + len));
        pos += len;
      } else if (opcode === 0x4c) {
        // OP_PUSHDATA1
        if (pos >= script.length) break;
        const len = script[pos];
        pos++;
        if (pos + len > script.length) break;
        chunks.push(script.subarray(pos, pos + len));
        pos += len;
      } else if (opcode === 0x4d) {
        // OP_PUSHDATA2
        if (pos + 2 > script.length) break;
        const len = script[pos] | (script[pos + 1] << 8);
        pos += 2;
        if (pos + len > script.length) break;
        chunks.push(script.subarray(pos, pos + len));
        pos += len;
      } else if (opcode === 0x4e) {
        // OP_PUSHDATA4
        if (pos + 4 > script.length) break;
        const len =
          script[pos] |
          (script[pos + 1] << 8) |
          (script[pos + 2] << 16) |
          (script[pos + 3] << 24);
        pos += 4;
        if (pos + len > script.length) break;
        chunks.push(script.subarray(pos, pos + len));
        pos += len;
      } else {
        // Non-push opcode — stop parsing
        break;
      }
    }

    return Buffer.concat(chunks);
  }

  /**
   * Decode the Runestone payload into structured data.
   */
  private static decodePayload(payload: Buffer): RunestoneData {
    const edicts: RuneEdict[] = [];
    let pointer: number | null = null;
    let mintBlock: bigint | null = null;
    let mintTx: bigint | null = null;

    let offset = 0;
    let inBody = false;

    while (offset < payload.length) {
      const tagResult = decodeLEB128(payload, offset);
      offset += tagResult.bytesRead;
      const tag = Number(tagResult.value);

      if (tag === RunestoneTag.Body) {
        inBody = true;
        // After the Body tag, remaining data is edicts as quadruples
        break;
      }

      // Read the value for this tag
      if (offset >= payload.length) break;
      const valResult = decodeLEB128(payload, offset);
      offset += valResult.bytesRead;

      switch (tag) {
        case RunestoneTag.Pointer:
          pointer = Number(valResult.value);
          break;
        case RunestoneTag.Mint:
          // Mint tag appears twice: first for block, second for tx
          if (mintBlock === null) {
            mintBlock = valResult.value;
          } else {
            mintTx = valResult.value;
          }
          break;
        // Other tags (Flags, Rune, etc.) are not needed for transfer parsing
        default:
          break;
      }
    }

    // Parse edicts (after Body tag)
    if (inBody) {
      let prevBlock = 0;
      let prevTx = 0;

      while (offset + 3 <= payload.length) {
        // Each edict is 4 LEB128 values: block_delta, tx_delta, amount, output
        const blockDelta = decodeLEB128(payload, offset);
        offset += blockDelta.bytesRead;
        if (offset >= payload.length) break;

        const txDelta = decodeLEB128(payload, offset);
        offset += txDelta.bytesRead;
        if (offset >= payload.length) break;

        const amount = decodeLEB128(payload, offset);
        offset += amount.bytesRead;
        if (offset >= payload.length) break;

        const output = decodeLEB128(payload, offset);
        offset += output.bytesRead;

        // Delta decoding: if block delta is non-zero, tx resets to delta value
        const blockDeltaNum = Number(blockDelta.value);
        const txDeltaNum = Number(txDelta.value);

        let block: number;
        let tx: number;
        if (blockDeltaNum !== 0) {
          block = prevBlock + blockDeltaNum;
          tx = txDeltaNum;
        } else {
          block = prevBlock;
          tx = prevTx + txDeltaNum;
        }

        edicts.push({
          runeId: { block, tx },
          amount: amount.value,
          output: Number(output.value),
        });

        prevBlock = block;
        prevTx = tx;
      }
    }

    const mint: RuneMint | null =
      mintBlock !== null && mintTx !== null
        ? {
            runeId: { block: Number(mintBlock), tx: Number(mintTx) },
            amount: 0n, // Mint amount comes from the rune's terms, not the runestone
          }
        : null;

    return {
      edicts,
      etching: null, // Etching parsing not needed for channel operations
      mint,
      pointer,
    };
  }

  /**
   * Parse a Runestone from a raw transaction hex.
   * Scans all outputs for an OP_RETURN with the Runestone OP_13 tag.
   */
  static parseRunestoneFromTxHex(txHex: string): RunestoneData | null {
    const txBuf = Buffer.from(txHex, 'hex');

    // Scan for OP_RETURN (0x6a) followed by OP_13 (0x5d)
    for (let i = 0; i < txBuf.length - 2; i++) {
      if (txBuf[i] === 0x6a && txBuf[i + 1] === 0x5d) {
        // Found potential Runestone output script
        // Try to find the script boundaries — for simplicity, parse from this point
        const scriptBuf = txBuf.subarray(i);
        const result = this.parseRunestone(scriptBuf);
        if (result && (result.edicts.length > 0 || result.mint || result.pointer !== null)) {
          return result;
        }
      }
    }

    return null;
  }

  /**
   * Decode a rune ID string (e.g., "840000:3") into block and tx components.
   */
  static decodeRuneId(encoded: string): { block: number; tx: number } {
    const parts = encoded.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid rune ID format: ${encoded}. Expected "block:tx"`);
    }

    const block = parseInt(parts[0], 10);
    const tx = parseInt(parts[1], 10);

    if (isNaN(block) || isNaN(tx)) {
      throw new Error(`Invalid rune ID components: ${encoded}`);
    }

    return { block, tx };
  }

  /**
   * Encode block and tx into a rune ID string.
   */
  static encodeRuneId(block: number, tx: number): string {
    return `${block}:${tx}`;
  }

  /**
   * Validate that a hex string represents a plausible Runestone transaction.
   */
  static isRunestoneTransaction(txHex: string): boolean {
    // Runestone protocol tag bytes (OP_RETURN OP_13)
    return txHex.includes('6a5d');
  }
}
