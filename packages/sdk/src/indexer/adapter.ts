import type {
  AttributedContents,
  AttributedInscriptionInfo,
  AttributedRuneInfo,
} from '../types/attribution.js'
import type { Location } from '../types/location.js'

/**
 * ARCHITECTURE §2.2. A narrow interface over "what does this UTXO contain", implemented per
 * indexer. Every read is attributed: bitmap ownership is indexer consensus rather than Bitcoin
 * consensus (SPEC §8.3, R4), so the system must be able to ask two indexers and surface
 * disagreement instead of hard-coding one opinion as truth.
 */
export interface IndexerAdapter {
  readonly name: string
  version(): Promise<string>
  utxoContents(location: Location): Promise<AttributedContents>
  isSpent(location: Location): Promise<boolean>
  runeInfo(rune: string): Promise<AttributedRuneInfo>
  inscriptionInfo(id: string): Promise<AttributedInscriptionInfo>
}
