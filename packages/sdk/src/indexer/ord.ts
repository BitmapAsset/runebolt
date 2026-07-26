import { ImplementationErrorCode, RuneBoltError } from '../errors.js'
import type {
  AttributedContents,
  AttributedInscriptionInfo,
  AttributedRune,
  AttributedRuneInfo,
} from '../types/attribution.js'
import { formatLocation, type Location } from '../types/location.js'
import type { IndexerAdapter } from './adapter.js'

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  status: number
  ok: boolean
  text(): Promise<string>
}>

export interface OrdAdapterOptions {
  readonly baseUrl: string
  readonly fetchImpl?: FetchLike
  /** Public ord instances may disable the JSON status route; pin the version when known. */
  readonly versionOverride?: string
  readonly now?: () => Date
}

interface OrdResponse {
  readonly status: number
  readonly ok: boolean
  readonly body: string
}

const JSON_HEADERS = { Accept: 'application/json' }

/**
 * Reference adapter for `ordinals/ord`.
 *
 * Route choice is dictated by what public instances actually serve: ordinals.com answers
 * `/status`, `/rune/<name>` and the recursive `/r/*` routes, but replies "JSON API disabled"
 * (HTTP 406) to `/output` and `/runes`. UTXO contents therefore come from `/r/utxo`, which is
 * available on both public and self-hosted nodes.
 */
export class OrdIndexerAdapter implements IndexerAdapter {
  readonly name = 'ord'

  private readonly baseUrl: string
  private readonly fetchImpl: FetchLike
  private readonly versionOverride: string | undefined
  private readonly now: () => Date
  private readonly runeIds = new Map<string, string | null>()
  private cachedVersion: string | undefined

  constructor(options: OrdAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike)
    this.versionOverride = options.versionOverride
    this.now = options.now ?? ((): Date => new Date())
    if (typeof this.fetchImpl !== 'function') {
      throw new RuneBoltError(
        ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
        'no fetch implementation available',
        { baseUrl: this.baseUrl },
      )
    }
  }

  async version(): Promise<string> {
    if (this.versionOverride !== undefined) return this.versionOverride
    if (this.cachedVersion !== undefined) return this.cachedVersion

    const status = await this.request('/status', JSON_HEADERS)
    if (status.ok) {
      const parsed = tryParseJson(status.body)
      const version = isRecord(parsed) ? readString(parsed, 'version') : undefined
      if (version !== undefined) return (this.cachedVersion = version)
    }

    // ordinals.com omits `version` from the JSON status but renders it on the HTML page.
    const html = await this.request('/status', { Accept: 'text/html' })
    const match = /<dt>version<\/dt>\s*<dd>([^<]+)<\/dd>/i.exec(html.body)
    if (match?.[1] !== undefined) return (this.cachedVersion = match[1].trim())

    throw new RuneBoltError(
      ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
      'ord did not report a version; pin it with versionOverride',
      { baseUrl: this.baseUrl },
    )
  }

  async blockHeight(): Promise<number> {
    const response = await this.request('/r/blockheight', JSON_HEADERS)
    const height = Number(response.body.trim())
    if (!response.ok || !Number.isSafeInteger(height) || height < 0) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
        'ord did not return a block height',
        { status: response.status, body: response.body.slice(0, 120) },
      )
    }
    return height
  }

  async utxoContents(location: Location): Promise<AttributedContents> {
    const outpoint = outpointOf(location)
    const response = await this.request(`/r/utxo/${outpoint}`, JSON_HEADERS)
    if (!response.ok) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
        `ord has no record of ${outpoint} (it is spent, unindexed, or does not exist)`,
        { outpoint, status: response.status },
      )
    }
    const parsed = requireJsonObject(parseJson(response.body), `/r/utxo/${outpoint}`)
    const [version, blockHeight] = await Promise.all([this.version(), this.blockHeight()])

    return {
      indexer: this.name,
      indexerVersion: version,
      blockHeight,
      observedAt: this.now().toISOString(),
      contents: {
        inscriptions: readStringArray(parsed, 'inscriptions'),
        runes: await this.resolveRuneIds(readRunes(parsed, response.body)),
        brc20: [],
        ...(readNumber(parsed, 'value') === undefined
          ? {}
          : { valueSats: readNumber(parsed, 'value') as number }),
      },
    }
  }

  /**
   * `/r/utxo` keys runes by spaced name only, so the rune id comes from a second lookup. An
   * indexer that cannot answer it leaves the id null rather than inventing one.
   */
  private async resolveRuneIds(runes: AttributedRune[]): Promise<AttributedRune[]> {
    return Promise.all(
      runes.map(async (rune) => {
        if (rune.runeId !== null) return rune
        const cached = this.runeIds.get(rune.runeName)
        if (cached !== undefined) return { ...rune, runeId: cached }
        try {
          const info = await this.runeInfo(rune.runeName)
          this.runeIds.set(rune.runeName, info.runeId)
          return { ...rune, runeId: info.runeId }
        } catch {
          return rune
        }
      }),
    )
  }

  /**
   * ord indexes the UTXO set, so an outpoint it cannot find is spent or was never created.
   * Both answers fail I-15 closed, and the caller cannot act on the distinction anyway.
   */
  async isSpent(location: Location): Promise<boolean> {
    const response = await this.request(`/r/utxo/${outpointOf(location)}`, JSON_HEADERS)
    if (response.ok) return false
    if (response.status === 404) return true
    throw new RuneBoltError(
      ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
      'ord could not answer a spend query',
      { outpoint: outpointOf(location), status: response.status },
    )
  }

  async runeInfo(rune: string): Promise<AttributedRuneInfo> {
    const response = await this.request(`/rune/${encodeURIComponent(rune)}`, JSON_HEADERS)
    if (!response.ok) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
        `ord did not serve rune info for ${rune}`,
        { rune, status: response.status },
      )
    }
    const parsed = requireJsonObject(parseJson(response.body), `/rune/${rune}`)
    const entry = readObject(parsed, 'entry') ?? parsed
    const [version, blockHeight] = await Promise.all([this.version(), this.blockHeight()])
    const symbol = readString(entry, 'symbol')
    return {
      indexer: this.name,
      indexerVersion: version,
      blockHeight,
      observedAt: this.now().toISOString(),
      runeId: readString(parsed, 'id') ?? null,
      runeName: readString(entry, 'spaced_rune') ?? readString(entry, 'rune') ?? rune,
      divisibility: readNumber(entry, 'divisibility') ?? 0,
      ...(symbol === undefined ? {} : { symbol }),
    }
  }

  async inscriptionInfo(id: string): Promise<AttributedInscriptionInfo> {
    const response = await this.request(`/r/inscription/${encodeURIComponent(id)}`, JSON_HEADERS)
    if (!response.ok) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
        `ord has no inscription ${id}`,
        { id, status: response.status },
      )
    }
    const parsed = requireJsonObject(parseJson(response.body), `/r/inscription/${id}`)
    const [version, blockHeight] = await Promise.all([this.version(), this.blockHeight()])

    const number = readNumber(parsed, 'number')
    if (number === undefined) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
        'ord returned an inscription without a number',
        { id },
      )
    }
    const satpoint = readString(parsed, 'satpoint')
    if (satpoint === undefined) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
        'ord returned an inscription without a satpoint',
        { id },
      )
    }
    const address = readString(parsed, 'address')
    const contentType = readString(parsed, 'content_type')
    const valueSats = readNumber(parsed, 'value')

    return {
      indexer: this.name,
      indexerVersion: version,
      blockHeight,
      observedAt: this.now().toISOString(),
      id: readString(parsed, 'id') ?? id,
      number,
      satpoint,
      charms: readStringArray(parsed, 'charms'),
      ...(address === undefined ? {} : { address }),
      ...(contentType === undefined ? {} : { contentType }),
      ...(valueSats === undefined ? {} : { valueSats }),
    }
  }

  private async request(path: string, headers: Record<string, string>): Promise<OrdResponse> {
    let response: { status: number; ok: boolean; text(): Promise<string> }
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, { headers })
    } catch (error) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
        `ord request failed: ${path}`,
        { path, cause: String(error) },
      )
    }
    return { status: response.status, ok: response.ok, body: await response.text() }
  }
}

function outpointOf(location: Location): string {
  return formatLocation({ txid: location.txid, vout: location.vout })
}

function parseJson(body: string): unknown {
  const parsed = tryParseJson(body)
  if (parsed === undefined) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
      'ord returned a non-JSON body (the JSON API may be disabled on this instance)',
      { body: body.slice(0, 120) },
    )
  }
  return parsed
}

function tryParseJson(body: string): unknown {
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireJsonObject(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_INDEXER_UNAVAILABLE,
      `ord returned a non-object body for ${path}`,
      { path },
    )
  }
  return value as Record<string, unknown>
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readObject(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = record[key]
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

/**
 * Amounts are u128 on the wire and ord serves them as JSON numbers, so JSON.parse silently rounds
 * anything above 2^53. The digits are recovered from the raw body instead.
 */
function readRunes(record: Record<string, unknown>, rawBody: string): AttributedRune[] {
  const runes = readObject(record, 'runes')
  if (runes === undefined) return []

  return Object.entries(runes).flatMap(([runeName, value]): AttributedRune[] => {
    const entry = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
    const parsedAmount = readNumber(entry, 'amount')
    const amount = exactAmount(rawBody, runeName) ?? String(parsedAmount ?? 0)
    const divisibility = readNumber(entry, 'divisibility')
    const symbol = readString(entry, 'symbol')
    return [
      {
        runeId: null,
        runeName,
        amount,
        ...(divisibility === undefined ? {} : { divisibility }),
        ...(symbol === undefined ? {} : { symbol }),
      },
    ]
  })
}

function exactAmount(rawBody: string, runeName: string): string | undefined {
  const escaped = runeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`"${escaped}"\\s*:\\s*\\{[^}]*?"amount"\\s*:\\s*(\\d+)`).exec(rawBody)
  return match?.[1]
}
