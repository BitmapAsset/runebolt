import dotenv from 'dotenv';
import path from 'path';
import { BridgeConfig } from '../types';

dotenv.config();

function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

export function loadConfig(): BridgeConfig {
  return {
    network: env('BITCOIN_NETWORK', 'regtest') as BridgeConfig['network'],
    mode: env('BRIDGE_MODE', 'custodial') as BridgeConfig['mode'],
    bitcoin: {
      rpcUrl: env('BITCOIN_RPC_URL', 'http://localhost:18443'),
      rpcUser: env('BITCOIN_RPC_USER', 'bitcoin'),
      rpcPass: env('BITCOIN_RPC_PASS', 'bitcoin'),
    },
    lightning: {
      lndHost: env('LND_HOST', 'localhost'),
      lndPort: parseInt(env('LND_PORT', '10009')),
      tlsCertPath: env('LND_TLS_CERT', path.join(process.env.HOME || '', '.lnd/tls.cert')),
      macaroonPath: env('LND_MACAROON', path.join(process.env.HOME || '', '.lnd/data/chain/bitcoin/regtest/admin.macaroon')),
    },
    indexer: {
      ordApiUrl: env('ORD_API_URL', 'http://localhost:80'),
      unisatApiUrl: env('UNISAT_API_URL', 'https://open-api.unisat.io'),
      unisatApiKey: env('UNISAT_API_KEY', ''),
    },
    bridge: {
      htlcTimeoutBlocks: parseInt(env('HTLC_TIMEOUT_BLOCKS', '144')),
      minSwapAmount: BigInt(env('MIN_SWAP_AMOUNT', '1000')),
      maxSwapAmount: BigInt(env('MAX_SWAP_AMOUNT', '100000000')),
      feeRateBps: parseInt(env('FEE_RATE_BPS', '50')),
      bridgeAddress: env('BRIDGE_ADDRESS', ''),
      bridgePrivkeyPath: env('BRIDGE_PRIVKEY_PATH', ''),
    },
    server: {
      port: parseInt(env('SERVER_PORT', '3000')),
      host: env('SERVER_HOST', '0.0.0.0'),
      corsOrigins: env('CORS_ORIGINS', '*').split(','),
    },
  };
}
