/**
 * Security Configuration for RuneBolt
 */

export function validateSecurityConfig(): void {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  if (jwtSecret === 'change_me_in_production') {
    throw new Error('JWT_SECRET cannot use default placeholder');
  }
}

export const rateLimits = {
  auth: { windowMs: 15 * 60 * 1000, max: 5 },
  transfer: { windowMs: 60 * 1000, max: 30 },
  general: { windowMs: 60 * 1000, max: 100 },
};

export const channelLimits = {
  minCapacity: BigInt(100000),
  maxCapacity: BigInt(100000000000000),
};
