"""Aggregation service — set-level facet aggregation and composition."""

import logging
from collections import Counter

import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score

from app.models.facets import FACET_VOCABULARIES, FacetProfile

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

        facet_names = [*FACET_VOCABULARIES.keys(), "color"]

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
        """Compose a vibe phrase from all facets."""
        parts: list[str] = []
        if profile.quality:
            parts.append(profile.quality)
        if profile.color:
            parts.append(profile.color)
        if profile.style:
            parts.append(profile.style)
        if profile.material:
            parts.append(profile.material)

        phrase = " ".join(parts) if parts else ""
        logger.info("Composed phrase: '%s' from parts: %s", phrase, parts)
        return phrase
