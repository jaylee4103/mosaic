import { expect, test } from 'bun:test'
import { guestCookie, hashGuestToken, readGuestToken } from '../lib/server/guest-session'

test('guest cookie is opaque, HttpOnly, and can be parsed without exposing its hash', () => {
  const token = 'a'.repeat(64)
  expect(hashGuestToken(token)).not.toBe(token)
  expect(readGuestToken(`other=value; mosaic_guest=${token}`)).toBe(token)
  expect(readGuestToken('mosaic_guest=invalid')).toBeNull()
  expect(guestCookie(token)).toContain('; HttpOnly; SameSite=Lax;')
})
