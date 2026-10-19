import io
from pathlib import Path
from typing import List, Optional, Union
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
import pypdf
from app.core.logging import get_logger

logger = get_logger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}


class DocumentProcessingError(Exception):
    """Base exception for document processing errors."""
    pass


class UnsupportedFileTypeError(DocumentProcessingError):
    """Raised when an unsupported file type is provided."""
    pass


class DocumentProcessor:
    """Processes PDF, TXT, and MD files into split LangChain Documents with metadata."""

    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""],
        )

    def process_file(self, file_path: Union[str, Path]) -> List[Document]:
        """Process a file from disk into chunks."""
        path = Path(file_path)
        if not path.is_file():
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = path.suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise UnsupportedFileTypeError(
                f"Unsupported file extension '{ext}'. Supported extensions: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )

        with open(path, "rb") as f:
            content = f.read()

        return self.process_bytes(content, filename=path.name)

    def process_bytes(self, content_bytes: bytes, filename: str) -> List[Document]:
        """Process in-memory raw bytes with filename into chunks."""
        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise UnsupportedFileTypeError(
                f"Unsupported file type '{ext}' for file '{filename}'. Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )

        if ext == ".pdf":
            return self._process_pdf_bytes(content_bytes, filename)
        else:
            return self._process_text_bytes(content_bytes, filename, ext)

    def _process_pdf_bytes(self, content_bytes: bytes, filename: str) -> List[Document]:
        """Extract pages from PDF and split into chunks preserving page_number."""
        try:
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
        except Exception as e:
            logger.error("Failed to parse PDF '%s': %s", filename, e)
            raise DocumentProcessingError(f"Failed to read PDF '{filename}': {str(e)}") from e

        all_chunks: List[Document] = []
        global_chunk_idx = 0

        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1  # 1-indexed page number
            text = page.extract_text() or ""
            if not text.strip():
                continue

            chunks = self.text_splitter.split_text(text)
            for local_idx, chunk_text in enumerate(chunks):
                chunk_id = f"{filename}_p{page_num}_c{local_idx}"
                metadata = {
                    "filename": filename,
                    "page_number": page_num,
                    "chunk_id": chunk_id,
                    "source_type": "pdf",
                }
                all_chunks.append(Document(page_content=chunk_text, metadata=metadata))
                global_chunk_idx += 1

        logger.info("Processed PDF '%s': generated %d chunks across %d pages", filename, len(all_chunks), len(reader.pages))
        return all_chunks

    def _process_text_bytes(self, content_bytes: bytes, filename: str, ext: str) -> List[Document]:
        """Split plain text or markdown content into chunks."""
        try:
            text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = content_bytes.decode("latin-1")
            except Exception as e:
                raise DocumentProcessingError(f"Failed to decode text file '{filename}': {str(e)}") from e

        if not text.strip():
            return []

        chunks = self.text_splitter.split_text(text)
        source_type = ext.lstrip(".")
        result: List[Document] = []

        for idx, chunk_text in enumerate(chunks):
            chunk_id = f"{filename}_c{idx}"
            metadata = {
                "filename": filename,
                "page_number": None,
                "chunk_id": chunk_id,
                "source_type": source_type,
            }
            result.append(Document(page_content=chunk_text, metadata=metadata))

        logger.info("Processed text/md '%s': generated %d chunks", filename, len(result))
        return result


def get_document_processor() -> DocumentProcessor:
    """Factory function for DocumentProcessor."""
    return DocumentProcessor()
