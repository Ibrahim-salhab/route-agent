import pytest
from unittest.mock import MagicMock, patch
from langchain_core.documents import Document
from langchain_core.messages import AIMessage
from app.services.agent import ResearchAgent, determine_route, get_research_agent
from app.services.tools import search_internal_documents, search_web


class MockChatModel:
    """Mock LLM for deterministic, zero-cost test validation."""

    def invoke(self, messages):
        return AIMessage(content="Mocked LLM reasoning response based on provided context.")


def test_independent_routing_decisions():
    """
    Validation Gate 3 Requirement:
    Routing decision must be testable independently from the final LLM response.
    """
    # 1. Query requiring internal knowledge -> Vector search selected
    internal_queries = [
        "What does the uploaded document say about system latency?",
        "According to my notes in the file, what is the policy?",
        "Summarize the attached PDF report.",
    ]
    for q in internal_queries:
        decision = determine_route(q)
        assert decision == "internal_search", f"Expected 'internal_search' for query: {q}, got: {decision}"

    # 2. Query requiring current information -> Web search selected
    web_queries = [
        "What is the latest news today?",
        "What is the current stock price of Apple?",
        "What are the recent updates in 2026 for AI?",
    ]
    for q in web_queries:
        decision = determine_route(q)
        assert decision == "web_search", f"Expected 'web_search' for query: {q}, got: {decision}"

    # 3. General reasoning query -> No unnecessary external tool (Direct reasoning selected)
    reasoning_queries = [
        "What is dynamic programming in computer science?",
        "Explain the mathematical proof of Pythagoras theorem.",
        "How do transformers compare to recurrent neural networks?",
    ]
    for q in reasoning_queries:
        decision = determine_route(q)
        assert decision == "direct_reasoning", f"Expected 'direct_reasoning' for query: {q}, got: {decision}"


def test_agent_graph_internal_search_route():
    """Test full agent execution on internal search route."""
    mock_vector_store = MagicMock()
    sample_doc = Document(
        page_content="The Route Agent latency target is under 200 milliseconds.",
        metadata={"filename": "architecture.pdf", "page_number": 4, "chunk_id": "c1"},
    )
    mock_vector_store.similarity_search_with_score.return_value = [(sample_doc, 0.15)]

    agent = ResearchAgent(llm=MockChatModel(), vector_store=mock_vector_store)
    state = agent.run("What does the uploaded document say about latency?")

    assert state["tool_used"] == "internal_search"
    assert len(state["sources"]) >= 1
    assert state["sources"][0]["source_type"] == "internal"
    assert state["sources"][0]["filename"] == "architecture.pdf"
    assert state["sources"][0]["page_number"] == 4
    assert len(state["final_answer"]) > 0


def test_agent_graph_web_search_route():
    """Test full agent execution on web search route."""
    fake_web_results = [
        {
            "title": "Latest AI Breakthroughs 2026",
            "url": "https://example.com/ai-news",
            "snippet": "New breakthroughs in multimodal autonomous agents have emerged.",
            "source_type": "web",
            "filename": None,
            "page_number": None,
            "score": None,
        }
    ]

    with patch("app.services.agent.search_web", return_value=fake_web_results):
        agent = ResearchAgent(llm=MockChatModel())
        state = agent.run("What is the latest news today regarding AI?")

        assert state["tool_used"] == "web_search"
        assert len(state["sources"]) == 1
        assert state["sources"][0]["source_type"] == "web"
        assert state["sources"][0]["url"] == "https://example.com/ai-news"
        assert len(state["final_answer"]) > 0


def test_agent_graph_direct_reasoning_route():
    """Test full agent execution on general reasoning query with zero external tool calls."""
    agent = ResearchAgent(llm=MockChatModel())
    state = agent.run("What is the difference between a stack and a queue?")

    assert state["tool_used"] == "direct_reasoning"
    # No unnecessary tools used and no fabricated sources
    assert len(state["sources"]) == 0
    assert "Mocked LLM reasoning response" in state["final_answer"]
