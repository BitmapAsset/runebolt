/**
 * Channel reserve calculations and validation.
 *
 * Reserves ensure that each channel always retains a minimum balance,
 * preventing dust channels and providing a security margin for
 * dispute resolution.
 *
 * RESERVE POLICY: 1% of channel capacity is unspendable.
 */

/** Reserve percentage as basis points (100 = 1%) */
const RESERVE_BASIS_POINTS = 100n;
const BASIS_POINTS_DENOMINATOR = 10_000n;

/**
 * Calculate the reserve amount for a given channel capacity.
 * Reserve = 1% of capacity (rounded up to prevent zero reserves).
 */
export function calculateReserve(capacity: bigint): bigint {
  const reserve = (capacity * RESERVE_BASIS_POINTS + BASIS_POINTS_DENOMINATOR - 1n) / BASIS_POINTS_DENOMINATOR;
  // Minimum reserve of 1 unit to prevent zero-reserve edge case
  return reserve < 1n ? 1n : reserve;
}

/**
 * Validate that a transfer does not violate the channel reserve.
 * Returns true if the transfer is allowed, false otherwise.
 */
export function validateTransferAgainstReserve(
  localBalance: bigint,
  capacity: bigint,
  transferAmount: bigint
): boolean {
  const reserve = calculateReserve(capacity);
  return (localBalance - transferAmount) >= reserve;
}

/**
 * Get the spendable balance for a channel (capacity minus reserve).
 * This is the maximum amount a user can transfer out.
 */
export function getSpendableBalance(localBalance: bigint, capacity: bigint): bigint {
  const reserve = calculateReserve(capacity);
  if (localBalance <= reserve) return 0n;
  return localBalance - reserve;
}
