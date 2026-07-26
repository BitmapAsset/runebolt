import { Psbt } from 'bitcoinjs-lib'
import { SELLER_SIGNATURE_INDEX } from '../../src/swap/constants.js'
import { BUYER, NETWORK } from './swap.js'

/** What the buyer's wallet does: sign every input that is not the seller's. */
export function buyerSign(psbtBase64: string, sellerInputIndex = SELLER_SIGNATURE_INDEX): string {
  const psbt = Psbt.fromBase64(psbtBase64, { network: NETWORK })
  for (const index of psbt.txInputs.keys()) {
    if (index === sellerInputIndex) continue
    psbt.signInput(index, BUYER.keyPair)
  }
  return psbt.toBase64()
}
