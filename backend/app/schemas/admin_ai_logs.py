"""Schemas for Admin AI Monitoring."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class ProviderStats(BaseModel):
    provider: str
    success_rate: float
    error_rate: float
    avg_latency: int


class AdminAIMetricsResponse(BaseModel):
    total_requests: int
    daily_requests: int
    avg_latency: int
    failed_requests: int
    provider_stats: list[ProviderStats]


class AILogResponse(BaseModel):
    id: str
    prompt: str | None
    timestamp: str
    model: str
    provider: str
    status: str


class AdminAILogsListResponse(BaseModel):
    logs: list[AILogResponse]
    total: int = 0


class AIChartPoint(BaseModel):
    date: str
    requests: int


class AdminAIChartsResponse(BaseModel):
    daily_usage: list[AIChartPoint]
    weekly_usage: list[Any] = []
    monthly_usage: list[Any] = []
