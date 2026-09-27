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

# Per-facet rejection anchors: "none of this facet's tags really apply".
# A forced top-k pick from a facet's vocab always returns *something*, even
# on an image where the concept isn't present (no "material" or "shape" in
# a landscape photo). A single shared anchor doesn't work here — different
# facets have different baseline applicability (a landscape photo generally
# scores lower against *any* forced tag than a staged product photo would),
# so one generic anchor either over-rejects facets that do apply (style on
# a city skyline) or under-rejects ones that don't (material on a forest).
# Each facet gets its own anchor describing the absence of that specific
# concept, phrased through the same PROMPT_TEMPLATE structure so the
# comparison is apples-to-apples (a structurally different sentence embeds
# into an unrelated region purely from syntax and silently always loses).
FACET_NULL_HINTS: dict[str, str] = {
    "style": "no distinct aesthetic style",
    "terrain": "no natural landscape or terrain",
    "locale": "no identifiable built environment or landmark",
    "shape": "no distinct object shape or silhouette",
    "material": "no distinct surface material",
    "quality": "no strong mood or atmosphere",
}
DEFAULT_NULL_HINT = "nothing distinctive"


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
        self._model = AutoModel.from_pretrained(self.model_name, low_cpu_mem_usage=True).to(self.device).eval()
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
        top_k: int = 3,
    ) -> FacetProfile:
        """Zero-shot classify using sigmoid scoring (not softmax).

        Uses the model's learned logit_scale and logit_bias, then sigmoid
        for independent per-label probabilities. This matches SigLIP2's
        training objective (independent sigmoid loss).

        Returns the top-k tags per facet (ranked by probability) instead of
        forcing a single winner, since a forced top-1 pick is noisy on any
        single image and drops real ambiguity.

        Candidates must also beat that facet's own null-hint anchor to be
        returned at all — otherwise a facet with no real match in the image
        (e.g. "material" on a landscape photo) still forces out its
        least-bad option, which then looks like a confident pick once
        several similar-looking images all force the same wrong answer.
        Each facet's anchor is scoped to that facet's own concept, since a
        single shared anchor either over- or under-rejects depending on how
        readily each facet applies to non-object imagery.
        """
        self._load()
        vocabularies = vocabularies or FACET_VOCABULARIES

        all_prompts: list[str] = []
        prompt_to_facet: list[str] = []
        for facet, tags in vocabularies.items():
            for tag in tags:
                all_prompts.append(PROMPT_TEMPLATE.format(tag=tag))
                prompt_to_facet.append(facet)

        null_prompts = [
            PROMPT_TEMPLATE.format(tag=FACET_NULL_HINTS.get(facet, DEFAULT_NULL_HINT))
            for facet in vocabularies
        ]
        null_embs = torch.tensor(self._embed_texts(null_prompts), dtype=torch.float32)
        null_embs = null_embs / null_embs.norm(dim=-1, keepdim=True)

        profile = FacetProfile()
        img_vec = torch.tensor(image_embedding, dtype=torch.float32)
        img_norm = img_vec / img_vec.norm()

        null_logits = (null_embs * img_norm).sum(dim=-1) * self._logit_scale + self._logit_bias
        null_probs = torch.sigmoid(null_logits)

        for facet_idx, facet in enumerate(vocabularies):
            indices = [i for i, f in enumerate(prompt_to_facet) if f == facet]
            facet_prompts = [all_prompts[i] for i in indices]

            text_emb = self._embed_texts(facet_prompts)
            text_mat = torch.tensor(text_emb, dtype=torch.float32)
            text_mat = text_mat / text_mat.norm(dim=-1, keepdim=True)

            cos_sim = (text_mat * img_norm).sum(dim=-1)
            logits = cos_sim * self._logit_scale + self._logit_bias
            probs = torch.sigmoid(logits)

            null_prob = float(null_probs[facet_idx].detach())
            k = min(top_k, len(vocabularies[facet]))
            ranked_idx = torch.argsort(probs, descending=True)[:k].tolist()
            ranked_idx = [i for i in ranked_idx if float(probs[i].detach()) > null_prob]

            if not ranked_idx:
                logger.debug("Facet %s: no candidate beat its null anchor (%.6f)", facet, null_prob)
                continue

            top_tags = [vocabularies[facet][i] for i in ranked_idx]
            setattr(profile, facet, top_tags)

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
