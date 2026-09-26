"""SigLIP2 embedding service — the perception layer of the pipeline."""

import io
import logging

import numpy as np
import torch
from PIL import Image
from transformers import AutoModel, AutoProcessor

from app.models.facets import DOMAIN_AGNOSTIC_FACETS, FacetProfile

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "google/siglip2-base-patch16-224"
PROMPT_TEMPLATE = "a photo of {tag}"
BASELINE_PROMPT = "a photo"
TEMPERATURE = 10.0


class EmbeddingService:
    """SigLIP2-based image embedding and zero-shot facet classification.

    Uses domain-agnostic facets (the "vibe interlingua") so the same
    perception layer works for any image type — nature, interiors, products.
    """

    def __init__(self, model_name: str = DEFAULT_MODEL, device: str | None = None):
        self.model_name = model_name
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._model = None
        self._processor = None

    def _load(self) -> None:
        """Lazy-load the SigLIP2 model and processor."""
        if self._model is not None:
            return
        logger.info("Loading SigLIP2 model: %s on %s", self.model_name, self.device)
        self._processor = AutoProcessor.from_pretrained(self.model_name)
        self._model = AutoModel.from_pretrained(self.model_name).to(self.device).eval()
        logger.info("SigLIP2 model loaded.")

    async def embed_image(self, image_bytes: bytes) -> list[float]:
        """Embed a single image into a feature vector."""
        self._load()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        inputs = self._processor(images=image, return_tensors="pt").to(self.device)

        with torch.no_grad():
            output = self._model.get_image_features(**inputs)

        if hasattr(output, "pooler_output"):
            features = output.pooler_output
        elif hasattr(output, "last_hidden_state"):
            features = output.last_hidden_state[:, 0, :]
        else:
            features = output

        features = features / features.norm(dim=-1, keepdim=True)
        return features.squeeze().cpu().tolist()

    async def classify_facets(
        self,
        image_embedding: list[float],
        vocabularies: dict[str, list[str]] | None = None,
    ) -> FacetProfile:
        """Zero-shot classify an image against domain-agnostic facet vocabularies.

        Uses softmax-normalized cosine similarities with negative prompting
        for calibrated confidence scores. The domain-agnostic facets serve
        as the "vibe interlingua" — they describe transferable qualities
        (color, texture, light, energy, density) that work across any
        image type and can be mapped to any target domain.
        """
        self._load()
        vocabularies = vocabularies or DOMAIN_AGNOSTIC_FACETS

        # Build text prompts for all tags
        all_prompts: list[str] = []
        prompt_to_facet: list[str] = []
        for facet, tags in vocabularies.items():
            for tag in tags:
                all_prompts.append(PROMPT_TEMPLATE.format(tag=tag))
                prompt_to_facet.append(facet)

        # Embed all text prompts
        text_embeddings = self._embed_texts(all_prompts)

        # Compute cosine similarities
        img_vec = np.array(image_embedding)
        text_mat = np.array(text_embeddings)
        similarities = text_mat @ img_vec

        # Negative prompting: subtract baseline similarity
        baseline_emb = self._embed_texts([BASELINE_PROMPT])[0]
        baseline_sim = float(np.dot(baseline_emb, img_vec))
        similarities = similarities - baseline_sim

        # Softmax normalize per facet with temperature
        profile = FacetProfile()
        confidence: dict[str, float] = {}

        for facet in vocabularies:
            # Get indices for this facet
            indices = [i for i, f in enumerate(prompt_to_facet) if f == facet]
            facet_sims = similarities[indices]

            # Softmax with temperature
            exp_sims = np.exp(facet_sims * TEMPERATURE)
            probs = exp_sims / exp_sims.sum()

            # Top tag and its probability
            top_idx = int(np.argmax(probs))
            top_tag = vocabularies[facet][top_idx]
            top_prob = float(probs[top_idx])

            setattr(profile, facet, top_tag)
            confidence[facet] = top_prob

        profile.confidence = confidence
        return profile

    def _embed_texts(self, texts: list[str], batch_size: int = 64) -> list[list[float]]:
        """Embed a list of text prompts into feature vectors."""
        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            inputs = self._processor(text=batch, return_tensors="pt", padding=True, truncation=True).to(self.device)
            with torch.no_grad():
                output = self._model.get_text_features(**inputs)

            if hasattr(output, "pooler_output"):
                features = output.pooler_output
            elif hasattr(output, "last_hidden_state"):
                features = output.last_hidden_state[:, 0, :]
            else:
                features = output

            features = features / features.norm(dim=-1, keepdim=True)
            all_embeddings.extend(features.cpu().tolist())
        return all_embeddings
