"""FastAPI application factory and entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.admin import router as admin_router
from app.api.admin_billing import router as admin_billing_router
from app.api.admin_devops import router as admin_devops_router
from app.api.admin_management import router as admin_management_router
from app.api.admin_ai_monitoring import router as admin_ai_monitoring_router
from app.api.admin_analytics import router as admin_analytics_router
from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.billing import router as billing_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.flashcards import router as flashcards_router
from app.api.health import router as health_router
from app.api.notes import router as notes_router
from app.api.quiz import router as quiz_router
from app.api.search import router as search_router
from app.api.workspaces import router as workspaces_router
from app.api.study_sessions import router as study_sessions_router
from app.core.config import get_settings
from app.core.env import load_environment
from app.core.exception_handlers import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import register_middleware
from app.db.session import verify_database_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    setup_logging(settings)
    app.logger = app.logger if hasattr(app, "logger") else None
    app_logger = app.logger or __import__("logging").getLogger("scholarmind.app")
    app_logger.info("Application startup", extra={"environment": settings.environment})
    await verify_database_connection()
    yield
    app_logger.info("Application shutdown", extra={"environment": settings.environment})


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    load_environment()
    settings = get_settings()
    setup_logging(settings)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    register_middleware(app, settings)
    register_exception_handlers(app)

    app.include_router(admin_router)
    app.include_router(admin_billing_router)
    app.include_router(admin_devops_router)
    app.include_router(admin_management_router)
    app.include_router(admin_ai_monitoring_router)
    app.include_router(admin_analytics_router)
    app.include_router(auth_router)
    app.include_router(billing_router)
    app.include_router(chat_router)
    app.include_router(documents_router)
    app.include_router(flashcards_router)
    app.include_router(quiz_router)
    app.include_router(search_router)
    app.include_router(analytics_router)
    app.include_router(notes_router)
    app.include_router(workspaces_router)
    app.include_router(study_sessions_router)
    app.include_router(health_router)

    return app


app = create_app()

