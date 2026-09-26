"""Vibe detection route — image upload → embedding → aggregation → vibe phrase."""

import os

import httpx
from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel, Field

from app.models.facets import FACET_VOCABULARIES, FacetProfile
from app.models.vibe import VibeResult
from app.services.embedding import EmbeddingService
from app.services.jev import JevClient
from app.services.aggregation import AggregationService

router = APIRouter()

# Services (initialized on first use for lazy model loading)
_embedding_service: EmbeddingService | None = None
_jev_client: JevClient | None = None
_aggregation_service: AggregationService | None = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


def get_jev_client() -> JevClient:
    global _jev_client
    if _jev_client is None:
        api_key = os.environ["TYPESAFE_API_KEY"]
        _jev_client = JevClient(api_key=api_key)
    return _jev_client


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
    mode: str = Form("intra"),  # "intra" or "cross"
    target_domain: str | None = Form(None),  # e.g., "outfit", "home_goods", "music"
):
    """Analyze a set of images and return a vibe description or recommendation.

    Args:
        files: Uploaded images
        mode: "intra" for vibe description, "cross" for cross-domain recommendation
        target_domain: Target domain for cross-domain mode
    """
    # 1. Pre-triage with Jev — filter out noise images
    jev = get_jev_client()
    keep_indices: list[int] = []
    for i, f in enumerate(files):
        content = await f.read()
        await f.seek(0)
        is_relevant = await jev.check_relevance(
            image_url=f.filename or f"image_{i}",
            content_type=f.content_type or "image/jpeg",
        )
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

    # 2. Embed each image with SigLIP2
    embedder = get_embedding_service()
    embeddings: list[list[float]] = []
    for f in kept_files:
        content = await f.read()
        await f.seek(0)
        embedding = await embedder.embed_image(content)
        embeddings.append(embedding)

    # 3. Heterogeneity detection — single vibe or mixed set?
    aggregator = get_aggregation_service()
    is_mixed = await aggregator.detect_heterogeneity(embeddings)

    # 4. Zero-shot facet classification per image
    per_image_facets: list[FacetProfile] = []
    for emb in embeddings:
        profile = await embedder.classify_facets(emb, FACET_VOCABULARIES)
        per_image_facets.append(profile)

    # 5. Set-level aggregation (majority-vote)
    aggregated = await aggregator.aggregate(per_image_facets)

    # 6. Confidence gating with Jev
    confidence = await jev.score_confidence(aggregated.model_dump_json())
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
    elif mode == "cross":
        domain = await jev.route_domain(aggregated.model_dump_json())
    else:
        domain = None

    # 8. Composition
    if mode == "intra" or domain is None:
        # Intra-domain: template-based phrase composition
        phrase = aggregator.compose_phrase(aggregated)
    else:
        # Cross-domain: VLM bridge → text-to-product retrieval
        phrase = await aggregator.compose_cross_domain(aggregated, domain)

    return AnalyzeResponse(
        vibe=VibeResult(
            phrase=phrase,
            facets=aggregated,
            confidence=confidence,
            mixed=is_mixed,
            target_domain=domain,
        )
    )
