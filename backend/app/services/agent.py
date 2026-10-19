from datetime import datetime
import re
from typing import Any, Dict, List, Optional, TypedDict
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from app.core.logging import get_logger
from app.services.llm import get_llm
from app.services.tools import search_internal_documents, search_web
from app.services.vector_store import VectorStoreService, get_vector_store_service

logger = get_logger(__name__)


class AgentState(TypedDict):
    """LangGraph agent state specification."""
    query: str
    messages: List[Any]
    intermediate_steps: List[Dict[str, Any]]
    sources: List[Dict[str, Any]]
    tool_used: str  # "internal_search" | "web_search" | "direct_reasoning"
    final_answer: str


# Heuristic patterns for intent detection (English & Arabic)
INTERNAL_PATTERNS = [
    # English patterns
    r"\b(uploaded|document|documents|file|files|pdf|txt|markdown|doc|docs|internal|notes|project spec|specification|report|handbook|presentation)\b",
    r"\b(in the (uploaded|attached|given) (file|document|text))\b",
    r"\b(according to (the|my) (document|file|notes|report))\b",
    r"\b(what does the document say)\b",
    r"\b(summarize the document)\b",
    # Arabic document keywords & phrases
    r"(ملف|الملف|ملفات|الملفات|مستند|المستند|مستندات|المستندات|مرفق|المرفق|مرفقات|المرفقات|مرفوع|المرفوع|مرفوعة|المرفوعة|وثيقة|الوثيقة|وثائق|الوثائق|تقرير|التقرير|مذكرة|المذكرة|عقد|العقد)",
    r"(في (الملف|المستند|المرفق|الوثيقة)|من (الملف|المستند|المرفق|الوثيقة)|حسب (الملف|المستند|المرفق|الوثيقة)|وفق (الملف|المستند|المرفق)|بناء على (الملف|المستند))",
    r"(ماذا (يقول|يوجد في|ورد في|ذكر في|جاء في|يتضمن|يحتوي)|عن ماذا (يتحدث|يدور)|ما هو محتوى|اشرح لي محتوى|لخص|لخص لي|تلخيص|محتوى الملف)",
]

WEB_PATTERNS = [
    # English patterns
    r"\b(current|latest|today|now|live|news|recent|weather|price|stock|update|status of|who is the current)\b",
    r"\b(in (2025|2026|2027))\b",
    r"\b(happening (now|today|this week))\b",
    r"\b(current score|election|stock price|exchange rate)\b",
    # Arabic web patterns
    r"(اليوم|الآن|حاليا|مباشر|أحدث|أخبار|سعر|أسعار|سعر سهم|تحديث|الطقس|أهم أخبار|ما هو أحدث|ما هي آخر|من هو رئيس)",
    r"في (2025|2026|2027)",
]


def determine_route(
    query: str,
    vector_store: Optional[VectorStoreService] = None,
) -> str:
    """
    Deterministic query routing logic:
    - internal_search: queries asking about uploaded/internal documents or when matching indexed docs.
    - web_search: queries requiring real-time/current/live external knowledge.
    - direct_reasoning: general reasoning, conceptual questions, coding, math.
    """
    cleaned_query = query.strip().lower()

    # 1. Check for explicit internal document keywords
    for pattern in INTERNAL_PATTERNS:
        if re.search(pattern, cleaned_query):
            logger.info("Routing query to 'internal_search' based on document keyword pattern: %s", pattern)
            return "internal_search"

    # 2. Check for time-sensitive/web keywords
    for pattern in WEB_PATTERNS:
        if re.search(pattern, cleaned_query):
            logger.info("Routing query to 'web_search' based on time-sensitive pattern: %s", pattern)
            return "web_search"

    # 3. Check if indexed vector store contains highly relevant documents
    try:
        store = vector_store or get_vector_store_service()
        if store.count() > 0:
            similar_docs = store.similarity_search_with_score(query, k=1)
            if similar_docs:
                doc, score = similar_docs[0]
                # In Chroma with cosine/L2 distance, low distance (< 0.7) means high relevance
                if score is not None and score < 0.7:
                    logger.info("Routing query to 'internal_search' based on vector store match (score=%.3f)", score)
                    return "internal_search"
    except Exception as e:
        logger.warning("Error checking vector store during routing: %s", e)

    # 4. Default to direct reasoning for conceptual, math, code, or general reasoning
    logger.info("Routing query to 'direct_reasoning'")
    return "direct_reasoning"


class ResearchAgent:
    """LangGraph-powered research agent orchestrator."""

    def __init__(
        self,
        llm: Optional[BaseChatModel] = None,
        vector_store: Optional[VectorStoreService] = None,
    ) -> None:
        self.llm = llm
        self.vector_store = vector_store
        self.workflow = self._build_graph()

    def _get_llm(self) -> Optional[BaseChatModel]:
        if self.llm is not None:
            return self.llm
        try:
            return get_llm()
        except Exception as e:
            logger.warning("LLM client could not be initialized from settings: %s", e)
            return None

    def _build_graph(self) -> Any:
        graph = StateGraph(AgentState)

        graph.add_node("router", self._router_node)
        graph.add_node("internal_search", self._internal_search_node)
        graph.add_node("web_search", self._web_search_node)
        graph.add_node("generate_answer", self._generate_answer_node)

        graph.add_edge(START, "router")

        graph.add_conditional_edges(
            "router",
            self._route_decision,
            {
                "internal_search": "internal_search",
                "web_search": "web_search",
                "direct_reasoning": "generate_answer",
            },
        )

        graph.add_edge("internal_search", "generate_answer")
        graph.add_edge("web_search", "generate_answer")
        graph.add_edge("generate_answer", END)

        return graph.compile()

    def _route_decision(self, state: AgentState) -> str:
        return state["tool_used"]

    def _router_node(self, state: AgentState) -> Dict[str, Any]:
        query = state["query"]
        route = determine_route(query, vector_store=self.vector_store)
        logger.info("Agent router decided route: '%s' for query: '%s'", route, query)
        step = {
            "step": "router",
            "decision": route,
            "query": query,
        }
        return {
            "tool_used": route,
            "intermediate_steps": state.get("intermediate_steps", []) + [step],
        }

    def _internal_search_node(self, state: AgentState) -> Dict[str, Any]:
        query = state["query"]
        results = search_internal_documents(query=query, k=4, vector_store=self.vector_store)
        step = {
            "step": "internal_search",
            "results_count": len(results),
        }
        return {
            "sources": results,
            "intermediate_steps": state.get("intermediate_steps", []) + [step],
        }

    def _web_search_node(self, state: AgentState) -> Dict[str, Any]:
        query = state["query"]
        results = search_web(query=query, max_results=5)
        step = {
            "step": "web_search",
            "results_count": len(results),
        }
        return {
            "sources": results,
            "intermediate_steps": state.get("intermediate_steps", []) + [step],
        }

    def _generate_answer_node(self, state: AgentState) -> Dict[str, Any]:
        query = state["query"]
        tool_used = state["tool_used"]
        sources = state.get("sources", [])
        llm = self._get_llm()

        # Build context from sources
        context_parts: List[str] = []
        for src in sources:
            src_type = src.get("source_type")
            title = src.get("title", "")
            snippet = src.get("snippet", "")
            url = src.get("url")

            if src_type == "internal":
                context_parts.append(f"[Internal Document: {title}]\n{snippet}")
            elif src_type == "web":
                context_parts.append(f"[Web Source: {title} ({url})]\n{snippet}")

        context_str = "\n\n".join(context_parts)

        current_date_str = datetime.now().strftime("%B %Y")
        system_instruction = (
            f"You are Route Agent, an autonomous research assistant. Current Date: {current_date_str}. "
            "Provide accurate, clear, and comprehensive answers formatted cleanly in Markdown (using headers ###, lists, bold, tables, or code blocks where helpful). "
            "When retrieved web or document context is provided, base your answer strictly on the retrieved facts and prioritize the most up-to-date real-world information. "
            "Always cite sources explicitly when context is provided. "
            "Respond in the exact same language as the user's question (e.g., if the question is in Arabic, respond in clear, fluent Arabic based on the provided documents or web sources). "
            "If no context is provided, answer using careful reasoning without fabricating any citations."
        )

        user_content = f"Question: {query}"
        if context_str:
            user_content += f"\n\nRetrieved Context:\n{context_str}"

        # Try candidate LLMs with automatic fallback on quota exhaustion
        candidates: List[BaseChatModel] = [llm] if llm is not None else []
        from app.core.config import settings
        from app.services.llm import FALLBACK_GEMINI_MODELS, get_llm
        if settings.GEMINI_API_KEY and settings.LLM_PROVIDER.lower() == "gemini":
            current_model = getattr(llm, "model", settings.LLM_MODEL) if llm else settings.LLM_MODEL
            for fb_model in FALLBACK_GEMINI_MODELS:
                if fb_model != current_model:
                    try:
                        candidates.append(get_llm(model=fb_model, max_retries=1))
                    except Exception:
                        pass

        final_answer = ""
        for candidate_llm in candidates:
            try:
                response = candidate_llm.invoke([
                    SystemMessage(content=system_instruction),
                    HumanMessage(content=user_content),
                ])
                raw_content = response.content if isinstance(response, AIMessage) else response
                if isinstance(raw_content, str):
                    ans = raw_content
                elif isinstance(raw_content, list):
                    extracted = []
                    for part in raw_content:
                        if isinstance(part, str):
                            extracted.append(part)
                        elif isinstance(part, dict):
                            extracted.append(part.get("text", ""))
                        else:
                            extracted.append(str(part))
                    ans = "".join(extracted).strip()
                else:
                    ans = str(raw_content)

                if ans and ans.strip():
                    final_answer = ans
                    break
            except Exception as e:
                logger.warning("Candidate LLM failed: %s. Cascading to next candidate...", e)

        if not final_answer:
            final_answer = self._generate_fallback_answer(query, tool_used, sources)

        step = {
            "step": "generate_answer",
            "sources_attributed": len(sources),
        }

        return {
            "final_answer": final_answer,
            "intermediate_steps": state.get("intermediate_steps", []) + [step],
        }

    def _generate_fallback_answer(
        self, query: str, tool_used: str, sources: List[Dict[str, Any]]
    ) -> str:
        """Deterministic answer formatter when external LLM is not called or mocked."""
        if tool_used == "internal_search":
            if not sources:
                return f"No relevant internal documents were found matching your query: '{query}'."
            top_sources = [s.get("title", "document") for s in sources[:2]]
            snippets = [s.get("snippet", "").strip() for s in sources[:2] if s.get("snippet")]
            combined_snippet = " ".join(snippets)
            return (
                f"Based on internal documents ({', '.join(top_sources)}): {combined_snippet}"
            )

        elif tool_used == "web_search":
            if not sources:
                return f"Web search did not return results for query: '{query}'."
            citations = [f"{s.get('title')} ({s.get('url')})" for s in sources[:2]]
            snippets = [s.get("snippet", "").strip() for s in sources[:2] if s.get("snippet")]
            combined_snippet = " ".join(snippets)
            return (
                f"According to current web sources ({'; '.join(citations)}): {combined_snippet}"
            )

        else:
            cleaned_q = query.strip().lower()
            if any(g in cleaned_q for g in ["how are you", "hi", "hello", "hey", "مرحبا", "أهلا", "كيف حالك", "كيفك", "عامل ايه"]):
                return "Hello! I am doing well, thank you for asking! I am Route Agent, ready to assist you with researching your documents or the live web. How can I help you today?"
            return (
                f"Direct reasoning answer for query: '{query}'. "
                f"This answer was generated purely via reasoning without consulting external sources."
            )

    def run(self, query: str) -> AgentState:
        """Execute the agent graph synchronously for a given query."""
        initial_state: AgentState = {
            "query": query,
            "messages": [HumanMessage(content=query)],
            "intermediate_steps": [],
            "sources": [],
            "tool_used": "direct_reasoning",
            "final_answer": "",
        }
        logger.info("Running ResearchAgent for query: '%s'", query)
        final_state: AgentState = self.workflow.invoke(initial_state)
        return final_state


def get_research_agent(
    llm: Optional[BaseChatModel] = None,
    vector_store: Optional[VectorStoreService] = None,
) -> ResearchAgent:
    """Factory function for ResearchAgent."""
    return ResearchAgent(llm=llm, vector_store=vector_store)
