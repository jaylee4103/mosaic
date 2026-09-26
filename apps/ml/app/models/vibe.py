"""Vibe result model — the final output of the pipeline."""

from pydantic import BaseModel, Field

from app.models.facets import FacetProfile


class VibeResult(BaseModel):
    """The composed output of the vibe detection pipeline."""

    phrase: str = ""
    facets: FacetProfile = Field(default_factory=FacetProfile)
    confidence: float = 0.0
    mixed: bool = False
    target_domain: str | None = None
    message: str | None = None
