#!/usr/bin/env node
// Re-records the ord HTTP fixtures used by the W2 adapter tests.
//
//   node tools/record-ord-fixtures.mjs [baseUrl]
//
// Recordings are verbatim responses from a public ord instance. They are committed so CI runs
// offline and deterministically; the live path is exercised by test/ord-live.test.ts, which is
// opt-in via RUNEBOLT_ORD_URL.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.argv[2] ?? 'https://ordinals.com'
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/sdk/test/fixtures/ord/recordings.json',
)

// Chosen for what each one proves, not at random:
const PATHS = [
  ['/status', 'application/json'], // height; this instance omits `version` from the JSON
  ['/status', 'text/html'], // ...but renders it on the HTML page
  ['/r/blockheight', 'application/json'],
  // unspent, holds exactly one rune — the rune attribution path
  ['/r/utxo/6c255c08883bf93799064172b55fd71e10405d7c0f80fc9e2e1da45daa40e4a4:1', 'application/json'],
  // unspent, holds many inscriptions — multi-inscription rejection (I-3, I-14)
  ['/r/utxo/c9fa07991c847f815f79e4457dadfe36842d26c0fa2ed71bf1729ade27496920:0', 'application/json'],
  // spent: ord serves the UTXO set, so this 404s (I-15)
  ['/r/utxo/aa81d42be532eb8e32a6f5ecef7a1818f5494747d81f7ead45ff89cdbe4f0096:0', 'application/json'],
  // cursed inscription number -1, at a non-zero sat offset (SPEC §7.4, I-5)
  [
    '/r/inscription/617b02026b7d56c85a41c07ebfd67a1186f0888fd07c59428f11b1b9cdf6a84ci0',
    'application/json',
  ],
  // public instances disable the rune JSON route, so rune ids cannot be resolved there
  ['/rune/SPARKY%E2%80%A2RUNEDOG', 'application/json'],
]

const recordings = {}
for (const [path, accept] of PATHS) {
  const response = await fetch(`${BASE}${path}`, { headers: { Accept: accept } })
  const body = await response.text()
  recordings[`${accept} ${path}`] = {
    source: `${BASE}${path}`,
    accept,
    status: response.status,
    recordedAt: new Date().toISOString(),
    body: accept === 'text/html' ? trimStatusHtml(body) : body,
    ...(accept === 'text/html' ? { note: 'trimmed to the <dl> block that carries the version' } : {}),
  }
  console.log(`${response.status} ${accept} ${path}`)
}

function trimStatusHtml(html) {
  const start = html.indexOf('<dl>')
  const end = html.indexOf('</dl>')
  return start === -1 || end === -1 ? html : html.slice(start, end + 5)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify({ recorded: true, base: BASE, recordings }, null, 2)}\n`)
console.log(`\nwrote ${join(OUT)}`)
