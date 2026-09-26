"""Aggregation service — set-level facet aggregation and composition."""

import logging
from collections import Counter

import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score

from app.models.facets import FacetProfile

logger = logging.getLogger(__name__)

# Confidence threshold — facets below this are dropped as uncertain
CONFIDENCE_THRESHOLD = 0.3

# Silhouette score threshold for heterogeneity detection
SILHOUETTE_THRESHOLD = 0.25


class AggregationService:
    """Aggregates per-image facet profiles into a set-level vibe.

    Implements:
    - Majority-vote aggregation (robust to strays)
    - Confidence thresholding (drop uncertain facets)
    - Heterogeneity detection via hierarchical clustering
    - Template-based phrase composition
    """

    async def aggregate(
        self,
        per_image_facets: list[FacetProfile],
    ) -> FacetProfile:
        """Aggregate per-image facet profiles into a single set-level profile.

        Uses majority-vote: the tag that appears most frequently across
        images wins per facet. Confidence = fraction of images voting
        for the winning tag.

        Args:
            per_image_facets: One FacetProfile per image.

        Returns:
            Aggregated FacetProfile.
        """
        if not per_image_facets:
            return FacetProfile()

        # Collect votes per facet
        facet_names = [
            "style_archetype", "material", "color_tone", "era_mood",
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

            # Majority vote
            counter = Counter(votes)
            top_tag, top_count = counter.most_common(1)[0]
            vote_fraction = top_count / len(votes)

            # Only keep if above confidence threshold
            if vote_fraction >= CONFIDENCE_THRESHOLD:
                setattr(aggregated, facet, top_tag)
                confidence[facet] = vote_fraction
                logger.info("Facet %s: %s (%.2f)", facet, top_tag, vote_fraction)
            else:
                logger.info("Facet %s dropped: %s (%.2f < %.2f)", facet, top_tag, vote_fraction, CONFIDENCE_THRESHOLD)

        aggregated.confidence = confidence
        return aggregated

    async def detect_heterogeneity(self, embeddings: list[list[float]]) -> bool:
        """Detect whether the image set is a single vibe or mixed.

        Uses hierarchical agglomerative clustering (Apple Photos approach)
        with median-distance linkage on the embedding vectors.

        Args:
            embeddings: List of image embedding vectors.

        Returns:
            True if the set appears to be multiple distinct sub-vibes.
        """
        if len(embeddings) < 3:
            logger.info("Too few images (%d) for heterogeneity detection", len(embeddings))
            return False  # Too few images to cluster meaningfully

        X = np.array(embeddings)

        # Try clustering into 2 groups and check silhouette score
        clustering = AgglomerativeClustering(
            n_clusters=2,
            metric="cosine",
            linkage="average",
        )
        labels = clustering.fit_predict(X)

        # If all images land in one cluster, it's cohesive
        if len(set(labels)) < 2:
            logger.info("All images in one cluster — cohesive vibe")
            return False

        # If silhouette score is low, clusters aren't well-separated
        score = silhouette_score(X, labels, metric="cosine")
        logger.info("Heterogeneity silhouette score: %.3f", score)

        # Low silhouette = clusters overlap = single vibe
        # High silhouette = well-separated clusters = mixed vibes
        return score > SILHOUETTE_THRESHOLD

    def compose_phrase(self, profile: FacetProfile) -> str:
        """Compose a vibe phrase from the aggregated facet profile.

        Template: material → color_tone → style_archetype → era_mood

        Args:
            profile: Aggregated FacetProfile.

        Returns:
            Vibe phrase string (e.g., "wood natural midcentury").
        """
        parts: list[str] = []

        # Domain-specific facets first
        if profile.material:
            parts.append(profile.material)
        if profile.color_tone:
            parts.append(profile.color_tone)
        if profile.style_archetype:
            parts.append(profile.style_archetype)
        if profile.era_mood:
            parts.append(profile.era_mood)

        # If no domain-specific facets, use domain-agnostic ones
        if not parts:
            if profile.texture_quality:
                parts.append(profile.texture_quality)
            if profile.color_palette:
                parts.append(profile.color_palette)
            if profile.energy_mood:
                parts.append(profile.energy_mood)

        phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase = " ".join(parts) if parts else ""
        logger.info("Composed phrase: '%s' from parts: %s", phrase, parts)
        return phrase

    async def compose_cross_domain(
        self,
        profile: FacetProfile,
        target_domain: str,
    ) -> str:
        """Compose a cross-domain recommendation phrase.

        Uses the domain-agnostic facets as a vibe interlingua bridge.

        Args:
            profile: Aggregated FacetProfile.
            target_domain: Target domain (e.g., "outfit", "home_goods").

        Returns:
            Cross-domain recommendation phrase.
        """
        # Build a free-text vibe description from domain-agnostic facets
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
        phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase =phrase = f"{vibe_description} {target_domain.replace('_', ' ')}"
        logger.info("Cross-domain phrase: '%s'", phrase)
        return phrase
