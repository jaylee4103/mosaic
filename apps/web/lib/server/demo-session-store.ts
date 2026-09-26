import type { SupabaseClient } from '@supabase/supabase-js'
import type { DemoCheckoutState } from './demo-checkout-types'
import { getSupabaseAdmin } from './supabase'

type StoredSession = { state: DemoCheckoutState; version: number }

function conflict(): Error {
  return Object.assign(new Error('Checkout changed; retry the request'), { code: 'CHECKOUT_CONFLICT' })
}

export function createDemoSessionStore(
  guestId: string,
  db: SupabaseClient = getSupabaseAdmin(),
) {
  return {
    async load(): Promise<StoredSession | null> {
      const { data, error } = await db
        .from('demo_checkout_sessions')
        .select('state, version')
        .eq('guest_session_id', guestId)
        .maybeSingle()
      if (error) throw new Error('Could not load demo checkout')
      if (!data) return null
      const state = data.state as DemoCheckoutState
      if (state.cartId !== 'cart-demo-1' || !Array.isArray(state.requests) ||
        !Array.isArray(state.orders) || !Array.isArray(state.payments)) {
        throw new Error('Invalid saved demo checkout')
      }
      return { state, version: Number(data.version) }
    },
    async save(state: DemoCheckoutState, version: number | null): Promise<number> {
      if (version === null) {
        const { error } = await db.from('demo_checkout_sessions').insert({
          guest_session_id: guestId,
          state,
          version: 0,
        })
        if (error?.code === '23505') throw conflict()
        if (error) throw new Error('Could not save demo checkout')
        return 0
      }
      const { data, error } = await db
        .from('demo_checkout_sessions')
        .update({ state, version: version + 1, updated_at: new Date().toISOString() })
        .eq('guest_session_id', guestId)
        .eq('version', version)
        .select('version')
        .maybeSingle()
      if (error) throw new Error('Could not save demo checkout')
      if (!data) throw conflict()
      return Number(data.version)
    },
  }
}

export type DemoSessionStore = ReturnType<typeof createDemoSessionStore>
