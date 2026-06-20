"""Admin overview statistics schemas."""

from __future__ import annotations

from pydantic import BaseModel


class UsersStats(BaseModel):
    total: int
    active_24h: int
    active_7d: int
    active_30d: int
    new_today: int
    new_this_month: int
    active_subscriptions: int
    revenue: float


class DocumentStats(BaseModel):
    total_uploaded: int
    total_processed: int
    failed_processing: int
    storage_usage_bytes: int


class AiUsageStats(BaseModel):
    total_chats: int
    ai_requests: int
    token_consumption: int
    failed_requests: int


class LearningStats(BaseModel):
    flashcards_generated: int
    quizzes_generated: int
    notes_generated: int


class ResearchStats(BaseModel):
    workspaces_created: int
    papers_uploaded: int


class ChartDataPoint(BaseModel):
    date: str
    count: int


class ChartData(BaseModel):
    user_growth: list[ChartDataPoint]
    document_growth: list[ChartDataPoint]
    ai_usage_trend: list[ChartDataPoint]
    daily_activity: list[ChartDataPoint]


class RecentActivityItem(BaseModel):
    id: str
    type: str
    title: str
    time: str


class SystemHealth(BaseModel):
    frontend: str
    backend: str
    database: str
    failed_background_jobs: int


class AdminOverviewResponse(BaseModel):
    users: UsersStats
    documents: DocumentStats
    ai_usage: AiUsageStats
    learning: LearningStats
    research: ResearchStats
    charts: ChartData
    recent_activity: list[RecentActivityItem]
    system_health: SystemHealth
