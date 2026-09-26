# Vibe Detection System — Architecture Spec

> **Status:** Draft v2  
> **Branch:** `vyang/docs-spec-design-doc`  
> **Source:** Architecture research & design handoff + implementation research

---

## 1. Problem Statement

Build an AI agent that determines the "vibe" of a set of user-uploaded images and produces either:

- **Intra-domain description** — a short descriptive phrase/keyword set for the images' own aesthetic (e.g., mid-century-modern room photos → `"wood natural midcentury"`)
- **Cross-domain recommendation** — a recommendation in a different domain inspired by that vibe (e.g., mountain/nature photos → an outfit recommendation)

### Key Constraints

| Constraint | Implication |
|---|---|
| **No user account** | Every session is anonymous and stateless — no login history, no persistent profile, no behavioral graph |
| **Arbitrary source domain** | Uploaded images could be interiors, nature, or anything else |
| **Arbitrary target domain** | Output could be a vibe description or a recommendation in a different domain (outfits, home goods, music); source/target pairing isn't known in advance |
| **Reference point** | Spotify's daylist — compound mood phrases like `"melancholy cool chill Saturday morning"` |

---

## 2. Core Design Principle

> **Don't ask a model to invent a vibe from raw pixels in one shot. Compute structured signal first, and treat language generation as a thin final layer.**

Every production system researched (Spotify, Pinterest, Apple Photos) follows this pattern. The intelligence lives in **feature engineering / signal design**, not in a single end-to-end "guess the vibe" model call.

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER SESSION (stateless)                     │
│                                                                     │
│  [Image Set] ──► Perception Layer ──► Aggregation ──► Composer      │
│                      │                      │            │          │
│                      ▼                      ▼            ▼          │
│              Embedding + VLM         Facet Profile    Output         │
│              + Feature Extract       + Clusters        (phrase/     │
│                                                       recommend)    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     Jev (TypeSafe AI)          │
              │  Typed decisions downstream    │
              │  of perception layer           │
              │  (text/JSON state only)        │
              └───────────────────────────────┘
```

### Pipeline Stages

1. **Perception** — embed each image, extract structured features (SigLIP2 + optional VLM captioning)
2. **Aggregation** — combine per-image signals into a set-level facet profile
3. **Composition** — map the profile to language (intra-domain) or route to a target-domain system (cross-domain)
4. **Jev layer** — typed decision-making at classification, routing, gating, and reranking points (consumes text/JSON state only)

---

## 4. Perception Layer

### 4.1 Embedding Backbone

**Decision: SigLIP2** (`google/siglip2-base-patch16-224` or `so400m-patch14-384`)

| Factor | Details |
|---|---|
| **Why SigLIP2** | Outperforms SigLIP 1 at all scales in zero-shot classification, image-text retrieval, and transfer performance |
| **Model size** | Base: 86M params (~0.4B with text tower); SO400M: 400M params |
| **Fine-tuning** | Supported; 129 fine-tuned variants already on HuggingFace |
| **Alternative** | OpenCLIP — broader ecosystem but SigLIP2 is newer and better performing |
| **Domain fine-tuning** | Required for interior-design use case (ArchiCLIP finding: generic CLIP performs poorly on architecture/interior classification) |
| **Target accuracy** | ≥85.9% (DesignHelper benchmark with fine-tuned CLIP) |

### 4.2 Feature Extractors (per image)

| Feature | Method | Output |
|---|---|---|
| Embedding vector | SigLIP2 | `float[N]` |
| VLM caption | Optional per-image captioning (e.g., LLaVA, GPT-4o) | `text` |
| Color palette | Low-level color analysis | Dominant colors, warmth, saturation |
| Scene tags | Zero-shot classification against facet vocabulary | Tag + confidence per tag |

### 4.3 Curated Vocabulary Banks (offline)

Build **faceted vocabulary banks** — separate axes:

| Facet | Example Values |
|---|---|
| Style archetype | `midcentury`, `scandi`, `industrial`, `boho`, `farmhouse` |
| Material | `wood`, `rattan`, `brass`, `linen`, `concrete` |
| Color/tone | `warm`, `muted`, `terracotta`, `cool`, `monochrome` |
| Era/mood | `vintage`, `modern`, `rustic`, `minimal` |

**Source:** Mine from existing public design taxonomies and/or curated board/collection titles as weak labels (same free-supervision idea as Pinterest's boards).

---

## 5. Aggregation Layer

### 5.1 Zero-Shot Classification

For each image and each facet:
- Compute cosine similarity between image embedding and prompted text embeddings (e.g., `"a photo of a {tag} style room"`)
- Take top tag per facet per image

### 5.2 Set-Level Aggregation

| Strategy | Description | When to Use |
|---|---|---|
| **Mean similarity** | Average similarity scores across all N images per tag | Sets with consistent vibe |
| **Majority-vote** | Top tag per facet wins if it appears across >50% of images | Sets with potential strays — **more robust** |

**Recommendation:** Majority-vote as default; fall back to mean similarity for small sets (N < 3).

### 5.3 Confidence Thresholding

- Per-facet confidence score = fraction of images voting for the winning tag (or mean similarity)
- Below threshold → mark facet as `"uncertain"` and **drop it** rather than forcing a label

### 5.4 Heterogeneity Detection (PinnerSage-style)

Before classification, run a quick pre-clustering pass on the set's embeddings:

- If embeddings form **multiple distinct clusters** → the upload may be multiple sub-vibes, not one cohesive vibe
- Handle by: report dominant cluster, or flag as `"mixed"`

This mirrors Pinterest's PinnerSage insight: a heterogeneous set should be represented as **multiple cluster centroids**, not forced into a single blended vibe.

---

## 6. Composition Layer

### 6.1 Intra-Domain (Vibe Description)

Order surviving top tags per facet via a simple template:

```
material → tone → style/era
```

**Example:** `"wood natural midcentury"`

No full generative LLM call needed — the target output is a keyword phrase, not a full sentence.

### 6.2 Cross-Domain (Recommendation)

This is a **different problem** from intra-domain description — not a variation of it.

**Why plain embedding similarity breaks down:** CLIP-style joint embeddings derive their structure from what naturally co-occurs on the web. A mountain photo and a wool sweater don't naturally co-occur in training data, so nothing pulls them together in embedding space.

#### Architecture: Vibe Interlingua

Decouple into two stages connected by a **domain-agnostic intermediate representation**:

```
[Source Images] ──► Stage 1: Vibe Extraction ──► [Vibe Interlingua]
                                                        │
                                                        ▼
                                              Stage 2: Domain-Specific
                                              Retrieval/Generation
                                                        │
                                                        ▼
                                              [Target Recommendation]
```

**Stage 1 — Vibe Extraction (domain-agnostic):**
Describe the source image set's vibe using transferable qualities, not domain-specific labels:

| Facet | Example Values |
|---|---|
| Color palette | `warm earth tones`, `cool blues`, `muted neutrals` |
| Texture/material quality | `rugged`, `smooth`, `weathered`, `soft` |
| Light quality | `crisp`, `hazy`, `golden`, `overcast` |
| Energy/mood | `calm`, `dramatic`, `austere`, `cozy` |
| Density/complexity | `sparse`, `layered`, `busy` |

**Stage 2 — Domain-Specific Retrieval:**
Use Stage 1's output as a query into whichever target-domain system the user's request implies.

#### Bridge Implementation Options

| Approach | Description | Pros | Cons |
|---|---|---|---|
| **(A) Structured shared facet vocabulary** | Tag target catalog with the same domain-agnostic facet vocabulary offline; match by facet-profile similarity at runtime | Deterministic, cheap | Risks straining if domain pair is very dissimilar |
| **(B) Language-mediated bridge** (recommended default) | VLM describes the extracted vibe in free text → that text becomes a query into a text-to-product retrieval system for whichever target domain applies | Flexible; target domains aren't known in general | Adds a VLM call per session |

**Recommendation:** Approach (B) as default, given arbitrary domain pairs. This generalizes Pinterest's OmniSearchSage pattern (one shared query representation retrieving across many different entity types).

#### Additional Lead: Curated Cross-Domain Collections

Check whether curated collections exist that already pair source and target domains under one aesthetic label (e.g., boards mixing landscape photography and clothing under `"alpine core"`). If accessible, this is a **stronger and cheaper training signal** for the bridge than either hand-built shared vocabularies or VLM-mediated description alone.

---

## 7. Jev (TypeSafe AI) Integration

### 7.1 Key Constraint — Text/Only Input

> **Confirmed from TypeSafe docs:** Jev's `state` must be a string, JSON object, or array of text values. **Images, audio, and video are not supported.** Embeddings/numeric feature vectors are not accepted as state.

This means a **captioning/feature-extraction step must precede Jev** regardless. Jev consumes the text/JSON output of the perception layer.

### 7.2 API Overview

```
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**Primitives:**

| Type | Returns | Use Case |
|---|---|---|
| **Choice** | `choice`, `probabilities`, `confidence` | Pick from fixed options (domain routing, facet classification) |
| **Score** | `score`, `legend`, `probabilities`, `confidence` | Rate on a spectrum (confidence gating, candidate reranking) |
| **Noul** | `noul` (0–1) | Yes/no judgment (heterogeneity detection, pre-triage) |

**Key properties:**
- Every question is evaluated in parallel and in isolation against the same state
- Adding questions barely changes response time
- Every answer is constrained to the options you supplied — no hallucinated values
- Confidence included with every answer

### 7.3 Insertion Points

| # | Insertion Point | Jev Role | Input State | Output |
|---|---|---|---|---|
| 1 | **Facet classification** | Produce structured facet values with calibrated confidence | Text/JSON description of a vibe | `Choice` per facet + `Score` confidence |
| 2 | **Domain routing** | Route to correct target-domain system | Request text + extracted vibe | `Choice` over known target domains |
| 3 | **Confidence gating** | Decide whether vibe read is solid enough to present | Facet confidences + cluster stats | `Score` confidence; `Noul` if uncertain |
| 4 | **Heterogeneity detection** | "Single cohesive vibe or mixed set?" | Cluster statistics as text/JSON | `Choice` + `Noul` |
| 5 | **Candidate reranking** | Judge each candidate against target facets | Candidate features + target facets | `Score` per candidate |

### 7.4 Pricing

- $42 per billion input tokens (238x lower than Claude Fable 5.1)
- 193.6x faster, 444.6x cheaper than LLMs for System One tasks
- A typical call: ~392 input tokens, ~65 output tokens → ~$0.000081

---

## 8. Implementation Architecture

### 8.1 Deployment Decision

| Option | Approach | Pros | Cons |
|---|---|---|---|
| **A — All on Vercel** | Next.js + Python FastAPI on Vercel | Single platform, git-connected | SigLIP2 model (~1.6GB FP32) exceeds Vercel's 500MB standard bundle limit; cold starts slow |
| **B — Hybrid (recommended)** | Next.js frontend on Vercel + Python ML service on separate host | Best of both: frontend deploys on Vercel, ML has full flexibility | Two services to manage |
| **C — All Python** | FastAPI backend + Next.js frontend all in Python service | Single language | Vercel's Next.js integration is best-in-class |

**Recommendation: Option B — Hybrid**

### 8.2 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        VERCEL                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Next.js 16 (TypeScript, App Router)                  │    │
│  │  - UI (shadcn/ui on Base UI, Tailwind 4)              │    │
│  │  - Image upload → POST to ML service                  │    │
│  │  - Display vibe results                               │    │
│  └──────────────────────────────────────────────────────┘    │
│                         │                                     │
│                         │ HTTP (REST)                         │
│                         ▼                                     │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              PYTHON ML SERVICE (separate host)                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  FastAPI (Python 3.12+)                                │    │
│  │                                                        │    │
│  │  POST /api/vibe/analyze                                │    │
│  │    ├── 1. SigLIP2 embedding (per image)               │    │
│  │    ├── 2. VLM captioning (optional, per image)        │    │
│  │    ├── 3. Zero-shot facet classification              │    │
│  │    ├── 4. Set-level aggregation (majority-vote)       │    │
│  │    ├── 5. Heterogeneity detection                     │    │
│  │    ├── 6. Confidence gating                          │    │
│  │    └── 7. Composition (template or VLM bridge)        │    │
│  │    ├── 1. SigLIP2 embedding (per image)               │    │
│  │    ├── 2. VLM captioning (optional, per image)        │    │
│  │    ├── 3. Zero-shot facet classification              │    │
│  │    ├── 4. Set-level aggregation (majority-vote)       │    │
│  │    ├── 5. Heterogeneity detection                     │    │
│  │    ├── 6. Confidence gating                          │    │
│  │    └── 7. Composition (template or VLM bridge)        │    │
│  │    ├── 1. SigLIP2 embedding (per image)               │    │
│  │    ├── 2. VLM captioning (optional, per image)        │    │
│  │    ├── 3. Zero-shot facet classification              │    │
│  │    ├── 4. Set-level aggregation (majority-vote)       │    │
│  │    ├── 5. Heterogeneity detection                     │    │
│  │    ├── 6. Confidence gating                          │    │
│  │    └── 7. Composition (template or VLM bridge)        │    │
│  │    ├── 1. SigLIP2 embedding (per image)               │    │
│  │    ├── 2. VLM captioning (optional, per image)        │    │
│  │    ├── 3. Zero-shot facet classification              │    │
│  │    ├── 4. Set-level aggregation (majority-vote)       │    │
│  │    ├── 5. Heterogeneity detection                     │    │
│  │    ├── 6. Confidence gating                          │    │
│  │    └── 7. Composition (template or VLM bridge)        │    │
│  │    ├── 1. SigLIP2 embedding (per image)               │    │
│  │    ├── 2. VLM captioning (optional, per image)        │    │
│  │    ├── 3. Zero-shot facet classification              │    │
│  │    ├── 4. Set-level aggregation (majority-vote)       │    │
│  │    ├── 5. Heterogeneity detection                     │    │
│  │    ├── 6. Confidence gating                          │    │
│  │    └── 7. Composition (template or VLM bridge)        │    │
│  │    ├── 1. SigLIP2 embedding (per image)               │    │
│  │    ├── 2. VLM captioning (optional, per image)        │    │
│  │    ├── 3. Zero-shot facet classification              │    │
│  │    ├── 4. Set-level aggregation (majority-vote)       │    │
│  │    ├── 5. Heterogeneity detection                     │    │
│  │    ├── 6. Confidence gating                          │    │
│  │    └── 7. Composition (template or VLM bridge)        │    │
│  │                                                        │    │
│  │  Jev API calls (text/JSON state only)                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Model: SigLIP2 (quantized to ~800MB with INT8)              │
│  Host: Railway / Render / Fly.io / AWS ECS                   │
└──────────────────────────────────────────────────────────────┘
```

### 8.3 Why a Separate Python Service?

| Factor | Vercel Python Runtime | Separate Python Service |
|---|---|---|
| **Bundle size** | 500MB standard, 5GB Large Functions beta | Unlimited (container-based) |
| **Model size** | SigLIP2 base ~1.6GB FP32 — too large even for standard | Fits comfortably |
| **Cold start** | Significant with large model | Can use pre-warmed instances |
| **GPU support** | Not available | Available if needed |
| **Python ecosystem** | Limited (transformers/torch may not fit) | Full ecosystem |
| **Scaling** | Manual | Auto-scaling available |
| **Deployment** | Git-connected, zero config | Requires container/service setup |

### 8.4 Language Choice

| Layer | Language | Rationale |
|---|---|---|
| **Frontend** | TypeScript (Next.js 16) | Existing project, best-in-class SSR, Vercel integration |
| **ML inference** | Python 3.12+ | Native support for `transformers`, `torch`, `siglip`, `fastapi` |
| **Jev API** | Python (from ML service) | Simple HTTP call; no need for separate service |

**The ML service MUST be Python** — the `transformers` library, SigLIP2, and the entire ML ecosystem are Python-first. There is no production-grade TypeScript alternative for running SigLIP2 inference locally.

### 8.5 Python ML Service — Recommended Host

| Host | Starting Cost | Key Benefit |
|---|---|---|
| **Railway** | ~$5/mo | Simplest deployment, good DX, auto-scaling |
| **Render** | ~$7/mo | Similar to Railway, good Python support |
| **Fly.io** | ~$5/mo | Edge deployment, fast cold starts |
| **AWS ECS (Fargate)** | ~$30/mo | Production-grade, VPC networking |
| **Vercel (Python runtime)** | $0 (Hobby) | Tight integration but bundle limits |

**Recommendation: Railway or Render** — simplest container deployment, enough compute for SigLIP2 inference, reasonable cost for a hackathon project.

---

## 9. Open Questions — Resolved

| # | Question | Answer |
|---|---|---|
| 1 | Does Jev accept embeddings/numeric vectors? | **No.** State must be string, JSON object, or array of text values. A captioning/feature-extraction step must precede Jev. |
| 2 | Source/construct faceted vocabulary banks | **Use Pinterest board titles, design blog tags, and Instagram aesthetic hashtags as weak labels.** Start with ~50 tags per facet, expand based on user uploads. |
| 3 | SigLIP2 vs. OpenCLIP? | **SigLIP2.** Newer (Feb 2025), outperforms SigLIP 1 at all scales, 129 fine-tuned variants on HuggingFace. |
| 4 | Fine-tuning dataset for interior design? | **DesignHelper dataset** (referenced in ArchiCLIP paper) — target ≥85.9% accuracy. Also consider scraping Pinterest board titles as weak supervision. |
| 5 | Curated cross-domain collections? | **Check Pinterest API** for boards mixing nature + fashion under aesthetic labels. If accessible, use as training signal for the cross-domain bridge. |
| 6 | Aggregation strategy? | **Majority-vote** for robust results; mean similarity for small sets (N < 3). Prototype both empirically. |
| 7 | Heterogeneity detection approach? | **Hierarchical agglomerative clustering** (Apple Photos approach) with median-distance linkage on SigLIP2 embeddings. Flag as "mixed" if silhouette score < threshold. |
| 8 | Minimal end-to-end prototype? | **See §10 below.** |

---

## 10. Minimal End-to-End Prototype

### Phase 1: Proof of Concept (Days 1–3)

**Goal:** Image upload → SigLIP2 embedding → zero-shot facet classification → vibe phrase

1. **Set up Python FastAPI service** on Railway/Render
2. **Load SigLIP2** (`google/siglip2-base-patch16-224`)
3. **Build facet vocabulary bank** (manually curate ~30 tags per facet for interior design)
4. **Implement zero-shot classification** per image
5. **Implement majority-vote aggregation** across image set
6. **Template-based composition** → vibe phrase
7. **Wire up Next.js frontend** → POST to ML service → display result

### Phase 2: Jev Integration (Days 4–5)

1. **Add Jev pre-triage** — filter out noise images before embedding
2. **Add Jev confidence gating** — decide if vibe read is solid enough
3. **Add Jev heterogeneity detection** — "single vibe or mixed set?"
4. **Add Jev domain routing** — route to intra-domain vs. cross-domain

### Phase 3: Cross-Domain Bridge (Days 6–8)

1. **Implement VLM captioning** for cross-domain vibe extraction
2. **Build language-mediated bridge** — VLM describes vibe → text query → target catalog
3. **Test with nature → outfit** as primary cross-domain case
4. **Add Jev candidate reranking** — score candidates against target facets

### Phase 4: Polish (Days 9–10)

1. **Fine-tune SigLIP2** on interior design dataset (if time permits)
2. **Optimize aggregation** — prototype mean vs. majority-vote
3. **Add uncertainty handling** — graceful fallback when confidence is low
4. **Polish UX** — loading states, error handling, result presentation

---

## 11. Platform Research Summary

| Platform | Key Insight | Lesson for Vibe Detection |
|---|---|---|
| **Spotify (daylist)** | Per-track audio features computed once, aggregated, then mapped to language | Feature engineering and language-mapping are separate concerns |
| **Pinterest (unified embeddings)** | Consolidated per-product embeddings into one shared multi-task embedding space | One shared embedding space, not bespoke models per feature |
| **Pinterest (PinSage)** | GCN on pin-board graph; co-curated images land close together | Human-curated boards = free pre-labeled vibe clusters |
| **Pinterest (PinnerSage)** | User represented as multiple interest-cluster embeddings, not one averaged embedding | Heterogeneous sets → multiple centroids, not one blended vibe |
| **Pinterest (PinCLIP)** | CLIP architecture trained with co-save signal (not caption-image pairs) | Same architecture, different (behavioral) supervision |
| **Pinterest (OmniSearchSage)** | Multi-task embeddings across queries, pins, products, boards in one space | Generalized pattern for bridging arbitrary domains via one shared representation |
| **Pinterest (Manas)** | HNSW-based ANN retrieval at scale | Production-grade similarity search infrastructure |
| **Pinterest (Shop The Look)** | Object detection → per-object embedding → same-space product matching | Only works when source and target share object categories; does not solve cross-domain aesthetic resonance |
| **Apple Photos** | On-device curation; hierarchical agglomerative clustering with median-distance linkage; batch overnight | If privacy constraints apply: model size and clustering must fit on-device budget; batch-during-idle becomes part of architecture |
| **TypeSafe AI (Jev)** | Typed decisions with calibrated confidence; text/JSON state only; 193x faster than LLMs | Ideal for facet classification, routing, gating, reranking — but requires perception layer to produce text/JSON state first |
| **Google (SigLIP2)** | Outperforms SigLIP 1 at all scales; supports fine-tuning; strong zero-shot | Right embedding backbone for the perception layer |

---

## 12. Technical Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| UI components | shadcn/ui on Base UI, Tailwind CSS 4 |
| Package manager (frontend) | Bun |
| Frontend hosting | Vercel (git-connected, auto-deploy on push to main) |
| ML service framework | FastAPI (Python 3.12+) |
| ML service hosting | Railway / Render / Fly.io |
| Embedding model | SigLIP2 (`google/siglip2-base-patch16-224`) |
| Decision model | Jev (TypeSafe AI) — text/JSON state only |
| Model quantization | INT8 (reduces SigLIP2 from ~1.6GB to ~800MB) |
| Clustering | Hierarchical agglomerative (scikit-learn) |
| Cross-domain bridge | VLM captioning → text-to-product retrieval |

---

## 13. References

- ArchiCLIP paper — domain-specific fine-tuning for architecture/interior style classification
- DesignHelper dataset — interior-design style classification benchmark (85.9% accuracy)
- Pinterest Engineering Blog — Unified Visual Embeddings, PinSage, PinnerSage, PinCLIP, OmniSearchSage, Manas, Shop The Look
- Spotify — daylist feature and audio feature pipeline
- Apple Photos — on-device curation architecture
- TypeSafe AI — Jev model documentation (docs.typesafe.ai)
- Google — SigLIP 2 paper (arXiv:2502.14786) and HuggingFace model family
- Vercel — Python runtime documentation
