# Vibe Detection Model — Debugging & Improvement Guide

## The Real Root Cause: SigLIP2 ≠ CLIP

**SigLIP2 uses independent sigmoid loss, not softmax contrastive loss.** The HuggingFace reference implementation confirms: inference is `probs = torch.sigmoid(logits_per_image)`, not a softmax over candidates. Each label gets its own independent yes/no probability; probabilities across labels don't compete and don't sum to 1.

**Current bug:** Our implementation computes softmax across facet tags over raw, unscaled cosine similarities (which naturally sit in a tight ~0.1–0.3 range). This alone produces near-uniform "probabilities" around 0.10–0.19, because raw cosine similarity has nowhere near enough spread for softmax to sharpen.

**The fix:** Use `sigmoid(cosine_similarity × logit_scale + logit_bias)` per-label independently, using the model's own learned scale/bias. Never softmax across labels.

## Critical Implementation Details

### 1. Scoring Pipeline
```
# WRONG — current implementation
softmax(cosine_similarity × TEMPERATURE)  # across all labels in a facet

# CORRECT — matches SigLIP2 training
sigmoid(cosine_similarity × logit_scale + logit_bias)  # per-label, independent
```

Where `logit_scale` and `logit_bias` come from the model's config:
- `model.config.logit_scale` (learned, typically ~100)
- `model.config.logit_bias` (learned, typically ~-10)

### 2. Text Preprocessing
Must exactly match training defaults:
- **Lowercased** text (processor handles automatically)
- `padding="max_length"`, `max_length=64`
- Overriding these defaults degrades quality

### 3. Prompt Template
Current: `"a photo of {tag}"` → Wrong

Fix: `"This is a photo of {tag}."` — matches the pipeline's expected template

Source: https://huggingface.co/docs/transformers/en/model_doc/siglip2

### 4. Prompt Ensembling
- Use 5–7 validated templates per tag, average similarities
- Don't blindly reuse CLIP's 80-prompt ImageNet ensemble
- SigLIP2-specific: some generic templates hurt accuracy
- Build/validate your own small template ensemble against your facet vocabulary

Source: CLIP paper (Radford et al., 2021) — 80-template ensemble improved ImageNet from 66.9% → 68.6%

## The Color Facet: Stop Using Zero-Shot Classification

Color is a solved classical CV problem. Don't route it through SigLIP text-matching.

### Standard Pipeline
1. **Downsample** image to ~100×100 (noise reduction, compute savings)
2. **K-means clustering** on pixel colors (RGB or perceptual space), k≈8–9 clusters
3. **Sort clusters by size** — centroids are dominant colors ranked by prevalence
4. **Map each centroid** to nearest name in curated color-name palette using **perceptual distance** (Delta E / CIE2000), not raw RGB distance

### Why This Fixes Color
- Not sensitive to "too-generic vocabulary" (nearest-neighbor against real pixel colors, not fuzzy semantic guessing)
- Naturally supports evocative names like `"forest greens"`, `"ocean blues"` via hue/saturation/lightness mapping
- No model-confusion risk — no sigmoid/softmax involved
- Sidesteps the SigLIP calibration problem entirely for this facet

## Vocabulary Expansion — Careful Approach

For non-color facets (texture, light, energy, density), expanding to 30–50 specific tags is reasonable, BUT:

- Adding many near-synonymous tags can **increase confusion** rather than reduce it
- SigLIP2's flatter margins already struggle with visually-adjacent classes
- **Hierarchical classification** beats flat expansion for muddy facets:
  1. Coarse category first (e.g., `"warm/cool/neutral"`)
  2. Fine-grained within the winning coarse bucket

## SigLIP vs OpenCLIP for Facet Scoring

If margins stay flat after all fixes above, benchmark OpenCLIP against SigLIP2 for facet-scoring:

- SigLIP's sigmoid objective produces flatter distributions in closed-set comparisons
- CLIP's softmax training explicitly creates cross-class competition → larger score margins
- Practical: SigLIP2 for retrieval-shaped tasks, OpenCLIP for classification-shaped tasks

## Priority Order

| # | Task | Impact |
|---|---|---|
| 1 | Fix scoring: sigmoid(logit_scale·cos_sim + logit_bias) per-label | Critical — explains most symptoms |
| 2 | Replace color facet with classical CV (k-means + color names) | High — eliminates color errors entirely |
| 3 | Fix prompt template to `"This is a photo of {tag}."` | High — matches training |
| 4 | Add small validated prompt ensemble (5–7 templates) | Medium — improves robustness |
| 5 | Expand non-color vocabulary carefully (30–50 tags, hierarchical) | Medium — improves discrimination |
| 6 | Benchmark OpenCLIP vs SigLIP2 for facet scoring | Fallback if margins still flat |

## Test Protocol

```bash
cd apps/ml
source .venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Test with real photos
curl -X POST http://localhost:8000/api/vibe/analyze -F "files=@real_photo.jpg" -F "mode=intra"
```

**Success criteria:**
- Different images produce clearly different facets
- Confidence varies meaningfully
- Nature photos get `"forest greens"`, not `"black and white"`
- Color facet uses k-means, not zero-shot

## Sources

- https://huggingface.co/docs/transformers/en/model_doc/siglip2
- https://huggingface.co/blog/siglip2
- https://arxiv.org/abs/2502.14786
- CLIP paper (Radford et al., 2021) — prompt ensembling
