"""SigLIP2 embedding service — the perception layer of the pipeline."""

import io
import logging

import numpy as np
import torch
from PIL import Image
from transformers import AutoModel, AutoProcessor

from app.models.facets import FACET_VOCABULARIES, FacetProfile

logger = logging.getLogger(__name__)

# Model checkpoint — SigLIP2 base, fine-tunable for interior design
DEFAULT_MODEL = "google/siglip2-base-patch16-224"

# Prompt template for zero-shot classification
PROMPT_TEMPLATE = "a photo of a {tag} style room"


class EmbeddingService:
    """SigLIP2-based image embedding and zero-shot facet classification.

    Loads the model lazily on first use to avoid blocking app startup.
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
        """Embed a single image into a feature vector.

        Args:
            image_bytes: Raw image file bytes.

        Returns:
            Embedding vector as a list of floats.
        """
        self._load()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        inputs = self._processor(images=image, return_tensors="pt").to(self.device)

        with torch.no_grad():
            output = self._model.get_image_features(**inputs)

        # Extract tensor from model output (handles both raw tensors and model output objects)
        if hasattr(output, "pooler_output"):
            features = output.pooler_output
        elif hasattr(output, "last_hidden_state"):
            features = output.last_hidden_state[:, 0, :]
        else:
            features = output

        # Normalize to unit vector for cosine similarity
        features = features / features.norm(dim=-1, keepdim=True)
        return features.squeeze().cpu().tolist()

    async def classify_facets(
        self,
        image_embedding: list[float],
        vocabularies: dict[str, list[str]] | None = None,
    ) -> FacetProfile:
        """Zero-shot classify an image against each facet's tag list.

        Uses cosine similarity between the image embedding and prompted
        text embeddings ("a photo of a {tag} style room").

        Args:
            image_embedding: SigLIP2 embedding of the image.
            vocabularies: Facet → tag list mapping. Defaults to FACET_VOCABULARIES.

        Returns:
            FacetProfile with top tag per facet and confidence scores.
        """
        self._load()
        vocabularies = vocabularies or FACET_VOCABULARIES

        # Build text prompts for all tags across all facets
        all_prompts: list[str] = []
        prompt_to_facet: list[str] = []
        for facet, tags in vocabularies.items():
            for tag in tags:
                all_prompts.append(PROMPT_TEMPLATE.format(tag=tag))
                prompt_to_facet.append(facet)

        # Embed all text prompts in batches
        text_embeddings = self._embed_texts(all_prompts)

        # Compute cosine similarities
        img_vec = np.array(image_embedding)
        text_mat = np.array(text_embeddings)
        similarities = text_mat @ img_vec  # (n_prompts,)

        # For each facet, take the tag with highest similarity
        facet_best: dict[str, tuple[str, float]] = {}
        for i, (facet, sim) in enumerate(zip(prompt_to_facet, similarities)):
            tag = all_prompts[i].replace(PROMPT_TEMPLATE.format(tag=""), "").strip()
            # Extract tag from prompt
            tag = all_prompts[i].replace("a photo of a ", "").replace(" style room", "")
            if facet not in facet_best or sim > facet_best[facet][1]:
                facet_best[facet] = (tag, float(sim))

        # Build profile with confidence = max similarity per facet
        profile = FacetProfile()
        confidence: dict[str, float] = {}
        for facet, (tag, sim) in facet_best.items():
            setattr(profile, facet, tag)
            confidence[facet] = sim

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

            # Extract tensor from model output
            if hasattr(output, "pooler_output"):
                features = output.pooler_output
            elif hasattr(output, "last_hidden_state"):
                features = output.last_hidden_state[:, 0, :]
            else:
                features = output

                output = self._model.get_text_features(**inputs)

            # Extract tensor from model output
            if hasattr(output, "pooler_output"):
                features = output.pooler_output
            elif hasattr(output, "last_hidden_state"):
                features = output.last_hidden_state[:, 0, :]
            else:
                features = output

            features = features / features.norm(dim=-1, keepdim=True)
            all_embeddings.extend(features.cpu().tolist())
        return all_embeddings


# Fix missing import
import io  # noqa: E402
