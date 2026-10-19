import pytest
from pathlib import Path
from langchain_core.documents import Document
import pypdf
from app.services.document_processor import (
    DocumentProcessor,
    UnsupportedFileTypeError,
    get_document_processor,
)
from app.services.embeddings import get_embedding_service
from app.services.vector_store import VectorStoreService


def create_sample_pdf(file_path: Path) -> None:
    """Create a multi-page test PDF file using pypdf."""
    writer = pypdf.PdfWriter()
    page1 = writer.add_blank_page(width=300, height=300)
    # pypdf Writer can add text annotations or stream, or we can use basic PDF structure
    # Alternatively write raw basic PDF format with pages
    # Let's create a valid minimal PDF with text content
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 2/Kids[3 0 R 4 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]/Contents 5 0 R/Resources<</Font<</F1 7 0 R>>>>>>endobj\n"
        b"4 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]/Contents 6 0 R/Resources<</Font<</F1 7 0 R>>>>>>endobj\n"
        b"5 0 obj<</Length 44>>stream\nBT /F1 12 Tf 50 250 Td (Autonomous AI Agents in 2026) Tj ET\nendstream\nendobj\n"
        b"6 0 obj<</Length 48>>stream\nBT /F1 12 Tf 50 250 Td (ChromaDB Vector Retrieval System) Tj ET\nendstream\nendobj\n"
        b"7 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        b"xref\n0 8\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000121 00000 n\n0000000227 00000 n\n0000000333 00000 n\n0000000427 00000 n\n0000000525 00000 n\n"
        b"trailer<</Size 8/Root 1 0 R>>\nstartxref\n594\n%%EOF\n"
    )
    file_path.write_bytes(pdf_content)


def test_document_processor_text_and_markdown(tmp_path):
    """Test processing of plain text and markdown documents."""
    processor = get_document_processor()

    txt_file = tmp_path / "notes.txt"
    txt_file.write_text("This is an internal company document about autonomous route planning.", encoding="utf-8")

    md_file = tmp_path / "guide.md"
    md_file.write_text("# Guide\n\nVector databases enable semantic similarity retrieval.", encoding="utf-8")

    txt_chunks = processor.process_file(txt_file)
    assert len(txt_chunks) > 0
    assert txt_chunks[0].metadata["filename"] == "notes.txt"
    assert txt_chunks[0].metadata["source_type"] == "txt"
    assert "chunk_id" in txt_chunks[0].metadata

    md_chunks = processor.process_file(md_file)
    assert len(md_chunks) > 0
    assert md_chunks[0].metadata["filename"] == "guide.md"
    assert md_chunks[0].metadata["source_type"] == "md"


def test_document_processor_unsupported_type(tmp_path):
    """Test that unsupported file types raise UnsupportedFileTypeError."""
    processor = get_document_processor()
    bad_file = tmp_path / "data.docx"
    bad_file.write_text("bad data", encoding="utf-8")

    with pytest.raises(UnsupportedFileTypeError):
        processor.process_file(bad_file)


def test_document_processor_pdf(tmp_path):
    """Test processing PDF files and preserving page numbers."""
    pdf_file = tmp_path / "sample.pdf"
    create_sample_pdf(pdf_file)

    processor = get_document_processor()
    chunks = processor.process_file(pdf_file)

    assert len(chunks) == 2
    assert chunks[0].metadata["filename"] == "sample.pdf"
    assert chunks[0].metadata["page_number"] == 1
    assert "Autonomous AI Agents" in chunks[0].page_content

    assert chunks[1].metadata["filename"] == "sample.pdf"
    assert chunks[1].metadata["page_number"] == 2
    assert "ChromaDB" in chunks[1].page_content


def test_validation_gate_2_rag_lifecycle(tmp_path):
    """
    Validation Gate 2:
    1. Create sample document
    2. Process it
    3. Embed it
    4. Store it in vector store
    5. Execute similarity query
    6. Verify at least one meaningful result
    7. Verify metadata is preserved
    """
    sample_txt = tmp_path / "spec.txt"
    sample_txt.write_text(
        "Route Agent provides autonomous research with internal retrieval and live web search. "
        "The architecture is modular, production-grade, and runs locally.",
        encoding="utf-8",
    )

    processor = get_document_processor()
    chunks = processor.process_file(sample_txt)
    assert len(chunks) >= 1

    embedding_service = get_embedding_service()
    persist_dir = str(tmp_path / "chroma_test")
    vector_store = VectorStoreService(
        persist_directory=persist_dir,
        collection_name="test_rag_collection",
        embedding_service=embedding_service,
    )

    vector_store.add_documents(chunks)
    assert vector_store.count() >= 1

    query = "How does Route Agent perform research?"
    results = vector_store.similarity_search(query, k=2)

    assert len(results) >= 1
    top_result = results[0]

    # Verify meaningful result
    assert "Route Agent" in top_result.page_content or "retrieval" in top_result.page_content

    # Verify metadata is preserved
    assert top_result.metadata["filename"] == "spec.txt"
    assert top_result.metadata["source_type"] == "txt"
    assert "chunk_id" in top_result.metadata
