"""Facet vocabulary banks and the facet profile model."""

from pydantic import BaseModel, Field

# Curated vocabulary banks per facet — mined from design taxonomies,
# Pinterest board titles, and aesthetic hashtags as weak labels.
# Expand based on user uploads and domain coverage needs.

FACET_VOCABULARIES: dict[str, list[str]] = {
    "style_archetype": [
        "midcentury", "scandi", "industrial", "boho", "farmhouse",
        "japandi", "coastal", "art_deco", "bohemian", "minimalist",
        "rustic", "traditional", "transitional", "contemporary", "cottagecore",
    ],
    "material": [
        "wood", "rattan", "brass", "linen", "concrete",
        "velvet", "marble", "wicker", "leather", "ceramic",
        "glass", "steel", "bamboo", "terrazzo", "rattan",
    ],
    "color_tone": [
        "warm", "muted", "terracotta", "cool", "monochrome",
        "earth_tone", "pastel", "jewel_tone", "neutral", "black_and_white",
        "sage_green", "dusty_rose", "navy", "cream", "charcoal",
    ],
    "era_mood": [
        "vintage", "modern", "rustic", "minimal", "retro",
        "timeless", "eclectic", "zen", "moody", "airy",
    ],
}

# Domain-agnostic facets for cross-domain bridging (vibe interlingua)
DOMAIN_AGNOSTIC_FACETS: dict[str, list[str]] = {
    "color_palette": [
        "warm earth tones", "cool blues", "muted neutrals", "jewel tones",
        "pastel", "monochrome", "black and white", "vibrant primaries",
    ],
    "texture_quality": [
        "rugged", "smooth", "weathered", "soft", "glossy",
        "matte", "rough", "polished", "natural", "synthetic",
    ],
    "light_quality": [
        "crisp", "hazy", "golden", "overcast", "dramatic",
        "diffused", "backlit", "moody", "bright", "low_key",
    ],
    "energy_mood": [
        "calm", "dramatic", "austere", "cozy", "energetic",
        "serene", "intense", "playful", "melancholic", "uplifting",
    ],
    "density_complexity": [
        "sparse", "layered", "busy", "balanced", "cluttered",
        "open", "dense", "structured", "organic", "geometric",
    ],
}


class FacetProfile(BaseModel):
    """Structured facet values for a set of images."""

    style_archetype: str | None = None
    material: str | None = None
    color_tone: str | None = None
    era_mood: str | None = None

    # Domain-agnostic facets (for cross-domain bridging)
    color_palette: str | None = None
    texture_quality: str | None = None
    light_quality: str | None = None
    energy_mood: str | None = None
    density_complexity: str | None = None

    # Confidence per facet (0-1)
    confidence: dict[str, float] = Field(default_factory=dict)

    def surviving_facets(self) -> dict[str, str]:
        """Return only facets that have a value (not dropped as uncertain)."""
        return {
            k: v for k, v in self.model_dump().items()
            if v is not None and k != "confidence"
        }
