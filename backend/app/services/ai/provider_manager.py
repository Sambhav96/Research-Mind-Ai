"""Provider Manager for handling AI model fallbacks."""
from __future__ import annotations

import logging
from typing import AsyncGenerator

from app.services.ai.interfaces import (
    AIGenerationProvider,
    GenerationResult,
)

logger = logging.getLogger("scholarmind.provider_manager")


class GenerationProviderManager(AIGenerationProvider):
    """Manages primary and fallback generation providers."""

    def __init__(self, primary: AIGenerationProvider, fallback: AIGenerationProvider | None):
        self._primary = primary
        self._fallback = fallback

    def _should_fallback(self, e: Exception) -> bool:
        """Determine if an exception warrants falling back to the secondary provider."""
        error_msg = str(e).upper()
        # Fall back if we see rate limit / quota / exhaustion errors
        if any(term in error_msg for term in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"]):
            return True
        # Also fall back if the primary explicitly states it exhausted all retries
        if isinstance(e, RuntimeError) and "FAILED AFTER ALL RETRIES" in error_msg:
            return True
        return False

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        response_json: bool = False,
    ) -> GenerationResult:
        try:
            return await self._primary.generate(
                prompt=prompt,
                system=system,
                temperature=temperature,
                max_tokens=max_tokens,
                response_json=response_json,
            )
        except Exception as e:
            if self._fallback and self._should_fallback(e):
                logger.warning(f"Gemini unavailable -> switching to OpenRouter (Error: {e})")
                return await self._fallback.generate(
                    prompt=prompt,
                    system=system,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_json=response_json,
                )
            raise

    async def generate_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        try:
            # We must be careful with streaming: if the generator fails mid-stream, 
            # we cannot easily fallback and resume. 
            # However, usually quota errors happen before the first yield.
            
            # To catch initial errors safely, we can eagerly request the first item.
            # But the AsyncGenerator is returned immediately, and execution only starts on first __anext__.
            stream_gen = self._primary.generate_stream(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            
            # Since AsyncGenerator __anext__ can't be peeked without consuming, 
            # we'll wrap the iteration so we can catch the first exception.
            # If an exception happens on the very first yield, we can fallback.
            
            # Note: in Python 3.10+ anext() can be used with a default, but catching is safer.
            first_chunk = None
            try:
                first_chunk = await stream_gen.__anext__()
            except StopAsyncIteration:
                return
            
            # If we got here, the stream successfully started.
            yield first_chunk
            async for chunk in stream_gen:
                yield chunk

        except Exception as e:
            if self._fallback and self._should_fallback(e):
                logger.warning(f"Gemini unavailable -> switching to OpenRouter (Stream Error: {e})")
                async for chunk in self._fallback.generate_stream(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                ):
                    yield chunk
            else:
                raise
