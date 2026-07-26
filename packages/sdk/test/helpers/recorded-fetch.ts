import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FetchLike } from '../../src/indexer/ord.js'

interface Recording {
  readonly source: string
  readonly accept: string
  readonly status: number
  readonly recordedAt: string
  readonly body: string
}

interface RecordingFile {
  readonly recorded: true
  readonly base: string
  readonly recordings: Record<string, Recording>
}

const FILE = join(import.meta.dirname, '../fixtures/ord/recordings.json')

export const recordings = JSON.parse(readFileSync(FILE, 'utf8')) as RecordingFile

/**
 * Replays verbatim responses recorded from a live ord instance. Tests run offline and
 * deterministically; `tools/record-ord-fixtures.mjs` re-records them.
 */
export function recordedFetch(overrides: Record<string, string> = {}): FetchLike {
  return async (url, init) => {
    const accept = init?.headers?.['Accept'] ?? 'application/json'
    const path = url.slice(recordings.base.length)
    const key = `${accept} ${path}`
    const override = overrides[key]
    if (override !== undefined) {
      return { status: 200, ok: true, text: async () => override }
    }
    const recording = recordings.recordings[key]
    if (recording === undefined) {
      throw new Error(`no recording for ${key}`)
    }
    return {
      status: recording.status,
      ok: recording.status >= 200 && recording.status < 300,
      text: async () => recording.body,
    }
  }
}

export const RECORDED_BASE = recordings.base
