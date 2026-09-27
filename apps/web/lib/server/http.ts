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
    code === 'APPROVAL_REQUIRED' || code === 'CHECKOUT_CONFLICT' || code === 'LOCKED' || code === 'BOARD_CHANGED' ? 409 :
      code === 'LINK_CLI_UNAVAILABLE' ? 501 :
        code === 'NOT_FOUND' ? 404 :
          code === 'VALIDATION' ? 400 :
            code === 'ML_UNAVAILABLE' || code === 'AGENT_UNAVAILABLE' ? 503 : 502
  const message = status === 502 ? 'Backend request failed' :
    error instanceof Error ? error.message : 'Request failed'

  // The client only ever sees `message` above (masked to a generic string
  // for unrecognized/5xx errors) — log the real error here so a bare
  // "Backend request failed" in the response doesn't leave the actual cause
  // (stack trace, cause chain, non-Error throws) undiscoverable server-side.
  const logLevel = status >= 500 ? 'error' : 'warn'
  console[logLevel](
    `[route-error] status=${status} code=${code ?? 'none'}`,
    error instanceof Error ? error.stack ?? error.message : error,
  )

  return json({ error: message, code: status === 502 ? 'INTERNAL_ERROR' : code }, status, guest)
}
