/**
 * Search orchestrator.
 * Generates search queries from vibe terms, calls internet search providers,
 * and caches results in Postgres.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabase'
import { searchInternet } from './internetSearch'
import { cacheSearchResults } from './productCache'
import type { VibeProfile } from './vibe-profile'
import { generateSearchQueries } from '@/lib/ai/searchQueryGenerator'

export async function performSearch(
  vibeProfile: VibeProfile,
  userRequest: string,
  guestId: string,
  db: SupabaseClient = getSupabaseAdmin(),
): Promise<void> {
  // Step 1: Generate search queries from vibe terms + user request
  const queries = await generateSearchQueries(vibeProfile.profile, userRequest)
  console.log(`[searchOrchestrator] Generated ${queries.length} queries: ${JSON.stringify(queries)}`)

  // Step 2: For each query, search internet and cache results
  for (const query of queries) {
    // Check if results are already cached
    const existing = await db
      .from('products')
      .select('id')
      .like('name', `%${query.split(' ')[0]}%`)
      .eq('available', true)
      .limit(1)

    if (existing.data && (existing.data as Array<{ id: string }>).length > 0) {
      console.log(`[searchOrchestrator] Cache hit for query: ${query}`)
      continue
    }

    // Search internet
    const results = await searchInternet(query)
    if (results.length === 0) continue

    // Cache results in Postgres
    await cacheSearchResults(query, results, db)
  }

  console.log(`[searchOrchestrator] Done searching for guest ${guestId}`)
}
