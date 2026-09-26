import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let admin: SupabaseClient | undefined

export function getSupabaseAdmin(): SupabaseClient {
  if (admin) return admin

  const url = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    throw Object.assign(new Error('Supabase is not configured'), {
      code: 'SUPABASE_NOT_CONFIGURED',
    })
  }

  admin = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return admin
}
