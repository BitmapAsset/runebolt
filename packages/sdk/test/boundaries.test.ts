import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * W0: the `swap` ↛ `lightning` boundary must fail the build, not a code review.
 * SPEC §12.1 / ARCHITECTURE §1.1(1).
 */

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const CHECKER = join(REPO_ROOT, 'tools/check-boundaries.mjs')
const roots: string[] = []

function fixtureRoot(swapSource: string): string {
  const root = mkdtempSync(join(tmpdir(), 'runebolt-boundary-'))
  roots.push(root)
  mkdirSync(join(root, 'packages/sdk/src/swap'), { recursive: true })
  mkdirSync(join(root, 'packages/sdk/src/lightning'), { recursive: true })
  writeFileSync(join(root, 'packages/sdk/src/lightning/nwc.ts'), 'export const payInvoice = 1\n')
  writeFileSync(join(root, 'packages/sdk/src/swap/build.ts'), swapSource)
  return root
}

function runChecker(root: string): { status: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [CHECKER, root], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { status: 0, output }
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string }
    return { status: failure.status ?? 1, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` }
  }
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

describe('package boundaries', () => {
  it('passes on a swap module that does not reach for lightning', () => {
    const root = fixtureRoot("import { parsePsbtView } from './psbt.js'\nexport const build = parsePsbtView\n")
    const result = runChecker(root)
    expect(result.status).toBe(0)
    expect(result.output).toContain('boundary check OK')
  })

  it.each([
    ["import { payInvoice } from '../lightning/nwc.js'\nexport const build = payInvoice\n", 'static import'],
    ["export { payInvoice } from '../lightning/nwc.js'\n", 're-export'],
    ["export const build = async () => import('../lightning/nwc.js')\n", 'dynamic import'],
    ["import '../lightning/nwc.js'\n", 'side-effect import'],
  ])('fails the build on a deliberate violation (%s)', (source) => {
    const result = runChecker(fixtureRoot(source))
    expect(result.status).toBe(1)
    expect(result.output).toContain('boundary check FAILED')
    expect(result.output).toContain('SPEC §12.1')
  })

  it('the real repository is clean', () => {
    const result = runChecker(REPO_ROOT)
    expect(result.status).toBe(0)
  })
})
