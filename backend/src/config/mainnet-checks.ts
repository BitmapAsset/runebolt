/**
 * Mainnet startup validation checks.
 * Runs on boot to verify the server is correctly configured for production.
 */

import { getCache } from '../cache/RedisCache';

interface CheckResult {
  name: string;
  passed: boolean;
  critical: boolean;
  message: string;
}

const VERSION = '0.2.0';

/**
 * Run all mainnet startup checks.
 * Returns false if any CRITICAL check failed (server should not start).
 */
export async function runMainnetChecks(): Promise<boolean> {
  const network = process.env.BITCOIN_NETWORK || 'not set';
  const isProduction = process.env.NODE_ENV === 'production';

  const results: CheckResult[] = [];

  // 1. BITCOIN_NETWORK check
  if (!process.env.BITCOIN_NETWORK) {
    results.push({
      name: 'BITCOIN_NETWORK',
      passed: false,
      critical: false,
      message: 'BITCOIN_NETWORK is not set (defaults to mainnet)',
    });
  } else if (process.env.BITCOIN_NETWORK !== 'mainnet' && isProduction) {
    results.push({
      name: 'BITCOIN_NETWORK',
      passed: false,
      critical: true,
      message: `BITCOIN_NETWORK is "${process.env.BITCOIN_NETWORK}" in production — expected "mainnet"`,
    });
  } else {
    results.push({
      name: 'BITCOIN_NETWORK',
      passed: true,
      critical: false,
      message: `Network: ${process.env.BITCOIN_NETWORK}`,
    });
  }

  // 2. JWT_SECRET length check
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    results.push({
      name: 'JWT_SECRET',
      passed: false,
      critical: true,
      message: `JWT_SECRET is ${jwtSecret.length} bytes — must be at least 32`,
    });
  } else {
    results.push({
      name: 'JWT_SECRET',
      passed: true,
      critical: false,
      message: `JWT_SECRET: ${jwtSecret.length} bytes`,
    });
  }

  // 3. DATABASE_URL — not using default password
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    results.push({
      name: 'DATABASE_URL',
      passed: false,
      critical: true,
      message: 'DATABASE_URL is not set',
    });
  } else if (isProduction && (dbUrl.includes(':runebolt@') || dbUrl.includes(':CHANGE_ME@') || dbUrl.includes(':password@'))) {
    results.push({
      name: 'DATABASE_URL',
      passed: false,
      critical: true,
      message: 'DATABASE_URL appears to use a default password in production',
    });
  } else {
    results.push({
      name: 'DATABASE_URL',
      passed: true,
      critical: false,
      message: 'DATABASE_URL: configured',
    });
  }

  // 4. CORS_ORIGIN — not wildcard in production
  const corsOrigin = process.env.CORS_ORIGIN || '';
  if (isProduction && (!corsOrigin || corsOrigin === '*')) {
    results.push({
      name: 'CORS_ORIGIN',
      passed: false,
      critical: true,
      message: 'CORS_ORIGIN must not be wildcard (*) or empty in production',
    });
  } else {
    results.push({
      name: 'CORS_ORIGIN',
      passed: true,
      critical: false,
      message: `CORS_ORIGIN: ${corsOrigin || '(dev mode, permissive)'}`,
    });
  }

  // 5. Redis reachability
  try {
    const cache = getCache();
    const redisOk = cache.connected();
    results.push({
      name: 'REDIS',
      passed: redisOk,
      critical: false,
      message: redisOk ? 'Redis: connected' : 'Redis: not connected (caching disabled)',
    });
  } catch {
    results.push({
      name: 'REDIS',
      passed: false,
      critical: false,
      message: 'Redis: connection check failed',
    });
  }

  // Print startup banner
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const criticalFailures = results.filter((r) => !r.passed && r.critical);

  console.log('');
  console.log('='.repeat(60));
  console.log(`  RuneBolt v${VERSION} — Startup Checks`);
  console.log(`  Network: ${network}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));

  for (const r of results) {
    const icon = r.passed ? 'PASS' : r.critical ? 'FAIL' : 'WARN';
    console.log(`  [${icon}] ${r.message}`);
  }

  console.log('-'.repeat(60));
  console.log(`  Checks: ${passed}/${total} passed`);

  if (criticalFailures.length > 0) {
    console.log(`  CRITICAL: ${criticalFailures.length} check(s) failed — server will NOT start`);
    console.log('='.repeat(60));
    console.log('');
    return false;
  }

  console.log(`  Status: ready`);
  console.log('='.repeat(60));
  console.log('');
  return true;
}
