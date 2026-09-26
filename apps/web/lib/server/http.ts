import { guestCookie, type GuestSession } from './guest-session'

export function json(data: unknown, status = 200, guest?: GuestSession): Response {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  if (guest?.newToken) headers.set('set-cookie', guestCookie(guest.newToken))
  return new Response(JSON.stringify(data), { status, headers })
}

export function routeError(error: unknown, guest?: GuestSession): Response {
  const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined
  const status = code === 'SUPABASE_NOT_CONFIGURED' ? 503 :
    code === 'APPROVAL_REQUIRED' || code === 'CHECKOUT_CONFLICT' ? 409 :
      code === 'LINK_CLI_UNAVAILABLE' ? 501 :
        code === 'NOT_FOUND' ? 404 :
          code === 'VALIDATION' ? 400 : 502
  const message = status === 502 ? 'Backend request failed' :
    error instanceof Error ? error.message : 'Request failed'
  return json({ error: message, code: status === 502 ? 'INTERNAL_ERROR' : code }, status, guest)
}
