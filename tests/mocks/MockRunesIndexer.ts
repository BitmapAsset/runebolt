import { RuneBalance, RuneId, UtxoRef } from '../../src/types';

export class MockRunesIndexer {
  private balances = new Map<string, RuneBalance[]>();

  setBalance(address: string, balances: RuneBalance[]): void {
    this.balances.set(address, balances);
  }

  async getRuneInfo(runeName: string) {
    return {
      id: '840000:1',
      name: runeName.toUpperCase(),
      number: 1,
      divisibility: 0,
      symbol: runeName.charAt(0),
      supply: '100000000000',
    };
  }

  parseRuneId(runeIdStr: string): RuneId {
    const [block, tx] = runeIdStr.split(':').map(Number);
    return { block, tx };
  }

  formatRuneId(runeId: RuneId): string {
    return `${runeId.block}:${runeId.tx}`;
  }

  async getRuneBalances(address: string): Promise<RuneBalance[]> {
    return this.balances.get(address) || [];
  }

  async getRuneBalance(address: string, runeName: string): Promise<RuneBalance | null> {
    const balances = this.balances.get(address) || [];
    return balances.find((b) => b.runeName.toUpperCase() === runeName.toUpperCase()) ?? null;
  }

  async verifyRuneUtxo(
    utxo: UtxoRef,
    runeId: RuneId,
    expectedAmount: bigint,
  ): Promise<boolean> {
    return true;
  }

  async waitForConfirmation(txid: string, confirmations: number = 1): Promise<boolean> {
    return true;
  }
}
