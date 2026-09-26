"""Aggregation service — set-level facet aggregation and composition."""

import logging
from collections import Counter

import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score

from app.models.facets import FacetProfile

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.3
SILHOUETTE_THRESHOLD = 0.25


class AggregationService:
    """Aggregates per-image facet profiles into a set-level vibe."""

    async def aggregate(
        self,
        per_image_facets: list[FacetProfile],
    ) -> FacetProfile:
        """Aggregate per-image facet profiles via majority-vote."""
        if not per_image_facets:
            return FacetProfile()

        facet_names = [
            "color_palette", "texture_quality", "light_quality",
            "energy_mood", "density_complexity",
        ]

        aggregated = FacetProfile()
        confidence: dict[str, float] = {}

        logger.info("Aggregating %d per-image facet profiles", len(per_image_facets))

        for facet in facet_names:
            votes = []
            for profile in per_image_facets:
                val = getattr(profile, facet, None)
                if val is not None:
                    votes.append(val)

            if not votes:
                continue

            counter = Counter(votes)
            top_tag, top_count = counter.most_common(1)[0]
            vote_fraction = top_count / len(votes)

            if vote_fraction >= CONFIDENCE_THRESHOLD:
                setattr(aggregated, facet, top_tag)
                confidence[facet] = vote_fraction
                logger.info("Facet %s: %s (%.2f)", facet, top_tag, vote_fraction)
            else:
                logger.info("Facet %s dropped: %s (%.2f < %.2f)", facet, top_tag, vote_fraction, CONFIDENCE_THRESHOLD)

        aggregated.confidence = confidence
        return aggregated

    async def detect_heterogeneity(self, embeddings: list[list[float]]) -> bool:
        """Detect whether the image set is a single vibe or mixed."""
        if len(embeddings) < 3:
            logger.info("Too few images (%d) for heterogeneity detection", len(embeddings))
            return False

        X = np.array(embeddings)
        clustering = AgglomerativeClustering(n_clusters=2, metric="cosine", linkage="average")
        labels = clustering.fit_predict(X)

        if len(set(labels)) < 2:
            logger.info("All images in one cluster — cohesive vibe")
            return False

        score = silhouette_score(X, labels, metric="cosine")
        logger.info("Heterogeneity silhouette score: %.3f", score)
        return score > SILHOUETTE_THRESHOLD

    def compose_phrase(self, profile: FacetProfile) -> str:
        """Compose a vibe phrase from domain-agnostic facets."""
        parts: list[str] = []
        if profile.texture_quality:
            parts.append(profile.texture_quality)
        if profile.color_palette:
            parts.append(profile.color_palette)
        if profile.light_quality:
            parts.append(profile.light_quality)
        if profile.energy_mood:
            parts.append(profile.energy_mood)
        if profile.density_complexity:
            parts.append(profile.density_complexity)

        phrase = " ".join(parts) if parts else ""
        logger.info("Composed phrase: '%s' from parts: %s", phrase, parts)
        return phrase

    async def compose_cross_domain(
        self,
        profile: FacetProfile,
        target_domain: str,
    ) -> str:
        """Compose a cross-domain recommendation phrase."""
        descriptors: list[str] = []
        if profile.color_palette:
            descriptors.append(profile.color_palette)
        if profile.texture_quality:
            descriptors.append(profile.texture_quality)
        if profile.light_quality:
            descriptors.append(profile.light_quality)
        if profile.energy_mood:
            descriptors.append(profile.energy_mood)
        if profile.density_complexity:
            descriptors.append(profile.density_complexity)

        vibe_description = ", ".join(descriptors) if descriptors else "eclectic"
        phrase = f"{vibe_description} {target_domain.replace('_', ' ')}"
        logger.info("Cross-domain phrase: '%s'", phrase)
        return phrase
