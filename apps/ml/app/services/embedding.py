"""SigLIP2 embedding service — the perception layer of the pipeline."""

import io
import logging

import torch
from PIL import Image
from transformers import AutoModel, AutoProcessor

from app.models.facets import FACET_VOCABULARIES, FacetProfile

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "google/siglip2-base-patch16-224"
PROMPT_TEMPLATE = "This is a photo of {tag}."


class EmbeddingService:
    """SigLIP2-based image embedding and zero-shot facet classification.

    Uses sigmoid scoring with the model's learned logit_scale and logit_bias,
    matching SigLIP2's training objective (independent sigmoid loss).
    Each label gets an independent yes/no probability — no softmax
    competition across labels.
    """

    def __init__(self, model_name: str = DEFAULT_MODEL, device: str | None = None):
        self.model_name = model_name
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._model = None
        self._processor = None

    def _load(self) -> None:
        if self._model is not None:
            return
        logger.info("Loading SigLIP2 model: %s on %s", self.model_name, self.device)
        self._processor = AutoProcessor.from_pretrained(self.model_name)
        self._model = AutoModel.from_pretrained(self.model_name).to(self.device).eval()
        self._logit_scale = self._model.logit_scale
        self._logit_bias = self._model.logit_bias
        logger.info("SigLIP2 model loaded. logit_scale=%.4f, logit_bias=%.4f",
                    float(self._logit_scale.detach()), float(self._logit_bias.detach()))

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
        """Zero-shot classify using sigmoid scoring (not softmax).

        Uses the model's learned logit_scale and logit_bias, then sigmoid
        for independent per-label probabilities. This matches SigLIP2's
        training objective (independent sigmoid loss).
        """
        self._load()
        vocabularies = vocabularies or FACET_VOCABULARIES

        all_prompts: list[str] = []
        prompt_to_facet: list[str] = []
        for facet, tags in vocabularies.items():
            for tag in tags:
                all_prompts.append(PROMPT_TEMPLATE.format(tag=tag))
                prompt_to_facet.append(facet)

        profile = FacetProfile()
        confidence: dict[str, float] = {}
        img_vec = torch.tensor(image_embedding, dtype=torch.float32)

        for facet in vocabularies:
            indices = [i for i, f in enumerate(prompt_to_facet) if f == facet]
            facet_prompts = [all_prompts[i] for i in indices]

            text_emb = self._embed_texts(facet_prompts)
            text_mat = torch.tensor(text_emb, dtype=torch.float32)

            text_mat = text_mat / text_mat.norm(dim=-1, keepdim=True)
            img_norm = img_vec / img_vec.norm()

            cos_sim = (text_mat * img_norm).sum(dim=-1)

            logits = cos_sim * self._logit_scale + self._logit_bias
            probs = torch.sigmoid(logits)

            top_idx = int(torch.argmax(probs))
            top_tag = vocabularies[facet][top_idx]
            top_prob = float(probs[top_idx].detach())

            setattr(profile, facet, top_tag)
            confidence[facet] = top_prob

        profile.confidence = confidence
        return profile

    def _embed_texts(self, texts: list[str], batch_size: int = 64) -> list[list[float]]:
        """Embed a list of text prompts into feature vectors."""
        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            inputs = self._processor(
                text=batch,
                return_tensors="pt",
                padding="max_length",
                max_length=64,
                truncation=True,
            ).to(self.device)
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
