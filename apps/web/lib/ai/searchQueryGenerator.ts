/**
 * AI-powered search query generator.
 * Given a vibe profile and user request, generates search queries
 * for internet product search.
 */
import { generateText } from 'ai'
import { resolveAgentModel } from '@/lib/ai/providers'

// Max search queries generated per shopping-agent turn. More queries means
// broader catalog coverage but more Serper calls (and more categorizer/
// resolveDirectProductUrl calls downstream) per turn — tune via env instead
// of a code change.
const MAX_QUERIES = Number(process.env.SEARCH_QUERY_COUNT ?? 5)

export async function generateSearchQueries(
  vibeProfile: Record<string, unknown>,
  userRequest: string,
): Promise<string[]> {
  try {
    const model = resolveAgentModel()

    const vibeJson = JSON.stringify(vibeProfile, null, 2)

    const result = await generateText({
      model,
      system: `You are a product search query generator for a shopping AI.

Given a vibe profile and a user request, generate up to ${MAX_QUERIES} concise, specific search queries
that would find relevant products on an online store (e.g., Amazon, Google Shopping).

Rules:
- Each query should be 3-5 words max
- Include the price constraint from the user request if present
- Use the vibe profile terms (colors, materials, styles) in the queries
- Return ONLY a JSON array of strings, no other text
- Make queries specific enough to find real products

Vibe profile: ${vibeJson}
User request: ${userRequest}`,
      messages: [{ role: 'user' as const, content: `Generate search queries from this vibe profile and request. Return only a JSON array.` }],
    })

    // Parse the LLM's response as JSON array
    const text = result.text.trim()
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const queries = (JSON.parse(jsonMatch[0]) as string[]).slice(0, MAX_QUERIES)
      console.log(`[searchQueryGenerator] Generated ${queries.length} queries`)
      return queries
    }

    // Fallback: simple keyword-based generation
    console.warn('[searchQueryGenerator] Could not parse LLM response, using fallback')
    return fallbackQueries(vibeProfile, userRequest)
  } catch (err) {
    console.error('[searchQueryGenerator] Failed:', err)
    return fallbackQueries(vibeProfile, userRequest)
  }
}

function fallbackQueries(
  vibeProfile: Record<string, unknown>,
  userRequest: string,
): string[] {
  const terms = new Set<string>()

  // Extract vibe terms
  const colors = (vibeProfile.colors as string[]) ?? []
  const materials = (vibeProfile.materials as string[]) ?? []
  const styles = (vibeProfile.styles as string[]) ?? []
  const qualities = (vibeProfile.qualities as string[]) ?? []

  for (const t of [...colors, ...materials, ...styles, ...qualities]) {
    terms.add(t.toLowerCase())
  }

  // Combine vibe terms with user request keywords
  const userWords = userRequest.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  const vibeTermArray = Array.from(terms)

  const queries: string[] = []
  for (let i = 0; i < Math.min(MAX_QUERIES, vibeTermArray.length); i++) {
    queries.push(`${vibeTermArray[i]} ${userWords[0] ?? ''}`.trim())
  }
  if (queries.length === 0) {
    queries.push(userRequest)
  }

  return queries.slice(0, MAX_QUERIES)
}
