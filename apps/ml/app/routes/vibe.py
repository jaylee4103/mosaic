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

    # 3. Zero-shot facet classification per image
    per_image_facets: list[FacetProfile] = []
    for i, emb in enumerate(embeddings):
        profile = await embedder.classify_facets(emb, FACET_VOCABULARIES)
        logger.info("Image %d facets: %s", i, profile.surviving_facets())
        per_image_facets.append(profile)

    # 4. Set-level aggregation (majority-vote)
    aggregated = await aggregator.aggregate(per_image_facets)
    logger.info("Aggregated facets: %s", aggregated.surviving_facets())
    logger.info("Facet confidences: %s", aggregated.confidence)

    # 5. Confidence gating
    facet_confs = [v for v in aggregated.confidence.values() if v > 0]
    confidence = sum(facet_confs) / len(facet_confs) if facet_confs else 0.0
    logger.info("Mean facet confidence: %.3f", confidence)
    if confidence < 0.05:
        return AnalyzeResponse(
            vibe=VibeResult(
                phrase="",
                facets=aggregated,
                confidence=confidence,
                mixed=is_mixed,
                message="Low confidence — try uploading more cohesive images.",
            )
        )

    # 6. Domain routing (cross-domain mode)
    decision = get_decision_client()
    if mode == "cross" and target_domain:
        domain = target_domain
    elif mode == "cross" and decision:
        try:
            domain = await decision.route_domain(aggregated.model_dump_json())
        except Exception:
            domain = "outfit"
    else:
        domain = None

    # 7. Composition
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
