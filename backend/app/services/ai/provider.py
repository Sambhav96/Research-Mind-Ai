"""AI service factory — returns the correct provider based on config."""
from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.services.ai.gemini_provider import GeminiEmbeddingProvider, GeminiGenerationProvider
from app.services.ai.openrouter_provider import OpenRouterGenerationProvider
from app.services.ai.provider_manager import GenerationProviderManager
from app.services.ai.interfaces import AIEmbeddingProvider, AIGenerationProvider


def get_embedding_provider() -> AIEmbeddingProvider:
    """Return the configured embedding provider (currently: Gemini)."""
    settings = get_settings()
    return GeminiEmbeddingProvider(api_key=settings.gemini_api_key)


def get_generation_provider() -> AIGenerationProvider:
    """Return the configured generation provider with fallback."""
    settings = get_settings()
    
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"GEMINI KEY PREFIX: {settings.gemini_api_key[:12]}")
    
    primary = GeminiGenerationProvider(
        api_key=settings.gemini_api_key,
        model=settings.gemini_model,
        temperature=settings.gemini_temperature,
        max_tokens=settings.gemini_max_tokens,
    )
    
    fallback = None
    if settings.openrouter_api_key:
        fallback = OpenRouterGenerationProvider(
            api_key=settings.openrouter_api_key,
            model=settings.openrouter_model,
            temperature=settings.gemini_temperature,
            max_tokens=settings.gemini_max_tokens,
        )
        
    return GenerationProviderManager(primary=primary, fallback=fallback)
