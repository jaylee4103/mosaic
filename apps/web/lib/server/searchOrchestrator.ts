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

  // Step 2: For each query, search internet and cache results, in parallel —
  // these queries are independent, so running them one at a time just
  // multiplies latency by query count. One query failing (a bad cache
  // lookup, a Serper/DB hiccup) is a warning, not a reason to abandon the
  // rest of the batch — keep whatever queries do succeed rather than losing
  // all of them over one failure.
  await Promise.all(
    queries.map(async (query) => {
      try {
        // Check if results are already cached. Matches against every token
        // in the query (not just the first word) via a trigram-indexed
        // ilike — see products_search_trgm_idx — instead of a single
        // leading-wildcard LIKE, which can't use an index and only tested
        // one token.
        const tokens = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])]
        let existingQuery = db.from('products').select('id').eq('available', true).limit(1)
        for (const token of tokens) {
          existingQuery = existingQuery.ilike('name', `%${token}%`)
        }
        const existing = await existingQuery

        if (existing.data && (existing.data as Array<{ id: string }>).length > 0) {
          console.log(`[searchOrchestrator] Cache hit for query: ${query}`)
          return
        }

        // Search internet
        const results = await searchInternet(query)
        if (results.length === 0) return

        // Cache results in Postgres
        await cacheSearchResults(query, results, db)
      } catch (err) {
        console.warn(`[searchOrchestrator] Query "${query}" failed, skipping it and continuing:`, err)
      }
    }),
  )

  console.log(`[searchOrchestrator] Done searching for guest ${guestId}`)
}
