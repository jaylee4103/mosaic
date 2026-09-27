# Internet Product Search for the Shopping Agent

> **Status:** Draft v2 (revised)
> **Branch:** `vyang/feat-internet-product-search`
> **Date:** 2026-09-27

---

## 1. Problem Statement

The Mosaic shopping agent currently only searches the **local demo catalog** (14 seeded products in Postgres). The `searchProducts()` function in `products.ts` queries `db.from('products')` directly — it never touches the open internet.

The correct architecture, per the README's product discovery flow, is:

> **Vibe Profile → Shopping Agent generates multiple search queries → Product Provider (internet) → Normalized Products → Deterministic Filters → AI Vibe Ranking → Recommendations**

The Postgres database should serve as a **cache for internet search results**, not the primary data source. The agent should generate multiple search queries from vibe terms, search the open internet, store results in Postgres, and then work against those cached results.

---

## 2. Current (Wrong) Architecture

```
User message
    │
    ▼
┌─────────────────────────────────────────────────┐
│           runAgentTurn (harness.ts)              │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│           createShoppingTools (shoppingTools.ts) │
│                                                   │
│   search_products ──► searchProducts()            │
│                     │                            │
│                     ▼                            │
│               SELECT * FROM products              │
│               WHERE available=true               │
│               (local Postgres = SOURCE OF TRUTH)  │
│                                                   │
│   add_item ──► applyCartActions()                 │
│                (mutates local Postgres)            │
└─────────────────────────────────────────────────┘
```

`searchProducts()` currently does a token-based keyword match against 14 demo products in Postgres. This is **wrong** — Postgres should be the cache, not the source.

---

## 3. Correct Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SHOPPING TURN                                    │
│                                                                         │
│  User: "Find me a warm ceramic lamp under $70"                          │
│       │                                                                 │
│       ▼                                                                 │
│  Vibe Profile: { colors: ["cream", "terracotta"],                        │
│                  materials: ["linen", "ceramic"],                        │
│                  styles: ["coastal", "minimal"] }                        │
│       │                                                                 │
│       ▼                                                                 │
│  Agent generates MULTIPLE search queries from vibe terms:                │
│    Q1: "warm ceramic lamp"                                               │
│    Q2: "minimal table lamp"                                              │
│    Q3: "terracotta home decor lighting"                                  │
│       │                                                                 │
│       ▼                                                                 │
│  For each query, search the internet and cache results in Postgres:      │
│                                                                         │
│    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │
│    │ search_internet │    │ search_internet │    │ search_internet │   │
│    │ (Q1)            │    │ (Q2)            │    │ (Q3)            │   │
│    │                 │    │                 │    │                 │   │
│    │ Serper.dev      │    │ Serper.dev      │    │ Serper.dev      │   │
│    │ Google Shopping │    │ Google Shopping │    │ Google Shopping │   │
│    └───────┬─────────┘    └───────┬─────────┘    └───────┬─────────┘   │
│            │                      │                      │              │
│            ▼                      ▼                      ▼              │
│    ┌──────────────────────────────────────────────────────────────┐    │
│    │              Postgres CACHE (products + merchants)           │    │
│    │                                                              │    │
│    │  products table:                                             │    │
│    │    - Ceramic Bedside Lamp ($55, Sol & Clay)                 │    │
│    │    - Ceramic Mushroom Lamp ($54, Sol & Clay)                │    │
│    │    - Wayfair Ceramic Lamp ($48, Wayfair)                    │    │
│    │    - Target Ceramic Vase Lamp ($62, Target)                 │    │
│    │    - ... (all internet results cached)                      │    │
│    │                                                              │    │
│    │  merchants table:                                            │    │
│    │    - Sol & Clay, North Loom (seeded)                       │    │
│    │    - Wayfair, Target, ... (auto-inserted from web)          │    │
│    └──────────────────────────┬───────────────────────────────────┘    │
│                               │                                        │
│                               ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │         search_products() queries the Postgres CACHE          │      │
│  │                                                              │      │
│  │    SELECT * FROM products WHERE available=true               │      │
│  │    ORDER BY vibe_relevance_score, price_cents                │      │
│  │    LIMIT 4                                                   │      │
│  │                                                              │      │
│  │    (This is what the agent already calls via the tool)       │      │
│  └──────────────────────────┬───────────────────────────────────┘      │
│                             │                                           │
│                             ▼                                           │
│  Agent picks best match → add_item → cart → checkout                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key difference from v1:** The DB is the cache, not the source. Internet search happens first (multiple queries), results are persisted, then `search_products` reads from the cache.

---

## 4. Design Principle

> **The Postgres database caches what the agent finds on the internet. `search_products` always queries the cache. The cache is populated by internet searches triggered by the agent's search queries.**

This means:
- `searchProducts()` in `products.ts` stays as-is (queries Postgres) — but Postgres now contains real internet results
- A **separate search layer** handles the internet calls and caches results
- The agent triggers this layer when it needs to search
- The cache persists across turns, sessions, and restarts

---

## 5. New Components

### 5.1 `lib/server/internetSearch.ts` — Internet Search Provider

Responsible for calling external APIs (Serper.dev) to find real products on the internet.

```ts
// Interface for a provider
interface SearchProvider {
  name: string
  search(query: string, category?: string, maxPriceCents?: number): Promise<InternetProduct[]>
}

// Serper.dev implementation
export class SerperProvider implements SearchProvider {
  name = 'serper'
  async search(query, category?, maxPriceCents?): Promise<InternetProduct[]> {
    // Call Serper API with tbm=shop filter
    // Parse product cards: title, price, source (merchant), link, image
    // Normalize to InternetProduct[]
    // Filter by maxPriceCents
  }
}
```

**`InternetProduct` shape:**
```ts
interface InternetProduct {
  query: string           // the search query this result came from
  title: string
  priceCents: number
  merchantName: string
  productUrl: string
  imageUrl: string
  category: string        // inferred from query
}
```

### 5.2 `lib/server/productCache.ts` — Cache Layer

Responsible for caching internet search results in Postgres and managing deduplication.

```ts
// Cache a batch of internet results for a given query
export async function cacheSearchResults(
  query: string,
  results: InternetProduct[],
  db: SupabaseClient,
): Promise<void> {
  for (const product of results) {
    // Upsert into products table (by deterministic ID: hash(provider + title))
    // Upsert into merchants table (insert if not exists)
    // Link product to merchant
  }
}

// Check if a query's results are already cached
export async function isCached(query: string, db: SupabaseClient): Promise<boolean> {
  // Check if any products exist with this query in metadata
}

// Get cached products for a query
export async function getCachedProducts(
  query: string,
  category?: string,
  maxPriceCents?: number,
  db: SupabaseClient,
): Promise<Product[]> {
  // Query products table, filter by category/price
}
```

**Product ID generation:** `hash('serper' + merchantName + title)` — deterministic, collision-resistant. Same product searched twice gets the same ID.

**Merchant handling:** When an internet result has a merchant not in the local `merchants` table, insert it with `slug: hash(merchantName)` and `checkout_method: 'browser'`.

### 5.3 `lib/server/searchOrchestrator.ts` — The Agent's Search Trigger

This is what the agent calls to perform a full search cycle. It generates queries from vibe terms, searches the internet, and caches results.

```ts
export async function performSearch(
  vibeProfile: VibeProfile,        // from board's vibe_profiles table
  userRequest: string,              // from the user's message
  guestId: string,
  db: SupabaseClient,
): Promise<void> {
  // Step 1: Generate search queries from vibe terms + user request
  const queries = generateSearchQueries(vibeProfile, userRequest)
  // Example: ["warm ceramic lamp", "minimal table lamp", "terracotta home decor lighting"]

  // Step 2: For each query, search internet and cache results
  for (const query of queries) {
    const results = await serperProvider.search(query)
    await cacheSearchResults(query, results, db)
  }

  // Step 3: After caching, the agent calls search_products()
  // which queries the now-populated Postgres cache
}
```

**`generateSearchQueries` logic:**
- Takes the vibe profile facets (colors, materials, styles, shapes, qualities)
- Takes the user's natural language request
- Generates 3-5 queries combining vibe terms with the user request
- Example from README:
  - Vibe: "Sun-Washed Mediterranean" → colors: cream, terracotta, olive → materials: linen, ceramic, rattan
  - User: "Find me a lamp under $70"
  - Queries: ["warm ceramic lamp", "terracotta table lamp", "mediterranean lamp under $70"]

### 5.4 `lib/ai/searchQueryGenerator.ts` — Query Generation (AI-Powered)

The agent uses the LLM to generate search queries from the vibe profile and user request. This is a **single LLM call** that produces structured search queries.

```ts
export async function generateSearchQueries(
  vibeProfile: Record<string, unknown>,  // the profile_json from vibe_profiles
  userRequest: string,
): Promise<string[]> {
  // Call LLM (same model as the agent) with a structured prompt:
  // "Given this vibe profile and user request, generate 3-5 search queries
  //  that would find relevant products on an online store.
  //  Return only a JSON array of strings."

  // Example:
  // Vibe: { colors: ["cream", "terracotta"], materials: ["ceramic"], styles: ["coastal"] }
  // Request: "Find me a lamp under $70"
  // Output: ["warm ceramic lamp", "minimal table lamp", "terracotta home decor lighting"]
}
```

**Why AI generates queries instead of a rule-based approach:**
- Vibe profiles have complex facet combinations that are hard to rule-based
- The LLM understands semantic relationships between facets
- Queries naturally vary in specificity and phrasing
- Same approach as the rest of the system (the shopping agent already uses LLM)

---

## 6. Modified Components

### 6.1 `shoppingTools.ts` — Modified `search_products` Tool

The `search_products` tool stays the same interface but now queries a Postgres DB that **contains internet results**:

```ts
// No code change needed in shoppingTools.ts!
// searchProducts() queries Postgres, and Postgres now has internet results cached.
// The agent calls search_products, which reads from the cache.
```

**However**, the first time the agent searches, the cache is empty. The `search_products` tool needs to handle this:

```ts
execute: logged('search_products', async ({ query, category, maxPriceCents }) => {
  // Check if results are cached for this query
  const cached = await getCachedProducts(query, category, maxPriceCents, db)
  
  if (cached.length === 0) {
    // Cache miss: trigger internet search and cache results
    // This means the first search takes longer, but subsequent searches are fast
    const vibeProfile = await getVibeProfile(guestId, boardId, db)
    await performSearch(vibeProfile, query, guestId, db)
    return getCachedProducts(query, category, maxPriceCents, db)
  }
  
  return cached.slice(0, CANDIDATE_POOL_SIZE)
}),
```

### 6.2 `shoppingAgent.ts` — Modified to Trigger Internet Search

The `runShoppingAgentTurn` function should also proactively search the internet when a vibe profile exists:

```ts
export async function runShoppingAgentTurn(input: ShoppingAgentTurnInput) {
  const { guestId, boardId, userMessage, conversationHistory = [], model } = input

  // Load vibe profile
  const vibeProfile = await getVibeProfile(guestId, boardId)
  const vibePhrase = vibeProfile?.profile as { phrase?: unknown } | undefined)?.phrase ?? null

  // NEW: Proactively search the internet based on vibe terms
  // This populates the cache before the agent starts its tool loop
  const queries = await generateSearchQueries(vibeProfile.profile, userMessage)
  for (const query of queries) {
    await performSearch(vibeProfile, query, guestId, db)
  }

  // Rest of existing logic: create tools, call runAgentTurn, etc.
  const tools = createShoppingTools(guestId, boardId)
  const result = await runAgentTurn({ model, tools, system, messages })
  
  // ...rest unchanged
}
```

### 6.3 `products.ts` — No Logic Change, But Now Contains Internet Results

`searchProducts()` stays the same code — it queries Postgres. But Postgres now contains real internet results that were cached by the search layer.

The existing token-based keyword matching in `products.ts` works fine on cached results because:
- Internet results are stored in the same `products` table with the same columns
- The `name`, `description`, `category` fields are populated from internet results
- The token matching logic already handles multi-word queries

---

## 7. Complete Data Flow

User: *"Find me a warm ceramic lamp under $70"*
Board has Vibe Profile: `{ colors: ["cream", "terracotta"], materials: ["ceramic"], styles: ["coastal", "minimal"] }`

```
1. runShoppingAgentTurn() is called
   │
   ├── Load vibe profile from Postgres (vibe_profiles table)
   │
   ├── Generate 3-5 search queries from vibe terms + user request
   │    Queries: ["warm ceramic lamp", "minimal table lamp", "terracotta home decor lighting"]
   │
   ├── For each query:
   │    ├── Check cache → miss (first time)
   │    ├── Call Serper.dev: GET /search?q=warm+ceramic+lamp&tbm=shop
   │    ├── Parse results: [Ceramic Bedside Lamp ($55), Wayfair Ceramic Lamp ($48), ...]
   │    ├── Upsert into Postgres products/merchants tables
   │    └── Cache populated
   │
   ├── Agent tool loop begins:
   │    │
   │    ├── search_products({ query: "warm ceramic lamp", maxPriceCents: 7000 })
   │    │    └── Queries Postgres cache → returns 4 products
   │    │
   │    ├── Agent picks Ceramic Bedside Lamp ($55)
   │    ├── add_item → persists to cart_items in Postgres
   │    │
   │    └── Final reply: "Added the Ceramic Bedside Lamp to your cart for $55.00"
   │
   └── User can continue the conversation:
        ├── New requests use the same cached results (no API calls needed)
        ├── swap_item reuses cached candidates from original search
        └── Cache persists across turns, sessions, and restarts
```

---

## 8. Cache Behavior

| Scenario | Behavior |
|---|---|
| First search for "warm ceramic lamp" | Cache miss → call Serper → cache results → return to agent |
| Second search for "warm ceramic lamp" | Cache hit → return from Postgres (fast) |
| User asks "find a lamp under $50" | New query → call Serper → cache → return |
| User continues conversation with same vibe | All relevant results already cached → fast reads |
| Serper API down | Cache miss → return empty, log error → agent sees no internet results but local seeded products still work |
| Server restart | Cache persists in Postgres → no API calls needed for previously searched queries |
| Cache too old (no searches in 24h) | Optional: stale-while-revalidate, refresh on next access |

---

## 9. Cache Table Schema

No new tables needed. The existing `products` and `merchants` tables serve as the cache. Products from the internet are indistinguishable from seeded products in the schema.

To track which products came from the internet, add a column to `products`:

```sql
-- Migration: add source tracking to products
alter table public.products add column source text default 'local';
-- 'local' = seeded demo products, 'internet' = from web search, 'api' = from external feed
```

```sql
-- Optional: track which search query produced this product
create table public.product_search_queries (
  product_id uuid references public.products(id),
  query text not null,
  provider text not null,
  created_at timestamptz not null default now(),
  unique (product_id, query)
);
```

---

## 10. Implementation Plan

### Phase 1: Internet Search + Cache (MVP)

**Files to create/modify:**

| File | Action | Description |
|---|---|---|
| `lib/server/internetSearch.ts` | Create | Serper.dev client, parses product cards |
| `lib/server/productCache.ts` | Create | Upserts results into products/merchants tables |
| `lib/server/searchOrchestrator.ts` | Create | Generates queries, calls internet, caches |
| `lib/ai/searchQueryGenerator.ts` | Create | LLM call to generate search queries from vibe terms |
| `lib/ai/shoppingAgent.ts` | Modify | Proactively search internet on each turn |
| `lib/ai/tools/shoppingTools.ts` | Modify | Handle cache miss in `search_products` |
| `apps/web/lib/server/products.ts` | No logic change | Queries cache; cache is now populated |
| `apps/web/scripts/.env.example` | Modify | Add `SERPER_API_KEY` |
| `.env.local` | Modify | Add `SERPER_API_KEY` |

### Phase 2: Multi-Provider Support

| File | Action | Description |
|---|---|---|
| `lib/server/providers/base.ts` | Create | Provider interface |
| `lib/server/providers/serper.ts` | Create | Serper.dev implementation |
| `lib/server/providers/amazon.ts` | Create | Amazon PA-API (future) |
| `lib/server/internetSearch.ts` | Modify | Load provider from env var |
| `apps/web/scripts/.env.example` | Modify | Add `PRODUCT_PROVIDER=serper` |

### Phase 3: Advanced Caching

| File | Action | Description |
|---|---|---|
| `lib/server/productCache.ts` | Modify | Add LRU eviction, TTL, staleness tracking |
| `lib/server/internetSearch.ts` | Modify | Add rate limiting, retry logic |
| `apps/web/db/` | Migration | Add `source` column to products, optional `product_search_queries` table |

---

## 11. Error Handling

| Scenario | Behavior |
|---|---|
| Serper API down | Cache miss → return empty. Agent falls back to seeded local products. |
| Serper returns no results | Cache nothing. Agent sees empty results for that query. |
| Rate limit exceeded | Return cached results if available. If no cache, wait and retry. |
| Product price parse fails | Skip that product, log warning, continue with other results |
| Category inference fails | Use query as category, log warning |
| Network timeout | Timeout after 5s per query. Return partial results from completed queries. |
| LLM query generation fails | Fall back to simple query: user request as-is |

**Key principle**: Internet search failures should **never** block the agent. The seeded local products are always available as a fallback. Cache persistence means once results are found, they work even without internet access.

---

## 12. Security & Privacy

- **SERPER_API_KEY** never exposed to the browser. Only server-side code.
- Internet search queries are stored in Postgres but not in a way that links back to a user identity.
- Guest sessions are anonymous. Search results are cached globally (same query = same results for all guests).
- No user-specific data sent to Serper beyond the query string.
- Product URLs from internet results are stored but not fetched or proxied through Mosaic's servers.

---

## 13. Acceptance Criteria

1. **[ ]** Agent generates 3-5 search queries from vibe terms on each turn
2. **[ ]** Each query is sent to Serper.dev (or configured provider) for internet search
3. **[ ]** Results are persisted in Postgres `products` and `merchants` tables (cache)
4. **[ ]** `search_products` returns cached internet results when available
5. **[ ]** Cache hit returns results instantly (no API call)
6. **[ ]** Cache miss triggers internet search and caches results
7. **[ ]** Products from internet search have the same schema as seeded products
8. **[ ]** Merchants from internet results are auto-created in `merchants` table
9. **[ ]** `search_products` still works with seeded local products when no internet results exist
10. **[ ]** `test-agent-live.ts` demonstrates agent finding and adding an internet product
11. **[ ]** `SERPER_API_KEY` required and loaded from `.env.local`
12. **[ ]** Existing tests (`bun test`) still pass with no modifications
13. **[ ]** Cache persists across restarts, turns, and sessions

---

## 14. Open Questions

1. **Should `search_products` handle cache misses transparently (as in §6.1) or should the orchestration happen before the agent loop?** Current plan: both — proactively generate queries at turn start (§6.2), AND handle cache misses in `search_products` (§6.1). This ensures coverage for both planned and spontaneous searches.
2. **Should query generation use the LLM or a rule-based approach?** LLM is better for complex vibe combinations but costs tokens. Rule-based (concat facets + user request) is cheaper but less nuanced. Start with LLM, can switch later.
3. **Do we need `product_search_queries` table?** Useful for analytics and debugging but adds complexity. Phase 2 (when adding `source` column to products).
4. **Should internet products have `checkout_method: 'browser'`?** Yes — they link to external retailer pages. This matches the existing `merchant_orders` pattern where `checkout_method: 'browser'` opens the merchant's checkout page.
5. **Cache invalidation strategy?** TTL-based (e.g., 24 hours). Simple and effective for a first pass. Products don't change drastically in that timeframe.

---

## 15. References

- README product discovery flow: `Vibe Profile → Agent → Search Queries → Provider → Normalized → Filters → Ranking`
- `products.ts`: current `searchProducts()` interface — `searchProducts(query, category, maxPrice)`
- `shoppingTools.ts`: tool definitions — `search_products`, `add_item`, `remove_item`, `replace_item`, `swap_item`, `lock_item`, `unlock_item`, `set_budget`
- `shoppingAgent.ts`: agent turn — loads vibe profile, creates tools, calls `runAgentTurn`
- `harness.ts`: generic tool-calling loop — `generateText` with `ToolSet`
- `providers.ts`: model resolution — `resolveAgentModel()`
- Serper.dev: https://serper.dev — Google Shopping search API (`tbm=shop`)
- Supabase local: `127.0.0.1:54321` (API), `127.0.0.1:54322` (DB)
- `apps/web/lib/server/products.ts` line 80 comment: *"A larger provider should replace this with indexed search while preserving the response contract."*
