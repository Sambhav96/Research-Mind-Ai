"""API package."""

from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.flashcards import router as flashcards_router
from app.api.health import router as health_router
from app.api.notes import router as notes_router
from app.api.quiz import router as quiz_router
from app.api.search import router as search_router
from app.api.workspaces import router as workspaces_router

__all__ = [
    "analytics_router",
    "auth_router",
    "chat_router",
    "documents_router",
    "flashcards_router",
    "health_router",
    "notes_router",
    "quiz_router",
    "search_router",
    "workspaces_router",
]
