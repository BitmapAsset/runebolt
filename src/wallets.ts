export interface WalletConnector {
  name: string;
  connect(): Promise<string>;
  signPsbt(psbt: string): Promise<string>;
  getPublicKey(): Promise<string>;
}

export class UnisatConnector implements WalletConnector {
  name = 'Unisat';
  
  async connect(): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).unisat) {
      throw new Error('Unisat wallet not installed');
    }
    const accounts = await (window as any).unisat.requestAccounts();
    return accounts[0];
  }
  
  async signPsbt(psbt: string): Promise<string> {
    return await (window as any).unisat.signPsbt(psbt);
  }
  
  async getPublicKey(): Promise<string> {
    return await (window as any).unisat.getPublicKey();
  }
}

export function createWalletConnector(name: 'unisat' | 'xverse'): WalletConnector {
  if (name === 'unisat') return new UnisatConnector();
  throw new Error(`Wallet ${name} not yet implemented`);
}