import { timingSafeEqual } from 'node:crypto'

export function isAuthorized(header: string | null, token: string): boolean {
  if (!token || !header?.startsWith('Bearer ')) return false
  const provided = Buffer.from(header.slice('Bearer '.length))
  const expected = Buffer.from(token)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}
