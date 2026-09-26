"""OpenRouter client — serves Jev (typesafe/jev-router) as the decision layer.

Uses the Jev model via OpenRouter's Chat Completions API.
Accepts text/JSON state and returns structured results.
"""

import json
import logging

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "typesafe/jev-router"


class OpenRouterClient:
    """Client for Jev on OpenRouter — structured decision-making.

    Mimics the Jev interface: accepts text/JSON state,
    returns structured answers with confidence scores.
    """

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL, timeout: float = 30.0):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    async def _call(self, state: str | dict, system_prompt: str) -> dict:
        """Make a single OpenRouter API call.

        Args:
            state: Text or JSON-serializable state to evaluate.
            system_prompt: System prompt defining the task.

        Returns:
            Parsed JSON response from the model.
        """
        if isinstance(state, dict):
            state = json.dumps(state, indent=2)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": state},
        ]

        payload: dict = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    OPENROUTER_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:8000",
                    },
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except (httpx.HTTPStatusError, json.JSONDecodeError, KeyError) as e:
            logger.warning("OpenRouter call failed: %s — using fallback", e)
            return {}

    async def check_relevance(self, image_url: str, content_type: str) -> bool:
        """Pre-triage: is this image relevant for vibe analysis?"""
        state = json.dumps({
            "image_filename": image_url,
            "content_type": content_type,
        })
        system = (
            "You are an image relevance classifier. Determine if an image is a "
            "photograph of a real-world scene, interior, landscape, or styled object. "
            "Reject screenshots, receipts, memes, text documents, and non-photographic images. "
            'Respond with JSON: {"relevant": true/false, "confidence": 0.0-1.0}'
        )
        result = await self._call(state, system)
        return result.get("relevant", False) and result.get("confidence", 0) > 0.5

    async def score_confidence(self, facet_profile_json: str) -> float:
        """Confidence gating: is the vibe read solid enough to present?"""
        system = (
            "You are a vibe analysis confidence evaluator. Given a facet profile, "
            "score how confident you are that it accurately describes the vibe of an image set. "
            'Respond with JSON: {"confidence": 0.0-1.0}'
        )
        result = await self._call(facet_profile_json, system)
        return result.get("confidence", 0.5)

    async def detect_heterogeneity(self, cluster_stats: dict) -> bool:
        """Heterogeneity detection: single cohesive vibe or mixed set?"""
        system = (
            "You are a clustering analyst. Given cluster statistics, determine if an "
            "image set represents a single cohesive vibe or multiple distinct sub-vibes. "
            'Respond with JSON: {"mixed": true/false, "confidence": 0.0-1.0}'
        )
        result = await self._call(cluster_stats, system)
        return result.get("mixed", False)

    async def route_domain(self, facet_profile_json: str) -> str:
        """Domain routing: which target domain should we recommend in?"""
        system = (
            "You are a domain router. Given a vibe profile, choose the best target "
            "domain for a cross-domain recommendation. "
            'Respond with JSON: {"domain": "outfit|home_goods|music|art"}'
        )
        result = await self._call(facet_profile_json, system)
        return result.get("domain", "outfit")
