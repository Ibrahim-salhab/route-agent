import io
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from app.main import app

client = TestClient(app)


def test_validation_gate_4_health_endpoint():
    """Verify health endpoint returns 200 and does not leak API keys."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["api"] == "ok"
    assert "status" in data
    assert "vector_store" in data
    assert "embedding_service" in data
    assert "llm_provider" in data
    assert "llm_model" in data
    # Ensure no secret keys are leaked
    raw_text = response.text
    assert "api_key" not in raw_text.lower()
    assert "secret" not in raw_text.lower()

    # Test compatibility alias
    alias_response = client.get("/health")
    assert alias_response.status_code == 200


def test_validation_gate_4_valid_query():
    """Verify valid query returns 200 and matches QueryResponse schema."""
    fake_state = {
        "query": "What is Python?",
        "tool_used": "direct_reasoning",
        "sources": [],
        "final_answer": "Python is a high-level general-purpose programming language.",
        "intermediate_steps": [],
    }

    with patch("app.api.v1.endpoints.get_research_agent") as mock_agent_factory:
        mock_agent = MagicMock()
        mock_agent.run.return_value = fake_state
        mock_agent_factory.return_value = mock_agent

        payload = {"query": "What is Python?"}
        response = client.post("/api/v1/query", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == fake_state["final_answer"]
        assert data["tool_used"] == "direct_reasoning"
        assert isinstance(data["sources"], list)
        assert isinstance(data["latency_ms"], (int, float))
        assert "X-Process-Time-Ms" in response.headers


@pytest.mark.parametrize("invalid_query", ["", "  ", "ab", "  x  "])
def test_validation_gate_4_invalid_query(invalid_query):
    """Verify invalid query (< 3 characters trimmed) returns 422 Unprocessable Entity."""
    response = client.post("/api/v1/query", json={"query": invalid_query})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data or "error" in data


def test_validation_gate_4_valid_document_upload():
    """Verify valid document upload returns 200 and reports chunks indexed."""
    file_content = b"Route Agent is designed for autonomous research combining local RAG and search."
    files = {"file": ("test_doc.txt", io.BytesIO(file_content), "text/plain")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["filename"] == "test_doc.txt"
    assert data["chunks_indexed"] >= 1


def test_validation_gate_4_markdown_document_upload():
    """Verify markdown upload succeeds."""
    file_content = b"# System Spec\n\nChromaDB persistence is configured locally."
    files = {"file": ("spec.md", io.BytesIO(file_content), "text/markdown")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["chunks_indexed"] >= 1


def test_validation_gate_4_invalid_upload_extension():
    """Verify uploading an unsupported file extension returns 400 Bad Request."""
    file_content = b"col1,col2\nval1,val2"
    files = {"file": ("table.csv", io.BytesIO(file_content), "text/csv")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "Unsupported file type" in data["detail"]


def test_validation_gate_4_empty_file_upload():
    """Verify uploading an empty file returns 400 Bad Request."""
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "empty" in data["detail"].lower()
