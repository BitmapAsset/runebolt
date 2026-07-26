import { RuneBoltError, type RuneBoltErrorCode } from '../errors.js'

export function fail(code: RuneBoltErrorCode, message: string, detail?: Record<string, unknown>): never {
  throw new RuneBoltError(code, message, detail)
}

export function requireRecord(
  value: unknown,
  code: RuneBoltErrorCode,
  path: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(code, `${path} must be an object`, { path, received: typeof value })
  }
  return value as Record<string, unknown>
}

export function requireString(value: unknown, code: RuneBoltErrorCode, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    fail(code, `${path} must be a non-empty string`, { path, received: value })
  }
  return value
}

export function requireArray(value: unknown, code: RuneBoltErrorCode, path: string): unknown[] {
  if (!Array.isArray(value)) fail(code, `${path} must be an array`, { path, received: typeof value })
  return value
}

/** Sat values and block heights: non-negative safe integers only. */
export function requireUint(value: unknown, code: RuneBoltErrorCode, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    fail(code, `${path} must be a non-negative safe integer`, { path, received: value })
  }
  return value
}

/** Rune amounts are u128 and MUST NOT round-trip through a JS number. */
export function requireDecimalString(
  value: unknown,
  code: RuneBoltErrorCode,
  path: string,
): string {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    fail(code, `${path} must be a base-10 integer string`, { path, received: value })
  }
  return value
}

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

export function requireRfc3339(value: unknown, code: RuneBoltErrorCode, path: string): string {
  const raw = requireString(value, code, path)
  if (!RFC3339.test(raw) || Number.isNaN(Date.parse(raw))) {
    fail(code, `${path} must be an RFC3339 timestamp`, { path, received: value })
  }
  return raw
}

export function requireHex(value: unknown, code: RuneBoltErrorCode, path: string): string {
  const raw = requireString(value, code, path)
  if (!/^[0-9a-fA-F]+$/.test(raw) || raw.length % 2 !== 0) {
    fail(code, `${path} must be an even-length hex string`, { path, received: value })
  }
  return raw
}

export function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  code: RuneBoltErrorCode,
  path: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(code, `${path} must be one of ${allowed.join(', ')}`, { path, received: value })
  }
  return value as T
}

export function optional<T>(value: unknown, read: (v: unknown) => T): T | undefined {
  return value === undefined ? undefined : read(value)
}
