from typing import List, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# List of supported production models ordered by preference for quota cascading
FALLBACK_GEMINI_MODELS: List[str] = [
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
]


class LLMConfigurationError(Exception):
    """Raised when LLM provider or API key is misconfigured."""
    pass


def get_llm(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.0,
    max_retries: int = 1,
) -> BaseChatModel:
    """
    Factory to instantiate LLM client based on configuration.
    Supports Google Gemini ('gemini') and Groq ('groq').
    Uses max_retries=1 to prevent hanging for 35s on daily quota exhaustion.
    """
    chosen_provider = (provider or settings.LLM_PROVIDER).lower().strip()
    chosen_model = model or settings.LLM_MODEL

    logger.info("Initializing LLM provider: '%s', model: '%s'", chosen_provider, chosen_model)

    if chosen_provider == "gemini":
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise LLMConfigurationError(
                "GEMINI_API_KEY is not set. Please set GEMINI_API_KEY in your .env or environment."
            )
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=chosen_model,
            google_api_key=api_key,
            temperature=temperature,
            max_retries=max_retries,
        )

    elif chosen_provider == "groq":
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise LLMConfigurationError(
                "GROQ_API_KEY is not set. Please set GROQ_API_KEY in your .env or environment."
            )
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=chosen_model,
            groq_api_key=api_key,
            temperature=temperature,
        )

    else:
        raise LLMConfigurationError(
            f"Unsupported LLM provider '{chosen_provider}'. Supported providers: 'gemini', 'groq'."
        )
