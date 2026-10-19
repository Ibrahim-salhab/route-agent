import pytest
from app.core.config import Settings, settings


def test_default_settings():
    """Test default values of application settings."""
    assert settings.APP_ENV in ["development", "staging", "production", "test"]
    assert settings.HOST == "0.0.0.0"
    assert settings.PORT == 8000
    assert isinstance(settings.DEBUG, bool)
    assert settings.LLM_PROVIDER in ["gemini", "groq"]
    assert isinstance(settings.CORS_ORIGINS, list)
    assert len(settings.CORS_ORIGINS) > 0
    assert "sentence-transformers/all-MiniLM-L6-v2" in settings.EMBEDDING_MODEL
    assert settings.WEB_SEARCH_TIMEOUT == 10


def test_settings_env_override(monkeypatch):
    """Test overriding configuration settings via environment variables."""
    monkeypatch.setenv("PORT", "9999")
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("CORS_ORIGINS", "http://test1.local, http://test2.local")

    custom_settings = Settings()
    assert custom_settings.PORT == 9999
    assert custom_settings.DEBUG is True
    assert custom_settings.LLM_PROVIDER == "groq"
    assert custom_settings.CORS_ORIGINS == ["http://test1.local", "http://test2.local"]


def test_settings_cors_json_parsing():
    """Test CORS_ORIGINS as a JSON array string."""
    custom_settings = Settings(CORS_ORIGINS='["http://alpha.com", "http://beta.com"]')
    assert custom_settings.CORS_ORIGINS == ["http://alpha.com", "http://beta.com"]
