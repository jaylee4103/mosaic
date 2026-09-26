# Vibe Detection System — Architecture Spec

> **Status:** Draft v1  
> **Branch:** `vyang/docs-spec-design-doc`  
> **Source:** Architecture research & design handoff (Claude session)

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
┌─────────────────────────────────────────────────────────────────┐
│                     USER SESSION (stateless)                     │
│                                                                 │
│  [Image Set] ──► Perception Layer ──► Aggregation ──► Composer  │
│                      │                      │            │      │
│                      ▼                      ▼            ▼      │
│              Embedding + VLM         Facet Profile    Output     │
│              + Feature Extract       + Clusters       (phrase/  │
│                                                       recommend) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     Jev (TypeSafe AI)          │
              │  Typed decisions downstream    │
              │  of perception layer           │
              └───────────────────────────────┘
```

### Pipeline Stages

1. **Perception** — embed each image, extract structured features
2. **Aggregation** — combine per-image signals into a set-level profile
3. **Composition** — map the profile to language (intra-domain) or route to a target-domain system (cross-domain)
4. **Jev layer** — typed decision-making at classification, routing, gating, and reranking points

---

## 4. Perception Layer

### 4.1 Embedding Backbone

| Option | Notes |
|---|---|
| **SigLIP2** (preferred candidate) | Strong zero-shot performance; confirm fine-tuning support |
| **OpenCLIP** | Alternative; broader community fine-tuning ecosystem |

**Critical finding:** Generic CLIP performs poorly on architecture/interior-design classification due to lack of domain prior knowledge (ArchiCLIP paper). Fine-tuning on a domain-specific dataset (DesignHelper) achieved **85.9% accuracy** on style classification — notably better than generic zero-shot.

**Decision:** Plan for offline fine-tuning on interior-design-style data if the primary use case is interior/room photos. Fall back to zero-shot SigLIP2 for novel domains.

### 4.2 Feature Extractors (per image)

| Feature | Method | Output |
|---|---|---|
| Embedding vector | SigLIP2 / OpenCLIP | `float[N]` |
| VLM caption | Optional per-image captioning | `text` |
| Color palette | Low-level color analysis | Dominant colors, warmth, saturation |
| Scene tags | Zero-shot classification | Tag + confidence per tag |

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

Jev is a non-autoregressive "System One" decision model. Key properties:

- Takes **text/structured state** as input
- Returns **typed answers** (Choice / Score / Noul primitives) with calibrated confidence
- Constrained to a declared schema, in a single parallel pass
- **Not** autoregressive text generation; **not** an image model

### Insertion Points

| # | Insertion Point | Jev Role | Input State | Output |
|---|---|---|---|---|
| 1 | **Facet classification** | Produce structured facet values with calibrated confidence instead of prompting an LLM for JSON | Text description of a vibe | `Choice` per facet + `Score` confidence |
| 2 | **Domain routing** | Route to correct target-domain system | Request text + extracted vibe | `Choice` over known target domains |
| 3 | **Confidence gating** | Decide per-session whether vibe read is solid enough to present | Facet confidences + cluster stats | `Score` confidence; `Noul` if uncertain |
| 4 | **Heterogeneity detection** | "Single cohesive vibe or mixed set?" | Cluster statistics (count, intra/inter distance) | `Choice` + `Noul` |
| 5 | **Candidate reranking** | Judge each candidate against target facets before final ranking | Candidate features + target facets | `Score` per candidate |
| 6 | **Cheap pre-triage** | Relevance/noise check before spending compute | Lightweight per-image metadata | `Choice` keep/discard |

### Key Constraint

Jev **never replaces the perception layer** (CLIP/SigLIP embeddings, VLM captioning) — it always sits downstream, consuming the state that layer produces. A captioning/feature-extraction step must precede it regardless.

### Open Question

Confirm whether Jev's API accepts embeddings/numeric feature vectors directly as state, or only natural-language/JSON descriptions (determines whether a captioning step can be skipped for the Jev stage).

---

## 8. Platform Research Summary

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

---

## 9. Technical Stack (Current Project)

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| UI | shadcn/ui on Base UI, Tailwind CSS 4 |
| Package manager | Bun |
| Deployment | Vercel (git-connected, auto-deploy on push to main) |
| Embedding backbone | SigLIP2 / OpenCLIP (TBD) |
| Decision layer | Jev (TypeSafe AI) — integration pending |

---

## 10. Open Questions & Next Steps

| # | Question / Task | Priority |
|---|---|---|
| 1 | Confirm whether Jev's API accepts embeddings/numeric vectors directly as state, or only text/JSON | High |
| 2 | Source or construct faceted vocabulary banks: (a) interior-design-specific, (b) domain-agnostic | High |
| 3 | Decide embedding backbone: SigLIP2 vs. OpenCLIP | High |
| 4 | Scope a fine-tuning dataset for interior-design-specific style separation (target: ≥85.9% accuracy benchmark) | Medium |
| 5 | Evaluate whether curated cross-domain collections are accessible as training/calibration data | Medium |
| 6 | Prototype aggregation strategy (mean-similarity vs. majority-vote) and confidence-threshold values empirically | Medium |
| 7 | Decide clustering/heterogeneity-detection approach and threshold for flagging "mixed" upload sets | Medium |
| 8 | Build a minimal end-to-end prototype: image upload → embedding → facet classification → vibe phrase | High |

---

## 11. References

- ArchiCLIP paper — domain-specific fine-tuning for architecture/interior style classification
- DesignHelper dataset — interior-design style classification benchmark (85.9% accuracy)
- Pinterest Engineering Blog — Unified Visual Embeddings, PinSage, PinnerSage, PinCLIP, OmniSearchSage, Manas, Shop The Look
- Spotify — daylist feature and audio feature pipeline
- Apple Photos — on-device curation architecture
- TypeSafe AI — Jev model documentation
