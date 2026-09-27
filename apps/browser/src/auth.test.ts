import { describe, expect, test } from 'bun:test'
import { isAuthorized } from './auth'

describe('browser service authorization', () => {
  const token = 'a'.repeat(64)

  test('accepts the exact bearer token', () => {
    expect(isAuthorized(`Bearer ${token}`, token)).toBe(true)
  })

  test('rejects missing, malformed, and different tokens', () => {
    expect(isAuthorized(null, token)).toBe(false)
    expect(isAuthorized(token, token)).toBe(false)
    expect(isAuthorized(`Bearer ${'b'.repeat(64)}`, token)).toBe(false)
    expect(isAuthorized('Bearer short', token)).toBe(false)
  })
})
