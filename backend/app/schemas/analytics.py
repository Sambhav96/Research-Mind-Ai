from pydantic import BaseModel

class WeeklyActivityItem(BaseModel):
    day: str
    hours: float
    count: int

class AIUsageMetric(BaseModel):
    label: str
    value: int
    max: int

class AnalyticsSummaryResponse(BaseModel):
    papers: int
    processed: int
    chats: int
    flashcards: int
    quizzes: int
    notes: int
    score: int
    study_time: int
    weekly_activity: list[WeeklyActivityItem]
    ai_usage: list[AIUsageMetric]
    feature_distribution: dict[str, int]

class TimelineDataResponse(BaseModel):
    date: str
    chats: int
    flashcards: int
    quizzes: int
    notes: int
    total: int

class TopPaperResponse(BaseModel):
    id: str
    title: str
    views: int
    chat_questions: int
    flashcards: int
    quizzes: int
    notes: int
    total_interactions: int

class StreakAnalyticsResponse(BaseModel):
    current_streak: int
    best_streak: int
    last_active_day: str | None = None
    study_consistency: int
