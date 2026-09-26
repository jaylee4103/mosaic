import { createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabase'

export const GUEST_COOKIE = 'mosaic_guest'
const SESSION_SECONDS = 30 * 24 * 60 * 60
const TOKEN_PATTERN = /^[0-9a-f]{64}$/

export function hashGuestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function readGuestToken(header: string | null): string | null {
  for (const part of (header ?? '').split(';')) {
    const [name, value] = part.trim().split('=', 2)
    if (name === GUEST_COOKIE && TOKEN_PATTERN.test(value ?? '')) return value
  }
  return null
}

export type GuestSession = {
  id: string
  newToken?: string
}

export async function getOrCreateGuest(
  request: Request,
  db: SupabaseClient = getSupabaseAdmin(),
  now = new Date(),
): Promise<GuestSession> {
  const token = readGuestToken(request.headers.get('cookie'))
  if (token) {
    const { data, error } = await db
      .from('guest_sessions')
      .select('id, expires_at')
      .eq('token_hash', hashGuestToken(token))
      .maybeSingle()
    if (error) throw new Error('Could not look up guest session')
    if (data && new Date(data.expires_at) > now) return { id: data.id }
  }

  const newToken = randomBytes(32).toString('hex')
  const { data, error } = await db
    .from('guest_sessions')
    .insert({
      token_hash: hashGuestToken(newToken),
      expires_at: new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString(),
    })
    .select('id')
    .single()
  if (error || !data?.id) throw new Error('Could not create guest session')
  return { id: data.id, newToken }
}

export function guestCookie(token: string): string {
  if (!TOKEN_PATTERN.test(token)) throw new Error('Invalid guest token')
  return `${GUEST_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}
