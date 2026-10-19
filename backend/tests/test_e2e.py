"""
Phase 6 — End-to-End Integration Tests for Route Agent
Validates the three primary research workflows required by Agent.md Section 11:
1. Scenario 1 — Document Retrieval (Upload document -> Index -> Query document -> Vector retrieval -> Cites doc)
2. Scenario 2 — Current Information (Time-sensitive query -> Web search -> Web sources attribution)
3. Scenario 3 — General Reasoning (Non-retrieval query -> Direct reasoning -> No unnecessary search)
"""

import io
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_scenario_1_document_retrieval_e2e():
    """
    Scenario 1 — Document Retrieval:
    1. Upload document via POST /api/v1/documents/upload
    2. Document is chunked, embedded, and stored in vector store
    3. Query asking about uploaded document content via POST /api/v1/query
    4. LangGraph agent selects 'internal_search' route
    5. Final response cites the uploaded document with source attribution
    """
    doc_filename = "chronos_system_spec.txt"
    doc_content = (
        b"Project Chronos Architecture Specification:\n"
        b"The Chronos distributed consensus protocol achieves an average latency of 142.5 milliseconds "
        b"with 99.99 percent availability across multi-region deployments.\n"
        b"Storage is partitioned into primary nodes and read-replicas with Raft consensus."
    )

    # 1. Upload Document
    upload_response = client.post(
        "/api/v1/documents/upload",
        files={"file": (doc_filename, io.BytesIO(doc_content), "text/plain")},
    )
    assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
    upload_data = upload_response.json()
    assert upload_data["status"] == "success"
    assert upload_data["filename"] == doc_filename
    assert upload_data["chunks_indexed"] >= 1

    # 2. Query knowledge from uploaded document
    query_payload = {
        "query": "What is the average latency of the Chronos consensus protocol in the uploaded document?"
    }
    query_response = client.post("/api/v1/query", json=query_payload)
    assert query_response.status_code == 200, f"Query failed: {query_response.text}"

    result = query_response.json()

    # Verify agent routing and source attribution
    assert result["tool_used"] == "internal_search", f"Expected internal_search, got: {result['tool_used']}"
    assert len(result["sources"]) >= 1, "Expected at least one attributed source"

    first_source = result["sources"][0]
    assert first_source["source_type"] == "internal"
    assert first_source["filename"] == doc_filename
    assert "142.5" in first_source["snippet"] or "Chronos" in first_source["snippet"]

    # Verify answer generation and timing
    assert len(result["answer"]) > 0
    assert result["latency_ms"] > 0
    assert "X-Process-Time-Ms" in query_response.headers


def test_scenario_2_current_information_e2e():
    """
    Scenario 2 — Current Information:
    1. Ask time-sensitive query via POST /api/v1/query
    2. LangGraph agent selects 'web_search' route
    3. Search results retrieved and attributed
    4. Answer includes web source citations
    """
    fake_web_results = [
        {
            "title": "Quantum Computing Breakthrough 2026",
            "url": "https://www.technologyreview.com/quantum-2026",
            "snippet": "Researchers announce a 10,000 qubit fault-tolerant quantum processor operating at room temperature.",
            "source_type": "web",
            "filename": None,
            "page_number": None,
            "score": None,
        }
    ]

    with patch("app.services.agent.search_web", return_value=fake_web_results):
        query_payload = {
            "query": "What is the latest news today about quantum computing breakthroughs?"
        }
        query_response = client.post("/api/v1/query", json=query_payload)
        assert query_response.status_code == 200, f"Query failed: {query_response.text}"

        result = query_response.json()

        assert result["tool_used"] == "web_search", f"Expected web_search, got: {result['tool_used']}"
        assert len(result["sources"]) == 1
        assert result["sources"][0]["source_type"] == "web"
        assert result["sources"][0]["url"] == "https://www.technologyreview.com/quantum-2026"
        assert "10,000 qubit" in result["sources"][0]["snippet"]
        assert len(result["answer"]) > 0
        assert result["latency_ms"] > 0


def test_scenario_3_general_reasoning_e2e():
    """
    Scenario 3 — General Reasoning:
    1. Ask non-retrieval conceptual query via POST /api/v1/query
    2. LangGraph agent selects 'direct_reasoning' route
    3. Agent answers without unnecessary search or vector retrieval
    4. Attributed sources list is empty
    """
    query_payload = {
        "query": "Explain the conceptual difference between a process and a thread in operating systems."
    }

    query_response = client.post("/api/v1/query", json=query_payload)
    assert query_response.status_code == 200, f"Query failed: {query_response.text}"

    result = query_response.json()

    assert result["tool_used"] == "direct_reasoning", f"Expected direct_reasoning, got: {result['tool_used']}"
    assert result["sources"] == [], "Direct reasoning queries must not consult external sources"
    assert len(result["answer"]) > 0
    assert result["latency_ms"] > 0


def test_full_application_lifecycle_e2e():
    """
    Comprehensive lifecycle integration test:
    Health Check -> Markdown Upload -> Internal Query -> Reasoning Query
    """
    # 1. Health check returns healthy
    health_resp = client.get("/api/v1/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["api"] == "ok"

    # 2. Markdown Document Upload
    md_content = b"# Route Agent Handbook\n\nRoute Agent uses LangGraph for stateful agentic orchestration."
    upload_resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("handbook.md", io.BytesIO(md_content), "text/markdown")},
    )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["chunks_indexed"] >= 1

    # 3. Query regarding uploaded handbook
    query_resp = client.post(
        "/api/v1/query",
        json={"query": "According to the uploaded handbook, what framework is used for agentic orchestration?"},
    )
    assert query_resp.status_code == 200
    data = query_resp.json()
    assert data["tool_used"] == "internal_search"
    assert any("handbook.md" in str(s.get("filename", "")) for s in data["sources"])
