"""Gemini AI Provider — embeddings and generation via google-genai SDK."""
from __future__ import annotations

import asyncio
import logging
import time
from typing import AsyncGenerator

from google import genai
from google.genai import types
from google.genai.errors import ClientError, APIError

from app.services.ai.interfaces import (
    AIEmbeddingProvider,
    AIGenerationProvider,
    EmbeddingResult,
    GenerationResult,
)

logger = logging.getLogger("scholarmind.gemini")

_EMBED_MODEL = "models/gemini-embedding-001"
_GEN_MODEL = "models/gemini-2.5-flash"
_EMBED_DIMS = 3072
_BATCH_SIZE = 10          # Gemini free-tier: stay within per-minute limits
_MAX_RETRIES = 3
_RETRY_BASE = 5.0         # seconds, exponential


def _make_client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


class GeminiEmbeddingProvider(AIEmbeddingProvider):
    """Gemini embedding provider using gemini-embedding-001 (3072 dims)."""

    def __init__(self, api_key: str) -> None:
        self._client = _make_client(api_key)
        self._logger = logger

    @property
    def dimensions(self) -> int:
        return _EMBED_DIMS

    async def embed_texts(self, texts: list[str]) -> EmbeddingResult:
        """Embed a list of texts in batches with retry on 429."""
        if not texts:
            return EmbeddingResult(embeddings=[], total_tokens=0)

        all_embeddings: list[list[float]] = []
        failed_indices: list[int] = []
        batches = [texts[i: i + _BATCH_SIZE] for i in range(0, len(texts), _BATCH_SIZE)]
        base_offset = 0

        for batch in batches:
            batch_embeddings = await self._embed_batch_with_retry(batch)
            for idx, vec in enumerate(batch_embeddings):
                if vec is None:
                    failed_indices.append(base_offset + idx)
                    all_embeddings.append([])
                else:
                    all_embeddings.append(vec)
            base_offset += len(batch)

        return EmbeddingResult(
            embeddings=all_embeddings,
            total_tokens=0,  # Gemini doesn't report token counts for embeddings
            failed_count=len(failed_indices),
            failed_indices=failed_indices,
        )

    async def embed_query(self, query: str) -> list[float]:
        """Embed a single query string."""
        result = await self.embed_texts([query])
        if result.failed_count > 0 or not result.embeddings:
            raise RuntimeError("Failed to generate query embedding from Gemini.")
        return result.embeddings[0]

    async def _embed_batch_with_retry(self, texts: list[str]) -> list[list[float] | None]:
        """Embed a single batch, retrying on rate-limit errors."""
        for attempt in range(_MAX_RETRIES):
            try:
                response = await asyncio.to_thread(
                    self._client.models.embed_content,
                    model=_EMBED_MODEL,
                    contents=texts,
                )
                return [list(e.values) for e in response.embeddings]
            except ClientError as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    wait = _RETRY_BASE * (2 ** attempt)
                    self._logger.warning(
                        f"Gemini embedding rate-limited. Waiting {wait}s (attempt {attempt+1}/{_MAX_RETRIES})"
                    )
                    await asyncio.sleep(wait)
                else:
                    self._logger.error(f"Gemini embedding error: {e}")
                    raise
            except Exception as e:
                self._logger.error(f"Unexpected embedding error: {e}")
                raise

        self._logger.error("Gemini embedding failed after all retries")
        return [None] * len(texts)


class GeminiGenerationProvider(AIGenerationProvider):
    """Gemini generation provider using gemini-2.5-flash."""

    def __init__(self, api_key: str, model: str = _GEN_MODEL, temperature: float = 0.2, max_tokens: int = 4096) -> None:
        self._client = _make_client(api_key)
        self._model = model
        self._temperature = temperature
        self._max_tokens = max_tokens

        logger.warning(f"Provider received key prefix: {api_key[:12]}")

        self._logger = logger

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_json: bool = False,
    ) -> GenerationResult:
        """Generate text from a prompt with optional system instruction."""
        temp = temperature if temperature is not None else self._temperature
        tokens = max_tokens if max_tokens is not None else self._max_tokens

        # Build contents: system instruction as first user turn if present
        if system:
            full_prompt = f"{system}\n\n{prompt}"
        else:
            full_prompt = prompt

        config_kwargs: dict = {"temperature": temp, "max_output_tokens": tokens}
        if response_json:
            config_kwargs["response_mime_type"] = "application/json"

        for attempt in range(_MAX_RETRIES):
            try:
                response = await asyncio.to_thread(
                    self._client.models.generate_content,
                    model=self._model,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(**config_kwargs),
                )
                text = response.text or ""
                usage = response.usage_metadata
                return GenerationResult(
                    text=text,
                    input_tokens=getattr(usage, "prompt_token_count", 0),
                    output_tokens=getattr(usage, "candidates_token_count", 0),
                    model=self._model,
                )
            except (ClientError, APIError) as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "503" in str(e) or "UNAVAILABLE" in str(e):
                    wait = _RETRY_BASE * (2 ** attempt)
                    self._logger.warning(f"Gemini generation rate-limited/unavailable. Waiting {wait}s")
                    await asyncio.sleep(wait)
                else:
                    self._logger.error(f"Gemini generation error: {e}")
                    raise
            except Exception as e:
                self._logger.error(f"Unexpected generation error: {e}")
                raise

        raise RuntimeError("Gemini generation failed after all retries.")

    async def generate_with_messages(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> GenerationResult:
        """Generate from an OpenAI-style messages list (system + user + assistant)."""
        # Convert messages → single prompt string preserving roles
        parts: list[str] = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                parts.insert(0, content)  # system goes first
            elif role == "assistant":
                parts.append(f"Assistant: {content}")
            else:
                parts.append(content)
        combined = "\n\n".join(parts)
        return await self.generate(combined, temperature=temperature, max_tokens=max_tokens)

    async def generate_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream generation token by token from a messages list."""
        temp = temperature if temperature is not None else self._temperature
        tokens = max_tokens if max_tokens is not None else self._max_tokens

        parts: list[str] = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                parts.insert(0, content)
            elif role == "assistant":
                parts.append(f"Assistant: {content}")
            else:
                parts.append(content)
        combined = "\n\n".join(parts)

        config = types.GenerateContentConfig(
            temperature=temp,
            max_output_tokens=tokens,
        )

        try:
            # Gemini streaming runs synchronously; wrap in thread and yield
            stream = await asyncio.to_thread(
                lambda: list(self._client.models.generate_content_stream(
                    model=self._model,
                    contents=combined,
                    config=config,
                ))
            )
            for chunk in stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            self._logger.error(f"Gemini stream error: {e}")
            raise
