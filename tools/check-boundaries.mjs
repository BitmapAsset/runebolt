#!/usr/bin/env node
// Package-boundary lint. See ARCHITECTURE.md §1.1.
// Usage: node tools/check-boundaries.mjs [rootDir]
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const RULES = [
  {
    from: 'packages/sdk/src/swap',
    deny: /(^|[./\\])lightning([./\\]|$)/,
    reason:
      'SPEC §12.1 / ARCHITECTURE §1.1(1): Lightning never settles an asset swap. ' +
      'swap/ must not import lightning/.',
  },
]

const IMPORT_RE =
  /(?:^|[\s;{(=])(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|(?:^|[^.\w])(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)|(?:^|[\s;])import\s*['"]([^'"]+)['"]/g

const SOURCE_EXT = /\.(m|c)?tsx?$/
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', 'legacy'])

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (SOURCE_EXT.test(entry.name)) out.push(full)
  }
  return out
}

function specifiers(source) {
  const found = []
  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[1] ?? match[2] ?? match[3]
    if (spec) found.push(spec)
  }
  return found
}

const root = resolve(process.argv[2] ?? process.cwd())
const violations = []
let scanned = 0

for (const rule of RULES) {
  const dir = resolve(root, rule.from)
  try {
    if (!statSync(dir).isDirectory()) continue
  } catch {
    continue
  }
  for (const file of walk(dir)) {
    scanned += 1
    const source = readFileSync(file, 'utf8')
    for (const spec of specifiers(source)) {
      if (rule.deny.test(spec)) {
        violations.push({ file: relative(root, file).split(sep).join('/'), spec, reason: rule.reason })
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`boundary check FAILED (${violations.length} violation(s)):\n`)
  for (const v of violations) {
    console.error(`  ${v.file}\n    imports "${v.spec}"\n    ${v.reason}\n`)
  }
  process.exit(1)
}

console.log(`boundary check OK (${scanned} file(s) scanned, ${RULES.length} rule(s))`)
