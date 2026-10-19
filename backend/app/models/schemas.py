from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class QueryRequest(BaseModel):
    """User query request schema with trimming and length validation."""
    query: str = Field(..., description="User query or research question")

    @field_validator("query", mode="before")
    @classmethod
    def validate_query(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise ValueError("Query must be a string.")
        trimmed = v.strip()
        if len(trimmed) < 3:
            raise ValueError("Query must be at least 3 characters long after trimming.")
        return trimmed


class SourceItem(BaseModel):
    """Normalized source attribution item."""
    title: str = Field(..., description="Document title, page description, or web title")
    url: Optional[str] = Field(None, description="Web source URL if applicable")
    filename: Optional[str] = Field(None, description="Internal document filename if applicable")
    page_number: Optional[int] = Field(None, description="Internal document page number if applicable")
    snippet: str = Field(..., description="Relevant text snippet from source")
    source_type: str = Field(..., description="'internal' or 'web'")
    score: Optional[float] = Field(None, description="Similarity or relevance score")


class QueryResponse(BaseModel):
    """Agent query response schema."""
    answer: str = Field(..., description="Generated answer from the research agent")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Attributed sources consulted")
    latency_ms: float = Field(..., description="Total processing latency in milliseconds")
    tool_used: str = Field(..., description="Primary tool route selected ('internal_search', 'web_search', 'direct_reasoning')")


class DocumentUploadResponse(BaseModel):
    """Response returned upon document ingestion."""
    status: str = Field(..., description="Status of ingestion ('success', etc.)")
    chunks_indexed: int = Field(..., description="Count of chunks added to vector store")
    filename: str = Field(..., description="Name of the uploaded file")


class HealthResponse(BaseModel):
    """Health check status response."""
    status: str = Field(..., description="Overall health status ('healthy', 'degraded')")
    api: str = Field("ok", description="FastAPI status")
    vector_store: str = Field(..., description="ChromaDB status")
    embedding_service: str = Field(..., description="Embedding service status")
    llm_provider: str = Field(..., description="Configured LLM provider name")
    llm_model: str = Field(..., description="Configured LLM model name")


class IndexedDocumentItem(BaseModel):
    """Represents an indexed document file and its chunks."""
    filename: str = Field(..., description="Name of the file stored in vector database")
    chunks_count: int = Field(..., description="Number of text chunks for this document")


class IndexedDocumentsResponse(BaseModel):
    """List of all indexed documents in the vector store."""
    documents: List[IndexedDocumentItem] = Field(default_factory=list, description="Indexed documents")
    total_chunks: int = Field(0, description="Total count of all chunks stored")


class DocumentDeleteResponse(BaseModel):
    """Response returned upon document deletion."""
    status: str = Field("success", description="Status of the delete operation")
    message: str = Field(..., description="Details regarding deleted document(s)")
    filename: Optional[str] = Field(None, description="Deleted filename if specific")
