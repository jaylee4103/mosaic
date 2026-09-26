"""Vibe detection route — image upload → embedding → aggregation → vibe phrase."""

import logging

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from app.models.facets import FACET_VOCABULARIES, FacetProfile
from app.models.vibe import VibeResult
from app.services.aggregation import AggregationService
from app.services.color import get_color_palette_name
from app.services.embedding import EmbeddingService

logger = logging.getLogger(__name__)

router = APIRouter()

_embedding_service: EmbeddingService | None = None
_aggregation_service: AggregationService | None = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


def get_aggregation_service() -> AggregationService:
    global _aggregation_service
    if _aggregation_service is None:
        _aggregation_service = AggregationService()
    return _aggregation_service


class AnalyzeResponse(BaseModel):
    vibe: VibeResult


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_images(
    files: list[UploadFile] = File(...),
):
    """Analyze a set of images and return a vibe description.

    Color facet uses classical CV (k-means + perceptual color names).
    Other facets use SigLIP2 sigmoid scoring.
    No mode selector — always domain-agnostic.
    """
    logger.info("Analyzing %d images", len(files))

    # 1. Embed each image with SigLIP2
    embedder = get_embedding_service()
    embeddings: list[list[float]] = []
    for f in files:
        content = await f.read()
        await f.seek(0)
        embedding = await embedder.embed_image(content)
        embeddings.append(embedding)
    logger.info("Generated %d embeddings (dim=%d)", len(embeddings), len(embeddings[0]) if embeddings else 0)

    # 2. Heterogeneity detection
    aggregator = get_aggregation_service()
    is_mixed = await aggregator.detect_heterogeneity(embeddings)
    logger.info("Heterogeneity detection: mixed=%s", is_mixed)

    # 3. Facet classification per image
    per_image_facets: list[FacetProfile] = []
    for i, f in enumerate(files):
        # Color facet via classical CV
        content = await f.read()
        await f.seek(0)
        color_name = get_color_palette_name(content)
        logger.info("Image %d color: %s", i, color_name)

        # Other facets via SigLIP2 (color comes from classical CV, not zero-shot)
        non_color_facets = {k: v for k, v in FACET_VOCABULARIES.items() if k != "color"}
        profile = await embedder.classify_facets(embeddings[i], non_color_facets)
        profile.color = color_name
        per_image_facets.append(profile)

    # 4. Set-level aggregation (majority-vote)
    aggregated = await aggregator.aggregate(per_image_facets)
    logger.info("Aggregated facets: %s", aggregated.surviving_facets())

    # 5. Confidence — mean sigmoid probability (naturally small due to logit_bias)
    per_image_probs = []
    for profile in per_image_facets:
        confs = [v for v in profile.confidence.values() if v > 0]
        if confs:
            per_image_probs.append(sum(confs) / len(confs))
    confidence = sum(per_image_probs) / len(per_image_probs) if per_image_probs else 0.0
    logger.info("Mean facet confidence: %.6f", confidence)

    # 6. Composition
    phrase = aggregator.compose_phrase(aggregated)

    logger.info("Final result: phrase='%s', confidence=%.6f, mixed=%s",
                phrase, confidence, is_mixed)

    return AnalyzeResponse(
        vibe=VibeResult(
            phrase=phrase,
            facets=aggregated,
            confidence=confidence,
            mixed=is_mixed,
        )
    )
