from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import chromadb
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from app.core.config import settings
from app.core.logging import get_logger
from app.services.embeddings import EmbeddingService, get_embedding_service

logger = get_logger(__name__)


class VectorStoreService:
    """Service managing persistent ChromaDB vector storage."""

    def __init__(
        self,
        persist_directory: Optional[str] = None,
        collection_name: str = "route_agent_docs",
        embedding_service: Optional[EmbeddingService] = None,
    ) -> None:
        self.persist_directory = persist_directory or settings.CHROMA_PERSIST_DIRECTORY
        Path(self.persist_directory).mkdir(parents=True, exist_ok=True)
        self.collection_name = collection_name
        self.embedding_service = embedding_service or get_embedding_service()

        self._client = chromadb.PersistentClient(path=self.persist_directory)
        self._vector_store = Chroma(
            client=self._client,
            collection_name=self.collection_name,
            embedding_function=self.embedding_service,
        )
        logger.info(
            "Initialized VectorStoreService at '%s' with collection '%s'",
            self.persist_directory,
            self.collection_name,
        )

    def _sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure all metadata values are valid for ChromaDB (str, int, float, bool)."""
        clean: Dict[str, Any] = {}
        for k, v in metadata.items():
            if v is not None:
                if isinstance(v, (str, int, float, bool)):
                    clean[k] = v
                else:
                    clean[k] = str(v)
        return clean

    def add_documents(self, documents: List[Document]) -> None:
        """Add a list of LangChain documents with preserved metadata to the vector store."""
        if not documents:
            logger.warning("No documents provided to add_documents.")
            return

        sanitized_docs = [
            Document(
                page_content=doc.page_content,
                metadata=self._sanitize_metadata(doc.metadata),
            )
            for doc in documents
        ]

        self._vector_store.add_documents(sanitized_docs)
        logger.info("Successfully indexed %d chunks in vector store.", len(sanitized_docs))

    def similarity_search(self, query: str, k: int = 4) -> List[Document]:
        """Perform similarity search for a query string."""
        if not query.strip():
            return []
        results = self._vector_store.similarity_search(query, k=k)
        logger.info("Similarity search for '%s' returned %d results", query, len(results))
        return results

    def similarity_search_with_score(
        self, query: str, k: int = 4
    ) -> List[Tuple[Document, float]]:
        """Perform similarity search returning documents along with distance scores."""
        if not query.strip():
            return []
        results = self._vector_store.similarity_search_with_score(query, k=k)
        logger.info("Similarity search with score for '%s' returned %d results", query, len(results))
        return results

    def count(self) -> int:
        """Get the total count of documents in the collection."""
        collection = self._client.get_collection(self.collection_name)
        return collection.count()

    def clear(self) -> None:
        """Delete and recreate collection for tests or reset."""
        try:
            self._client.delete_collection(self.collection_name)
        except Exception:
            pass
        self._vector_store = Chroma(
            client=self._client,
            collection_name=self.collection_name,
            embedding_function=self.embedding_service,
        )
        logger.info("Vector store collection '%s' cleared.", self.collection_name)

    def get_indexed_documents(self) -> List[Dict[str, Any]]:
        """Retrieve aggregated summary of unique documents in vector store."""
        try:
            collection = self._client.get_collection(self.collection_name)
            data = collection.get(include=["metadatas"])
            metadatas = data.get("metadatas") or []

            file_counts: Dict[str, int] = {}
            for m in metadatas:
                if m and isinstance(m, dict):
                    fn = m.get("filename") or "unknown_document"
                    file_counts[fn] = file_counts.get(fn, 0) + 1

            return [
                {"filename": fn, "chunks_count": count}
                for fn, count in file_counts.items()
            ]
        except Exception as e:
            logger.warning("Error retrieving indexed documents from Chroma: %s", e)
            return []

    def delete_document(self, filename: str) -> bool:
        """Delete all chunks belonging to a specific filename."""
        try:
            collection = self._client.get_collection(self.collection_name)
            collection.delete(where={"filename": filename})
            logger.info("Deleted all chunks for document '%s' from vector store", filename)
            return True
        except Exception as e:
            logger.error("Failed to delete document '%s': %s", filename, e)
            return False



_default_vector_store: Optional[VectorStoreService] = None


def get_vector_store_service(
    persist_directory: Optional[str] = None,
    collection_name: str = "route_agent_docs",
) -> VectorStoreService:
    """Factory function for VectorStoreService."""
    global _default_vector_store
    if persist_directory or collection_name != "route_agent_docs":
        return VectorStoreService(
            persist_directory=persist_directory,
            collection_name=collection_name,
        )
    if _default_vector_store is None:
        _default_vector_store = VectorStoreService()
    return _default_vector_store
