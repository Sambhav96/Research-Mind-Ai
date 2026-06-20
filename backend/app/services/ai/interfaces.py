"""AI Provider abstraction interfaces."""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncGenerator


@dataclass
class EmbeddingResult:
    """Result of an embedding operation."""
    embeddings: list[list[float]]
    total_tokens: int
    failed_count: int = 0
    failed_indices: list[int] = None

    def __post_init__(self):
        if self.failed_indices is None:
            self.failed_indices = []


@dataclass
class GenerationResult:
    """Result of a text generation operation."""
    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    model: str = ""


class AIEmbeddingProvider(ABC):
    """Abstract interface for embedding providers."""

    @abstractmethod
    async def embed_texts(self, texts: list[str]) -> EmbeddingResult:
        """Generate embeddings for a list of texts."""
        ...

    @abstractmethod
    async def embed_query(self, query: str) -> list[float]:
        """Generate a single query embedding."""
        ...

    @property
    @abstractmethod
    def dimensions(self) -> int:
        """Return the vector dimensions produced by this provider."""
        ...


class AIGenerationProvider(ABC):
    """Abstract interface for text generation providers."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        response_json: bool = False,
    ) -> GenerationResult:
        """Generate a text response from a prompt."""
        ...

    @abstractmethod
    async def generate_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """Stream a text response token-by-token."""
        ...
