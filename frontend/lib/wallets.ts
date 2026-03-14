/**
 * Wallet Connection Library — Unisat & Xverse Integration
 * Handles browser wallet detection, connection, and transaction signing
 */

// Type declarations for window object
declare global {
  interface Window {
    unisat?: UniSatWallet;
    xverse?: XverseWallet;
    leather?: LeatherWallet;
    okxwallet?: OKXWallet;
  }
}

// Wallet Types
export type WalletType = 'unisat' | 'xverse' | 'leather' | 'okx';

export interface WalletInfo {
  id: WalletType;
  name: string;
  icon: string;
  description: string;
  installed: boolean;
  website: string;
}

export interface WalletAccount {
  address: string;
  publicKey: string;
  compressedPublicKey: string;
}

export interface WalletConnection {
  wallet: WalletType;
  account: WalletAccount;
  network: 'mainnet' | 'testnet' | 'regtest';
}

// UniSat Wallet Interface
interface UniSatWallet {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string>;
  getNetwork(): Promise<'livenet' | 'testnet'>;
  switchNetwork(network: 'livenet' | 'testnet'): Promise<void>;
  sendBitcoin(toAddress: string, amount: number, options?: { feeRate?: number }): Promise<string>;
  signPsbt(psbtHex: string, options?: { autoFinalized?: boolean }): Promise<string>;
  signPsbts(psbtHexs: string[]): Promise<string[]>;
  signMessage(message: string, type?: 'ecdsa' | 'bip322-simple'): Promise<string>;
  pushPsbt(psbtHex: string): Promise<string>;
  getBalance(): Promise<{ confirmed: number; unconfirmed: number; total: number }>;
  getInscriptions(cursor?: number, size?: number): Promise<any>;
  getRunes(cursor?: number, size?: number): Promise<any>;
  on(event: 'accountsChanged' | 'networkChanged', callback: (data: any) => void): void;
  removeListener(event: string, callback: (data: any) => void): void;
}

// Xverse Wallet Interface
interface XverseWallet {
  connect(): Promise<{ addresses: Array<{ address: string; publicKey: string; addressType: string }> }>;
  request(method: string, params: any): Promise<any>;
  signPsbt(params: { psbt: string; signInputs: number[] }): Promise<{ psbt: string }>;
  signMessage(params: { message: string; address: string }): Promise<string>;
  sendBtc(params: { recipients: Array<{ address: string; amount: number }>; senderAddress: string }): Promise<string>;
}

// Leather Wallet Interface
interface LeatherWallet {
  authenticate(): Promise<any>;
  request(method: string, params: any): Promise<any>;
}

// OKX Wallet Interface
interface OKXWallet {
  bitcoin?: {
    connect(): Promise<{ address: string; publicKey: string }>;
    signPsbt(psbtHex: string): Promise<string>;
    signMessage(message: string): Promise<string>;
    sendBitcoin(toAddress: string, amount: number): Promise<string>;
  };
}

// Wallet registry
export const WALLET_REGISTRY: WalletInfo[] = [
  {
    id: 'unisat',
    name: 'UniSat',
    icon: '🔶',
    description: 'Most popular Bitcoin wallet for Runes & Ordinals',
    installed: false,
    website: 'https://unisat.io',
  },
  {
    id: 'xverse',
    name: 'Xverse',
    icon: '🌐',
    description: 'Mobile & desktop Bitcoin wallet with Bitcoin L2 support',
    installed: false,
    website: 'https://xverse.app',
  },
  {
    id: 'leather',
    name: 'Leather',
    icon: '🦊',
    description: 'Stacks & Bitcoin wallet (formerly Hiro)',
    installed: false,
    website: 'https://leather.io',
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '🔵',
    description: 'Multi-chain exchange wallet with Bitcoin support',
    installed: false,
    website: 'https://www.okx.com/web3',
  },
];

// Check if a wallet is installed
export function isWalletInstalled(type: WalletType): boolean {
  if (typeof window === 'undefined') return false;
  
  switch (type) {
    case 'unisat':
      return !!window.unisat;
    case 'xverse':
      return !!window.xverse;
    case 'leather':
      return !!window.leather;
    case 'okx':
      return !!window.okxwallet?.bitcoin;
    default:
      return false;
  }
}

// Get all wallet info with installation status
export function getWallets(): WalletInfo[] {
  return WALLET_REGISTRY.map(wallet => ({
    ...wallet,
    installed: isWalletInstalled(wallet.id),
  }));
}

// Get the first installed wallet
export function getFirstInstalledWallet(): WalletInfo | null {
  const wallets = getWallets();
  return wallets.find(w => w.installed) || null;
}

// Connect to UniSat wallet
async function connectUniSat(): Promise<WalletConnection> {
  if (!window.unisat) {
    throw new Error('UniSat wallet not installed');
  }

  try {
    // Request accounts
    const accounts = await window.unisat.requestAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found in UniSat');
    }

    const address = accounts[0];
    const publicKey = await window.unisat.getPublicKey();
    const network = await window.unisat.getNetwork();

    // Convert network format
    const networkType: 'mainnet' | 'testnet' | 'regtest' = 
      network === 'livenet' ? 'mainnet' : 'testnet';

    return {
      wallet: 'unisat',
      account: {
        address,
        publicKey,
        compressedPublicKey: publicKey,
      },
      network: networkType,
    };
  } catch (error: any) {
    throw new Error(`UniSat connection failed: ${error.message}`);
  }
}

// Connect to Xverse wallet
async function connectXverse(): Promise<WalletConnection> {
  if (!window.xverse) {
    throw new Error('Xverse wallet not installed');
  }

  try {
    const result = await window.xverse.connect();
    if (!result.addresses || result.addresses.length === 0) {
      throw new Error('No addresses found in Xverse');
    }

    // Get the first taproot or native segwit address
    const btcAddress = result.addresses.find(
      a => a.addressType === 'p2tr' || a.addressType === 'p2wpkh'
    ) || result.addresses[0];

    return {
      wallet: 'xverse',
      account: {
        address: btcAddress.address,
        publicKey: btcAddress.publicKey,
        compressedPublicKey: btcAddress.publicKey,
      },
      network: 'mainnet', // Xverse auto-detects or user selects
    };
  } catch (error: any) {
    throw new Error(`Xverse connection failed: ${error.message}`);
  }
}

// Connect to Leather wallet
async function connectLeather(): Promise<WalletConnection> {
  if (!window.leather) {
    throw new Error('Leather wallet not installed');
  }

  try {
    const result = await window.leather.authenticate();
    // Leather returns different format, adapt as needed
    const address = result.addresses?.[0]?.address || '';
    const publicKey = result.addresses?.[0]?.publicKey || '';

    return {
      wallet: 'leather',
      account: {
        address,
        publicKey,
        compressedPublicKey: publicKey,
      },
      network: 'mainnet',
    };
  } catch (error: any) {
    throw new Error(`Leather connection failed: ${error.message}`);
  }
}

// Connect to OKX wallet
async function connectOKX(): Promise<WalletConnection> {
  if (!window.okxwallet?.bitcoin) {
    throw new Error('OKX wallet not installed');
  }

  try {
    const result = await window.okxwallet.bitcoin.connect();
    
    return {
      wallet: 'okx',
      account: {
        address: result.address,
        publicKey: result.publicKey,
        compressedPublicKey: result.publicKey,
      },
      network: 'mainnet',
    };
  } catch (error: any) {
    throw new Error(`OKX connection failed: ${error.message}`);
  }
}

// Main connect function
export async function connectWallet(type: WalletType): Promise<WalletConnection> {
  switch (type) {
    case 'unisat':
      return connectUniSat();
    case 'xverse':
      return connectXverse();
    case 'leather':
      return connectLeather();
    case 'okx':
      return connectOKX();
    default:
      throw new Error(`Unknown wallet type: ${type}`);
  }
}

// Disconnect wallet (removes all RuneBolt event listeners)
export function disconnectWallet(type: WalletType): void {
  if (typeof window === 'undefined') return;

  if (type === 'unisat' && window.unisat) {
    // Remove all listeners we may have registered
    for (const cb of _registeredListeners) {
      try {
        window.unisat.removeListener('accountsChanged', cb);
        window.unisat.removeListener('networkChanged', cb);
      } catch {
        // Listener may not exist, safe to ignore
      }
    }
    _registeredListeners.clear();
  }
}

// Track registered listeners so we can clean them up on disconnect
const _registeredListeners = new Set<(data: any) => void>();

// Sign PSBT with connected wallet
export async function signPsbt(
  walletType: WalletType,
  psbtBase64: string,
  options?: { autoFinalized?: boolean }
): Promise<string> {
  switch (walletType) {
    case 'unisat': {
      if (!window.unisat) throw new Error('UniSat not installed');
      const result = await window.unisat.signPsbt(psbtBase64, { autoFinalized: options?.autoFinalized ?? true });
      return result;
    }
    case 'xverse': {
      if (!window.xverse) throw new Error('Xverse not installed');
      const result = await window.xverse.signPsbt({ psbt: psbtBase64, signInputs: [0] });
      return result.psbt;
    }
    case 'okx': {
      if (!window.okxwallet?.bitcoin) throw new Error('OKX not installed');
      return await window.okxwallet.bitcoin.signPsbt(psbtBase64);
    }
    default:
      throw new Error(`PSBT signing not supported for ${walletType}`);
  }
}

// Broadcast signed PSBT
export async function broadcastPsbt(walletType: WalletType, psbtHex: string): Promise<string> {
  switch (walletType) {
    case 'unisat': {
      if (!window.unisat) throw new Error('UniSat not installed');
      return await window.unisat.pushPsbt(psbtHex);
    }
    default:
      throw new Error(`Broadcast not supported for ${walletType}`);
  }
}

// Send Bitcoin
export async function sendBitcoin(
  walletType: WalletType,
  toAddress: string,
  amountSats: number,
  feeRate?: number
): Promise<string> {
  switch (walletType) {
    case 'unisat': {
      if (!window.unisat) throw new Error('UniSat not installed');
      return await window.unisat.sendBitcoin(toAddress, amountSats, { feeRate });
    }
    case 'xverse': {
      if (!window.xverse) throw new Error('Xverse not installed');
      // Xverse requires connected address
      const connected = await connectXverse();
      return await window.xverse.sendBtc({
        recipients: [{ address: toAddress, amount: amountSats }],
        senderAddress: connected.account.address,
      });
    }
    case 'okx': {
      if (!window.okxwallet?.bitcoin) throw new Error('OKX not installed');
      return await window.okxwallet.bitcoin.sendBitcoin(toAddress, amountSats);
    }
    default:
      throw new Error(`Send not supported for ${walletType}`);
  }
}

// Get wallet balances
export async function getWalletBalances(walletType: WalletType): Promise<{
  confirmed: number;
  unconfirmed: number;
  total: number;
}> {
  switch (walletType) {
    case 'unisat': {
      if (!window.unisat) throw new Error('UniSat not installed');
      return await window.unisat.getBalance();
    }
    default:
      throw new Error(`Balance check not supported for ${walletType}`);
  }
}

// Get Runes from wallet
export async function getWalletRunes(walletType: WalletType): Promise<any[]> {
  switch (walletType) {
    case 'unisat': {
      if (!window.unisat) throw new Error('UniSat not installed');
      const result = await window.unisat.getRunes(0, 100);
      return result.detail || [];
    }
    default:
      return [];
  }
}

// Get Ordinals from wallet
export async function getWalletOrdinals(walletType: WalletType): Promise<any[]> {
  switch (walletType) {
    case 'unisat': {
      if (!window.unisat) throw new Error('UniSat not installed');
      const result = await window.unisat.getInscriptions(0, 100);
      return result.list || [];
    }
    default:
      return [];
  }
}

// Set up account change listener
export function onAccountsChanged(
  walletType: WalletType,
  callback: (accounts: string[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  if (walletType === 'unisat' && window.unisat) {
    window.unisat.on('accountsChanged', callback);
    _registeredListeners.add(callback);
    return () => {
      window.unisat?.removeListener('accountsChanged', callback);
      _registeredListeners.delete(callback);
    };
  }

  return () => {};
}

// Set up network change listener
export function onNetworkChanged(
  walletType: WalletType,
  callback: (network: string) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  if (walletType === 'unisat' && window.unisat) {
    window.unisat.on('networkChanged', callback);
    _registeredListeners.add(callback);
    return () => {
      window.unisat?.removeListener('networkChanged', callback);
      _registeredListeners.delete(callback);
    };
  }

  return () => {};
}

// Validate that a stored wallet connection has valid structure and the wallet is installed
export function validateConnection(conn: unknown): conn is WalletConnection {
  if (!conn || typeof conn !== 'object') return false;
  const c = conn as Record<string, unknown>;

  const validWallets: WalletType[] = ['unisat', 'xverse', 'leather', 'okx'];
  if (!validWallets.includes(c.wallet as WalletType)) return false;

  const validNetworks = ['mainnet', 'testnet', 'regtest'];
  if (!validNetworks.includes(c.network as string)) return false;

  const account = c.account as Record<string, unknown> | undefined;
  if (!account || typeof account.address !== 'string' || typeof account.publicKey !== 'string') return false;
  if (!/^[a-zA-Z0-9]{25,100}$/.test(account.address)) return false;

  return isWalletInstalled(c.wallet as WalletType);
}
