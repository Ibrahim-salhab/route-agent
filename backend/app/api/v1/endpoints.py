import time
from pathlib import Path
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from app.api.v1.schemas import (
    DocumentDeleteResponse,
    DocumentUploadResponse,
    HealthResponse,
    IndexedDocumentItem,
    IndexedDocumentsResponse,
    QueryRequest,
    QueryResponse,
)
from app.core.config import settings
from app.core.logging import get_logger
from app.services.agent import get_research_agent
from app.services.document_processor import (
    SUPPORTED_EXTENSIONS,
    UnsupportedFileTypeError,
    get_document_processor,
)
from app.services.embeddings import get_embedding_service
from app.services.vector_store import get_vector_store_service

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "/query",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute research agent query",
)
async def query_endpoint(payload: QueryRequest) -> QueryResponse:
    """
    Query endpoint orchestrating autonomous research via LangGraph:
    Routes through Internal Retrieval, Web Search, or Direct Reasoning.
    Measures total latency and attributes sources.
    """
    start_time = time.perf_counter()
    logger.info("Received query request: '%s'", payload.query)

    try:
        agent = get_research_agent()
        result_state = agent.run(payload.query)

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        return QueryResponse(
            answer=result_state["final_answer"],
            sources=result_state.get("sources", []),
            latency_ms=round(latency_ms, 2),
            tool_used=result_state["tool_used"],
        )
    except Exception as e:
        logger.error("Error executing query: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your query: {str(e)}",
        )


@router.post(
    "/documents/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and ingest a document into the vector store",
)
async def upload_document_endpoint(
    file: UploadFile = File(..., description="Document to ingest (.pdf, .txt, .md)"),
) -> DocumentUploadResponse:
    """
    Document upload endpoint:
    Validates file extension, splits content into chunks preserving metadata,
    embeds chunks, and persists them to ChromaDB.
    """
    filename = file.filename or "uploaded_file"
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    try:
        content_bytes = await file.read()
        if not content_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded file '{filename}' is empty.",
            )

        processor = get_document_processor()
        chunks = processor.process_bytes(content_bytes, filename=filename)

        if chunks:
            vector_store = get_vector_store_service()
            vector_store.add_documents(chunks)

        logger.info("Successfully ingested document '%s' with %d chunks.", filename, len(chunks))
        return DocumentUploadResponse(
            status="success",
            chunks_indexed=len(chunks),
            filename=filename,
        )

    except UnsupportedFileTypeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error ingesting document '%s': %s", filename, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document: {str(e)}",
        )


@router.get(
    "/documents",
    response_model=IndexedDocumentsResponse,
    status_code=status.HTTP_200_OK,
    summary="List all indexed documents and their chunk counts in vector store",
)
async def list_documents_endpoint() -> IndexedDocumentsResponse:
    """Returns all documents currently persisted in ChromaDB."""
    try:
        vector_store = get_vector_store_service()
        docs_data = vector_store.get_indexed_documents()
        total_chunks = vector_store.count()
        return IndexedDocumentsResponse(
            documents=[IndexedDocumentItem(**d) for d in docs_data],
            total_chunks=total_chunks,
        )
    except Exception as e:
        logger.error("Error retrieving indexed documents: %s", e, exc_info=True)
        return IndexedDocumentsResponse(documents=[], total_chunks=0)


@router.delete(
    "/documents/{filename}",
    response_model=DocumentDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a specific document and its chunks from vector store",
)
async def delete_document_endpoint(filename: str) -> DocumentDeleteResponse:
    """Removes a specific file by name from ChromaDB."""
    try:
        vector_store = get_vector_store_service()
        success = vector_store.delete_document(filename)
        if success:
            return DocumentDeleteResponse(
                status="success",
                message=f"Document '{filename}' successfully deleted from vector store.",
                filename=filename,
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document '{filename}'.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting document '%s': %s", filename, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}",
        )


@router.delete(
    "/documents",
    response_model=DocumentDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Clear all documents from the vector store",
)
async def clear_documents_endpoint() -> DocumentDeleteResponse:
    """Clears all documents from ChromaDB."""
    try:
        vector_store = get_vector_store_service()
        vector_store.clear()
        return DocumentDeleteResponse(
            status="success",
            message="All documents have been removed from the vector store.",
        )
    except Exception as e:
        logger.error("Error clearing documents from vector store: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear documents: {str(e)}",
        )


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service health and readiness check",
)
async def health_endpoint() -> HealthResponse:
    """
    Health endpoint checking API, vector store, embedding service, and LLM configuration.
    Never exposes secrets or credentials.
    """
    vector_status = "ok"
    try:
        store = get_vector_store_service()
        # Verify collection connectivity
        _ = store.count()
    except Exception as e:
        logger.warning("Vector store health check failed: %s", e)
        vector_status = "degraded"

    embedding_status = "ok"
    try:
        embedding_service = get_embedding_service()
        if embedding_service._model is None:
            embedding_status = "degraded"
    except Exception as e:
        logger.warning("Embedding service health check failed: %s", e)
        embedding_status = "degraded"

    overall_status = "healthy" if (vector_status == "ok" and embedding_status == "ok") else "degraded"

    return HealthResponse(
        status=overall_status,
        api="ok",
        vector_store=vector_status,
        embedding_service=embedding_status,
        llm_provider=settings.LLM_PROVIDER,
        llm_model=settings.LLM_MODEL,
    )
