import type { SupabaseClient } from '@supabase/supabase-js'
import { notFoundError } from './errors'

export async function assertBoardOwnership(guestId: string, boardId: string, db: SupabaseClient): Promise<void> {
  const { data, error } = await db
    .from('boards')
    .select('id')
    .eq('id', boardId)
    .eq('guest_session_id', guestId)
    .maybeSingle()
  if (error) throw new Error('Could not look up board')
  if (!data) throw notFoundError('Board not found')
}
