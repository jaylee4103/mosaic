import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabase'

// Runner-up candidates the shopping agent's search turned up but didn't add
// to the cart, kept for a later "swap this out" request. See
// supabase/migrations/202609270001_agent_product_alternates.sql for why
// this needs to be persisted (stateless per-request routes) and why it's
// keyed by product_id rather than cart_item_id.
type AlternatesRow = { alternate_product_ids: string[] }

export async function storeAlternates(
  boardId: string,
  productId: string,
  alternateProductIds: string[],
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<void> {
  if (alternateProductIds.length === 0) return
  const { error } = await db
    .from('agent_product_alternates')
    .upsert(
      { board_id: boardId, product_id: productId, alternate_product_ids: alternateProductIds, updated_at: new Date().toISOString() },
      { onConflict: 'board_id,product_id' },
    )
  if (error) throw new Error('Could not store product alternates')
}

export async function dropAlternates(
  boardId: string,
  productId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<void> {
  const { error } = await db
    .from('agent_product_alternates')
    .delete()
    .eq('board_id', boardId)
    .eq('product_id', productId)
  if (error) throw new Error('Could not clear product alternates')
}

/** Pop the next queued alternate for (boardId, productId), if any. The old
 * row is always deleted — the caller re-stores the remaining queue under
 * the new productId key after actually swapping the cart item, since the
 * "current occupant" of the slot changes. */
export async function popNextAlternate(
  boardId: string,
  productId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<{ nextProductId: string; remaining: string[] } | null> {
  const { data, error } = await db
    .from('agent_product_alternates')
    .select('alternate_product_ids')
    .eq('board_id', boardId)
    .eq('product_id', productId)
    .maybeSingle()
  if (error) throw new Error('Could not look up product alternates')

  const row = data as AlternatesRow | null
  if (!row || row.alternate_product_ids.length === 0) {
    if (row) await dropAlternates(boardId, productId, db)
    return null
  }

  await dropAlternates(boardId, productId, db)
  const [nextProductId, ...remaining] = row.alternate_product_ids
  return { nextProductId, remaining }
}
