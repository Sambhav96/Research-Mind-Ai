"""OpenRouter AI Provider for fallback generation."""
from __future__ import annotations

import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI
import httpx

from app.services.ai.interfaces import (
    AIGenerationProvider,
    GenerationResult,
)

logger = logging.getLogger("scholarmind.openrouter")


class OpenRouterGenerationProvider(AIGenerationProvider):
    """OpenRouter generation provider using the OpenAI SDK."""

    def __init__(
        self,
        api_key: str,
        model: str,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ):
        self._model = model
        self._temperature = temperature
        self._max_tokens = max_tokens
        
        # OpenRouter requires an API key, but we don't want to crash on startup if it's missing (fallback might be optional)
        # However, the AsyncOpenAI client raises if api_key is empty string.
        if not api_key:
            # We'll initialize it with a dummy key so the app boots, but any actual call will fail (and be caught).
            api_key = "dummy"
            
        self._client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_json: bool = False,
    ) -> GenerationResult:
        """Generate a text response via OpenRouter."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        temp = temperature if temperature is not None else self._temperature
        tokens = max_tokens if max_tokens is not None else self._max_tokens
        
        kwargs = {
            "model": self._model,
            "messages": messages,
            "temperature": temp,
            "max_tokens": tokens,
        }
        
        if response_json:
            # Note: Not all OpenRouter models support strict JSON mode, 
            # but we can try setting response_format if needed. 
            # For broad compatibility, we might just append a system instruction.
            kwargs["response_format"] = {"type": "json_object"}
            
        response = await self._client.chat.completions.create(**kwargs)
        
        text = response.choices[0].message.content or ""
        in_tokens = response.usage.prompt_tokens if response.usage else 0
        out_tokens = response.usage.completion_tokens if response.usage else 0
        
        return GenerationResult(
            text=text,
            input_tokens=in_tokens,
            output_tokens=out_tokens,
            model=self._model,
        )

    async def generate_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a text response token-by-token via OpenRouter."""
        temp = temperature if temperature is not None else self._temperature
        tokens = max_tokens if max_tokens is not None else self._max_tokens
        
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=temp,
            max_tokens=tokens,
            stream=True,
        )
        
        async for chunk in response:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
