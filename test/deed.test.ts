import { createDeedLock } from '../src/index';

describe('RuneBolt', () => {
  test('create deed lock for Rune', () => {
    const deed = createDeedLock({
      asset: { type: 'rune', id: 'DOG', amount: 1000, ticker: 'DOG' },
      senderPubkey: '02' + '0'.repeat(64),
      recipientPubkey: '03' + '0'.repeat(64),
      paymentHash: '0'.repeat(64),
      timeoutBlocks: 144