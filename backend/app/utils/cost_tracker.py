"""Embedding cost tracking utilities."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import NamedTuple

from app.core.config import get_settings

logger = logging.getLogger("scholarmind.cost_tracker")


class CostSummary(NamedTuple):
    """Summary of embedding costs."""

    total_tokens: int
    total_embeddings: int
    estimated_cost_usd: float
    batches: int


@dataclass
class EmbeddingCostTracker:
    """Track token usage and cost across embedding calls."""

    env: str = field(default_factory=lambda: get_settings().environment)
    total_tokens: int = 0
    total_embeddings: int = 0
    batch_count: int = 0
    _cost_per_million_tokens: float = field(
        default_factory=lambda: get_settings().embedding_cost_per_million_tokens
    )

    def record_batch(self, token_count: int, embedding_count: int) -> CostSummary:
        """Record a completed embedding batch."""
        self.total_tokens += token_count
        self.total_embeddings += embedding_count
        self.batch_count += 1
        return self.get_summary()

    def get_summary(self) -> CostSummary:
        """Return current cumulative cost summary."""
        cost = (self.total_tokens / 1_000_000) * self._cost_per_million_tokens
        return CostSummary(
            total_tokens=self.total_tokens,
            total_embeddings=self.total_embeddings,
            estimated_cost_usd=round(cost, 6),
            batches=self.batch_count,
        )

    def reset(self) -> None:
        """Reset all accumulated counters."""
        self.total_tokens = 0
        self.total_embeddings = 0
        self.batch_count = 0

    def log_summary(self) -> None:
        """Emit a structured log entry with cost summary."""
        summary = self.get_summary()
        logger.info(
            "Embedding cost summary",
            extra={
                "environment": self.env,
                "total_tokens": summary.total_tokens,
                "total_embeddings": summary.total_embeddings,
                "estimated_cost_usd": summary.estimated_cost_usd,
                "batches": summary.batches,
            },
        )