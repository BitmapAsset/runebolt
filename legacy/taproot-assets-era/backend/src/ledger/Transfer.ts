/**
 * Transfer type definitions and validation schemas.
 */

import { z } from 'zod';

export interface Transfer {
  id: string;
  fromChannel: string;
  toChannel: string;
  amount: bigint;
  memo: string | null;
  nonce: string; // REQUIRED - prevents replay
  clientSignature: string; // REQUIRED - client signs transfer
  transferHash: string; // Hash of transfer details
  createdAt: string;
}

export interface TransferRequest {
  fromChannelId: string;
  toChannelId?: string;
  recipientPubkey?: string;
  amount: bigint;
  memo?: string;
  nonce: string; // REQUIRED - prevents replay
  signature: string; // REQUIRED - client signature
}

/**
 * Zod schema for transfer request body validation.
 */
export const TransferRequestSchema = z
  .object({
    fromChannelId: z.string().uuid('Invalid fromChannelId format'),
    toChannelId: z.string().uuid('Invalid toChannelId format').optional(),
    recipientPubkey: z
      .string()
      .min(64, 'Public key must be at least 64 characters')
      .max(66, 'Public key must be at most 66 characters')
      .optional(),
    amount: z.string().regex(/^\d+$/, 'Amount must be a numeric string'),
    memo: z.string().max(256, 'Memo must be 256 characters or less').optional(),
    nonce: z.string().uuid(), // REQUIRED - prevents replay attacks
    signature: z.string().min(128, 'Signature must be at least 128 characters'), // REQUIRED - client signature
  })
  .refine((data) => data.toChannelId || data.recipientPubkey, {
    message: 'Either toChannelId or recipientPubkey must be provided',
  });

/**
 * Serialize a Transfer for JSON responses (bigints -> strings).
 */
export function transferToJson(transfer: Transfer): Record<string, unknown> {
  return {
    id: transfer.id,
    fromChannel: transfer.fromChannel,
    toChannel: transfer.toChannel,
    amount: transfer.amount.toString(),
    memo: transfer.memo,
    nonce: transfer.nonce,
    transferHash: transfer.transferHash,
    createdAt: transfer.createdAt,
  };
}
