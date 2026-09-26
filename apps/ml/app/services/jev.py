"""Jev (TypeSafe AI) client — typed decision layer.

Jev accepts text/JSON state only — no images, no embeddings.
All perception must be complete before calling Jev.
"""

import logging

import httpx

logger = logging.getLogger(__name__)

TYPESAFE_API_URL = "https://api.typesafe.ai/v1/systemone"
DEFAULT_MODEL = "jev-latest"


class JevClient:
    """Client for the TypeSafe AI Jev API.

    Jev evaluates typed questions against a text/JSON state and returns
    structured answers (Choice, Score, Noul) with calibrated confidence.
    """

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL, timeout: float = 30.0):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    async def _call(self, state: str | dict, questions: dict) -> dict:
        """Make a single Jev API call with multiple questions.

        Args:
            state: Text or JSON-serializable state to evaluate.
            questions: Question definitions keyed by answer ID.

        Returns:
            Raw answers dict from the API.
        """
        if isinstance(state, dict):
            import json

            state = json.dumps(state, indent=2)

        payload = {
            "state": state,
            "model": self.model,
            "questions": questions,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                TYPESAFE_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return data.get("answers", {})

    async def check_relevance(
        self,
        image_url: str,
        content_type: str,
    ) -> bool:
        """Pre-triage: is this image relevant for vibe analysis?

        Filters out screenshots, receipts, memes, and other noise before
        spending compute on embedding.

        Args:
            image_url: Filename or identifier for the image.
            content_type: MIME type of the uploaded file.

        Returns:
            True if the image should be kept for analysis.
        """
        state = {
            "image_filename": image_url,
            "content_type": content_type,
        }
        questions = {
            "is_relevant": {
                "type": "noul",
                "instructions": (
                    "Is this image a photograph of a real-world scene, interior, "
                    "landscape, or styled object? Reject screenshots, receipts, "
                    "memes, text documents, and non-photographic images."
                ),
            }
        }
        answers = await self._call(state, questions)
        noul = answers.get("is_relevant", {}).get("noul", 0.0)
        return noul > 0.5

    async def score_confidence(self, facet_profile_json: str) -> float:
        """Confidence gating: is the vibe read solid enough to present?

        Args:
            facet_profile_json: JSON-serialized FacetProfile.

        Returns:
            Confidence score between 0 and 1.
        """
        questions = {
            "confidence": {
                "type": "score",
                "instructions": "How confident are you that this facet profile accurately describes the vibe of the image set?",
                "criteria": [
                    "Low confidence — facets are uncertain or contradictory",
                    "Medium confidence — some facets are clear, others are not",
                    "High confidence — all facets are clear and consistent",
                ],
            }
        }
        answers = await self._call(facet_profile_json, questions)
        score = answers.get("confidence", {}).get("score", 0.0)
        # Normalize from [0, 2] to [0, 1]
        return min(max(score / 2.0, 0.0), 1.0)

    async def detect_heterogeneity(self, cluster_stats: dict) -> bool:
        """Heterogeneity detection: single cohesive vibe or mixed set?

        Args:
            cluster_stats: Dict with cluster count, intra/inter distances.

        Returns:
            True if the set appears to be multiple distinct sub-vibes.
        """
        questions = {
            "is_mixed": {
                "type": "choice",
                "instructions": (
                    "Based on the cluster statistics, does this image set "
                    "represent a single cohesive vibe or multiple distinct sub-vibes?"
                ),
                "criteria": {
                    "single": "One dominant cluster — the set has a cohesive vibe",
                    "mixed": "Multiple distinct clusters — the set has mixed vibes",
                },
            }
        }
        answers = await self._call(cluster_stats, questions)
        choice = answers.get("is_mixed", {}).get("choice", "single")
        return choice == "mixed"

    async def route_domain(self, facet_profile_json: str) -> str:
        """Domain routing: which target domain should we recommend in?

        Args:
            facet_profile_json: JSON-serialized FacetProfile.

        Returns:
            Target domain string (e.g., "outfit", "home_goods", "music").
        """
        questions = {
            "target_domain": {
                "type": "choice",
                "instructions": (
                    "Given this vibe profile, which target domain would be "
                    "most appropriate for a cross-domain recommendation?"
                ),
                "criteria": {
                    "outfit": "Fashion and clothing recommendations",
                    "home_goods": "Home decor and furniture recommendations",
                    "music": "Music and playlist recommendations",
                    "art": "Art and visual media recommendations",
                },
            }
        }
        answers = await self._call(facet_profile_json, questions)
        return answers.get("target_domain", {}).get("choice", "outfit")
