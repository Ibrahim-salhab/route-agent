import re
from typing import Any, Dict, List, Optional
try:
    from ddgs import DDGS
except ImportError:
    from duckduckgo_search import DDGS

from app.core.config import settings
from app.core.logging import get_logger
from app.services.vector_store import VectorStoreService, get_vector_store_service

logger = get_logger(__name__)

# Search engine landing pages that provide no informative content
GENERIC_SEARCH_PATTERNS = [
    r"^https?://(www\.)?(google|bing|yahoo|brave|duckduckgo)\.com/?$",
    r"^https?://(search\.yahoo|search\.brave)\.com/?$",
]


def sanitize_search_query(query: str) -> str:
    """
    Remove conversational meta-prefixes such as 'Search about', 'Look up',
    'ابحث عن' and trailing punctuation so that search engines retrieve factual content
    rather than search engine directory pages.
    """
    cleaned = re.sub(
        r"^(please\s+)?(can\s+you\s+)?(search(\s+online|\s+the\s+web|\s+for|\s+about)?|look\s+up|find(\s+out)?|tell\s+me(\s+about)?)\s+",
        "",
        query.strip(),
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"^(من\s+فضلك\s+)?(لو\s+سمحت\s+)?(ابحث(\s+في\s+الإنترنت|\s+أونلاين|\s+عن|\s+لي\s+عن)?|دور\s+على)\s+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = cleaned.strip(" ?.!؟")
    return cleaned if cleaned else query.strip()


def search_internal_documents(
    query: str,
    k: int = 4,
    vector_store: Optional[VectorStoreService] = None,
) -> List[Dict[str, Any]]:
    """
    Search indexed user documents using ChromaDB vector store.
    Returns normalized internal sources.
    """
    logger.info("Executing search_internal_documents with query: '%s', k=%d", query, k)
    store = vector_store or get_vector_store_service()

    try:
        results_with_score = store.similarity_search_with_score(query=query, k=k)
    except Exception as e:
        logger.error("Failed to execute internal document search: %s", e)
        return []

    formatted_results: List[Dict[str, Any]] = []
    for doc, score in results_with_score:
        metadata = doc.metadata or {}
        page_num = metadata.get("page_number")
        filename = metadata.get("filename", "unknown_document")

        # Human-readable title/citation
        title = f"{filename} — page {page_num}" if page_num is not None else filename

        formatted_results.append({
            "title": title,
            "filename": filename,
            "page_number": page_num,
            "snippet": doc.page_content,
            "score": float(score),
            "source_type": "internal",
            "url": None,
        })

    logger.info("Internal document search found %d relevant snippets", len(formatted_results))
    return formatted_results


def search_web(
    query: str,
    max_results: int = 5,
    timeout: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Search the web using DuckDuckGo search.
    Returns normalized web sources: title, url, snippet, source_type='web'.
    """
    search_timeout = timeout or settings.WEB_SEARCH_TIMEOUT
    effective_query = sanitize_search_query(query)
    logger.info(
        "Executing search_web with effective_query: '%s' (original: '%s'), max_results=%d, timeout=%ds",
        effective_query, query, max_results, search_timeout
    )

    normalized_results: List[Dict[str, Any]] = []
    try:
        with DDGS(timeout=search_timeout) as ddgs:
            raw_results = list(ddgs.text(effective_query, max_results=max_results + 2))
            if not raw_results and effective_query != query:
                # Fallback to original query
                raw_results = list(ddgs.text(query, max_results=max_results))
            if not raw_results:
                # Retry with punctuation stripped
                cleaned = re.sub(r"[^\w\s]", " ", effective_query).strip()
                if cleaned and cleaned != effective_query:
                    raw_results = list(ddgs.text(cleaned, max_results=max_results))

        for item in raw_results:
            title = item.get("title", "").strip()
            url = (item.get("href") or item.get("url", "")).strip()
            snippet = (item.get("body") or item.get("snippet", "")).strip()

            # Filter out empty or generic search engine homepages
            if not title and not url:
                continue
            if any(re.match(p, url, re.IGNORECASE) for p in GENERIC_SEARCH_PATTERNS):
                continue

            normalized_results.append({
                "title": title,
                "url": url,
                "snippet": snippet,
                "filename": None,
                "page_number": None,
                "score": None,
                "source_type": "web",
            })

            if len(normalized_results) >= max_results:
                break

        logger.info("Web search returned %d results", len(normalized_results))
    except Exception as e:
        logger.warning("Web search encountered an error for query '%s': %s", query, e)
        return []

    return normalized_results
