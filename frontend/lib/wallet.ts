declare global {
  interface Window {
    unisat?: {
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      getPublicKey: () => Promise<string>;
      getBalance: () => Promise<{ confirmed: number; unconfirmed: number; total: number }>;
      signMessage: (msg: string) => Promise<string>;
      signPsbt: (psbtHex: string) => Promise<string>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export function detectWallet(): boolean {
  return typeof window !== 'undefined' && !!window.unisat;
}

export async function connectWallet(): Promise<{ address: string; publicKey: string } | null> {
  if (!window.unisat) {
    window.open('https://unisat.io', '_blank');
    return null;
  }
  const accounts = await window.unisat.requestAccounts();
  const publicKey = await window.unisat.getPublicKey();
  return { address: accounts[0], publicKey };
}

export async function signMessage(message: string): Promise<string | null> {
  if (!window.unisat) return null;
  try {
    return await window.unisat.signMessage(message);
  } catch {
    return null;
  }
}

export async function getAddress(): Promise<string | null> {
  if (!window.unisat) return null;
  try {
    const accounts = await window.unisat.getAccounts();
    return accounts[0] || null;
  } catch {
    return null;
  }
}

export function onAccountChanged(callback: (accounts: string[]) => void): () => void {
  if (!window.unisat) return () => {};
  const handler = (...args: unknown[]) => callback(args[0] as string[]);
  window.unisat.on('accountsChanged', handler);
  return () => window.unisat?.removeListener('accountsChanged', handler);
}
