"""Mock vibe-detection routes — canned/randomized responses, zero ML deps.

For frontend development against this service's response shape while the
real pipeline (torch/transformers/SigLIP2) is unavailable, too memory-heavy
to run locally, or just slower than wanted for UI iteration. Same response
shape as the real /analyze routes (AnalyzeResponse -> VibeResult), so
swapping ML_SERVICE_URL between real and mock requires no frontend changes
beyond which base URL/path is hit.

Deliberately does not import torch/transformers/embedding.py/color.py's
k-means path — this module has to stay usable even when the real service
is crash-looping.
"""

import logging
import random

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.models.facets import FACET_VOCABULARIES, FacetProfile
from app.models.vibe import VibeResult

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyzeResponse(BaseModel):
    vibe: VibeResult


class AnalyzeUrlsRequest(BaseModel):
    image_urls: list[str] = Field(..., min_length=1, max_length=20)


# A few named colors drawn from the real color-naming palette (see
# app/services/color.py) so mock output looks like real output, without
# importing that module's k-means/PIL/numpy dependencies here.
MOCK_COLOR_NAMES = [
    "terracotta", "cream", "sage greens", "warm browns", "dusty roses",
    "slate grays", "pale blue-whites", "olive greens", "warm grays", "charcoal",
]

# Canned scenarios mirroring the two worked examples in the root README, for
# deterministic frontend testing (?scenario=mediterranean / ?scenario=alpine).
# "random" (the default) sample from the real facet vocab instead, for
# variety across repeated calls.
SCENARIOS: dict[str, FacetProfile] = {
    "mediterranean": FacetProfile(
        style=["cottagecore"],
        terrain=["coastal"],
        locale=["garden"],
        material=["linen", "wood", "ceramic", "rattan"],
        color=["terracotta", "cream", "olive greens"],
        quality=["cozy", "minimal", "tranquil", "organic"],
        shape=["rounded", "fluid"],
    ),
    "alpine": FacetProfile(
        style=["gorpcore", "outdoorsy"],
        terrain=["alpine", "highland"],
        locale=[],
        material=["wool", "flannel", "canvas", "wood"],
        color=["slate grays", "warm browns"],
        quality=["rugged", "wild", "crisp"],
        shape=["angular", "chunky"],
    ),
}


def _random_scenario() -> FacetProfile:
    profile = FacetProfile()
    for facet, vocab in FACET_VOCABULARIES.items():
        if random.random() < 0.15:  # occasionally drop a facet, like the real null-anchor gating would
            continue
        k = random.randint(1, min(2, len(vocab)))
        setattr(profile, facet, random.sample(vocab, k))
    profile.color = random.sample(MOCK_COLOR_NAMES, k=min(2, len(MOCK_COLOR_NAMES)))
    return profile


def _compose_phrase(profile: FacetProfile) -> str:
    parts: list[str] = []
    for facet in ("quality", "color", "style", "terrain", "locale", "shape", "material"):
        values = getattr(profile, facet, None)
        if values:
            parts.append(values[0])
    return " ".join(parts)


def _mock_vibe(scenario: str | None) -> VibeResult:
    if scenario and scenario != "random":
        profile = SCENARIOS.get(scenario)
        if profile is None:
            valid = ", ".join([*SCENARIOS.keys(), "random"])
            raise HTTPException(status_code=422, detail=f"Unknown scenario {scenario!r}. Valid: {valid}")
    else:
        profile = _random_scenario()

    phrase = _compose_phrase(profile)
    logger.info("Mock vibe: scenario=%s phrase=%r", scenario or "random", phrase)
    return VibeResult(phrase=phrase, facets=profile, mixed=False)


@router.post("/analyze", response_model=AnalyzeResponse)
async def mock_analyze(
    files: list[UploadFile] = File(default=[]),
    scenario: str | None = None,
):
    """Mock of POST /api/vibe/analyze. Uploaded file contents are ignored —
    only the file count is logged. Pass ?scenario=mediterranean|alpine for a
    fixed canned response, or omit it for a randomized one.
    """
    logger.info("Mock analyze: %d file(s) received (ignored)", len(files))
    return AnalyzeResponse(vibe=_mock_vibe(scenario))


@router.get("/analyze", response_model=AnalyzeResponse)
async def mock_analyze_get(scenario: str | None = None):
    """GET variant for quick manual/browser testing without building a
    multipart request."""
    return AnalyzeResponse(vibe=_mock_vibe(scenario))


@router.post("/analyze-urls", response_model=AnalyzeResponse)
async def mock_analyze_urls(body: AnalyzeUrlsRequest, scenario: str | None = None):
    """Mock of POST /api/vibe/analyze-urls. URLs are never fetched."""
    logger.info("Mock analyze-urls: %d url(s) received (ignored)", len(body.image_urls))
    return AnalyzeResponse(vibe=_mock_vibe(scenario))
