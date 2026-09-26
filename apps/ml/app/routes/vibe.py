"""Vibe detection route — image upload → embedding → aggregation → vibe phrase."""

import logging
import os

from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel

from app.models.facets import FACET_VOCABULARIES, FacetProfile
from app.models.vibe import VibeResult
from app.services.aggregation import AggregationService
from app.services.embedding import EmbeddingService
from app.services.jev import JevClient
from app.services.openrouter import OpenRouterClient

logger = logging.getLogger(__name__)

router = APIRouter()

# Services (initialized on first use for lazy model loading)
_embedding_service: EmbeddingService | None = None
_decision_client: JevClient | OpenRouterClient | None = None
_aggregation_service: AggregationService | None = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


def get_decision_client() -> JevClient | OpenRouterClient | None:
    global _decision_client
    if _decision_client is None:
        jev_key = os.environ.get("TYPESAFE_API_KEY")
        if jev_key:
            _decision_client = JevClient(api_key=jev_key)
        else:
            or_key = os.environ.get("OPENROUTER_API_KEY")
            if or_key:
                _decision_client = OpenRouterClient(api_key=or_key)
    return _decision_client


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
    mode: str = Form("intra"),
    target_domain: str | None = Form(None),
):
    """Analyze a set of images and return a vibe description or recommendation."""
    logger.info("Analyzing %d images (mode=%s)", len(files), mode)

    # 1. Pre-triage with decision layer
    decision = get_decision_client()
    if decision:
        logger.info("Decision client available — running pre-triage")
        keep_indices: list[int] = []
        for i, f in enumerate(files):
            content = await f.read()
            await f.seek(0)
            try:
                is_relevant = await decision.check_relevance(
                    image_url=f.filename or f"image_{i}",
                    content_type=f.content_type or "image/jpeg",
                )
            except Exception:
                is_relevant = True
            if is_relevant:
                keep_indices.append(i)

        if not keep_indices:
            return AnalyzeResponse(
                vibe=VibeResult(
                    phrase="",
                    facets=FacetProfile(),
                    confidence=0.0,
                    mixed=False,
                    message="No relevant images found in the upload set.",
                )
            )

        kept_files = [files[i] for i in keep_indices]
    else:
        logger.info("No decision client — skipping pre-triage")
        kept_files = files

    # 2. Embed each image with SigLIP2
    logger.info("Embedding %d images with SigLIP2", len(kept_files))
    embedder = get_embedding_service()
    embeddings: list[list[float]] = []
    for f in kept_files:
        content = await f.read()
        await f.seek(0)
        embedding = await embedder.embed_image(content)
        embeddings.append(embedding)
    logger.info("Generated %d embeddings (dim=%d)", len(embeddings), len(embeddings[0]) if embeddings else 0)

    # 3. Heterogeneity detection
    aggregator = get_aggregation_service()
    is_mixed = await aggregator.detect_heterogeneity(embeddings)
    logger.info("Heterogeneity detection: mixed=%s", is_mixed)

    # 4. Zero-shot facet classification per image
    per_image_facets: list[FacetProfile] = []
    for i, emb in enumerate(embeddings):
        profile = await embedder.classify_facets(emb, FACET_VOCABULARIES)
        logger.info("Image %d facets: %s", i, profile.surviving_facets())
        per_image_facets.append(profile)

    # 5. Set-level aggregation (majority-vote)
    aggregated = await aggregator.aggregate(per_image_facets)
    logger.info("Aggregated facets: %s", aggregated.surviving_facets())
    logger.info("Facet confidences: %s", aggregated.confidence)

    # 6. Confidence gating
    confidence = 0.5
    if decision:
        try:
            confidence = await decision.score_confidence(aggregated.model_dump_json())
            logger.info("Decision layer confidence: %.3f", confidence)
        except Exception as e:
            confidence = 0.5
            logger.warning("Decision layer failed, using default confidence: %s", e)
    if confidence < 0.3:
        return AnalyzeResponse(
            vibe=VibeResult(
                phrase="",
                facets=aggregated,
                confidence=confidence,
                mixed=is_mixed,
                message="Low confidence — try uploading more cohesive images.",
            )
        )

    # 7. Domain routing (cross-domain mode)
    if mode == "cross" and target_domain:
        domain = target_domain
    elif mode == "cross" and decision:
        try:
            domain = await decision.route_domain(aggregated.model_dump_json())
        except Exception:
            domain = "outfit"
    else:
        domain = None

    # 8. Composition
    if mode == "intra" or domain is None:
        phrase = aggregator.compose_phrase(aggregated)
    else:
        phrase = aggregator.compose_cross_domain(aggregated, domain)

    logger.info("Final result: phrase='%s', confidence=%.3f, mixed=%s, domain=%s",
                phrase, confidence, is_mixed, domain)

    return AnalyzeResponse(
        vibe=VibeResult(
            phrase=phrase,
            facets=aggregated,
            confidence=confidence,
            mixed=is_mixed,
            target_domain=domain,
        )
    )
