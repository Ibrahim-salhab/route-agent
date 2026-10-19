from typing import List, Optional
from langchain_core.embeddings import Embeddings
from sentence_transformers import SentenceTransformer
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingService(Embeddings):
    """Reusable embedding service using local SentenceTransformers."""

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[SentenceTransformer] = None

    def __new__(cls, model_name: Optional[str] = None) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_name: Optional[str] = None) -> None:
        selected_model = model_name or settings.EMBEDDING_MODEL
        if self._model is None:
            logger.info("Initializing SentenceTransformer model: %s", selected_model)
            self._model = SentenceTransformer(selected_model)
            self.model_name = selected_model
            logger.info("SentenceTransformer model loaded successfully.")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of document chunks."""
        if not texts:
            return []
        embeddings = self._model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return embeddings.tolist()

    def embed_query(self, text: str) -> List[float]:
        """Embed a single query string."""
        embedding = self._model.encode(text, convert_to_numpy=True, show_progress_bar=False)
        return embedding.tolist()


def get_embedding_service() -> EmbeddingService:
    """Get the singleton instance of EmbeddingService."""
    return EmbeddingService()
