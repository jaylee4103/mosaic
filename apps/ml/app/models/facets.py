"""Unified facet vocabulary banks for domain-agnostic vibe detection."""

from pydantic import BaseModel, Field

# Single unified vocabulary for all facets.
# color is populated from classical CV (k-means + perceptual names), not zero-shot.
FACET_VOCABULARIES: dict[str, list[str]] = {
    "style": [
        "midcentury", "scandi", "industrial", "boho", "farmhouse",
        "japandi", "coastal", "art_deco", "minimalist",
        "traditional", "transitional", "contemporary", "cottagecore",
        "outdoorsy", "gorpcore", "alpine", "nautical", "safari",
        "western", "urban", "streetwear", "grunge", "punk",
        "gothic", "glam", "preppy", "dark_academia", "y2k", "tropical",
    ],
    "material": [
        "wood", "rattan", "brass", "linen", "concrete",
        "velvet", "marble", "wicker", "leather", "ceramic",
        "glass", "steel", "bamboo", "terrazzo",
        "stone", "granite", "slate", "fur", "wool",
        "flannel", "canvas", "denim", "cork", "cotton",
        "silk", "suede", "gold", "copper", "clay", "paper",
    ],
    "quality": [
        "cozy", "serene", "dramatic", "energetic", "moody",
        "airy", "eclectic", "rugged", "polished", "organic",
        "structured", "layered", "sparse", "minimal",
        "wild", "crisp", "misty", "weathered", "raw",
        "pristine", "vibrant", "somber", "ethereal", "gritty",
        "nostalgic", "futuristic", "earthy", "lush", "barren",
        "tranquil", "vast", "whimsical",
    ],
}


class FacetProfile(BaseModel):
    """Structured facet values for a set of images."""

    style: str | None = None
    material: str | None = None
    color: str | None = None
    quality: str | None = None

    confidence: dict[str, float] = Field(default_factory=dict)

    def surviving_facets(self) -> dict[str, str]:
        """Return only facets that have a value (not dropped as uncertain)."""
        return {
            k: v for k, v in self.model_dump().items()
            if v is not None and k != "confidence"
        }
