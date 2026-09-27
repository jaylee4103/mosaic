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
AGGREGATE_TOP_K = 2
MIN_SURVIVING_FACETS = 4


class AggregationService:
    """Aggregates per-image facet profiles into a set-level vibe."""

    async def aggregate(
        self,
        per_image_facets: list[FacetProfile],
    ) -> FacetProfile:
        """Aggregate per-image facet profiles via majority-vote over each
        image's top-k tags, keeping the top-k tags that survive at the set level.

        Voting over each image's full top-k list (instead of only its #1 pick)
        means a tag that's the runner-up on every image but never wins any
        single image can still surface as the set-level consensus.

        Facets are optional — a facet with no confident consensus (e.g. no
        real "terrain" in a product photo) is dropped rather than forced.
        But if that leaves fewer than MIN_SURVIVING_FACETS, the highest-fraction
        runners-up are backfilled even below CONFIDENCE_THRESHOLD, so the
        profile doesn't collapse to almost nothing on noisy image sets.
        """
        if not per_image_facets:
            return FacetProfile()

        facet_names = [*FACET_VOCABULARIES.keys(), "color"]
        num_images = len(per_image_facets)

        aggregated = FacetProfile()
        fallbacks: list[tuple[float, str, list[tuple[str, float]]]] = []

        logger.info("Aggregating %d per-image facet profiles", num_images)

        for facet in facet_names:
            votes: list[str] = []
            for profile in per_image_facets:
                votes.extend(getattr(profile, facet, []))

            if not votes:
                continue

            counter = Counter(votes)
            ranked = [(tag, count / num_images) for tag, count in counter.most_common()]
            survivors = [r for r in ranked if r[1] >= CONFIDENCE_THRESHOLD][:AGGREGATE_TOP_K]

            if survivors:
                setattr(aggregated, facet, [tag for tag, _ in survivors])
                logger.info("Facet %s: %s", facet, survivors)
            else:
                best_fraction = ranked[0][1]
                fallbacks.append((best_fraction, facet, ranked[:AGGREGATE_TOP_K]))
                logger.info(
                    "Facet %s below threshold: best %s (%.2f < %.2f), held as fallback",
                    facet, ranked[0][0], best_fraction, CONFIDENCE_THRESHOLD,
                )

        surviving_count = sum(1 for f in FACET_VOCABULARIES.keys() if getattr(aggregated, f, None)) + (
            1 if aggregated.color else 0
        )
        fallbacks.sort(key=lambda f: f[0], reverse=True)
        for best_fraction, facet, ranked in fallbacks:
            if surviving_count >= MIN_SURVIVING_FACETS:
                break
            setattr(aggregated, facet, [tag for tag, _ in ranked])
            surviving_count += 1
            logger.info("Facet %s backfilled below threshold to meet minimum: %s", facet, ranked)

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
        """Compose a vibe phrase from each facet's top-ranked tag."""
        parts: list[str] = []
        if profile.quality:
            parts.append(profile.quality[0])
        if profile.color:
            parts.append(profile.color[0])
        if profile.style:
            parts.append(profile.style[0])
        if profile.terrain:
            parts.append(profile.terrain[0])
        if profile.locale:
            parts.append(profile.locale[0])
        if profile.shape:
            parts.append(profile.shape[0])
        if profile.material:
            parts.append(profile.material[0])

        phrase = " ".join(parts) if parts else ""
        logger.info("Composed phrase: '%s' from parts: %s", phrase, parts)
        return phrase
