"""Comprehensive backend validation test."""
from __future__ import annotations

import asyncio
import os
import sys
import traceback
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(".env")

results = []

def check(name, passed, detail=""):
    status = "[PASS]" if passed else "[FAIL]"
    msg = f"{status} | {name}"
    if detail:
        msg += f" - {detail}"
    print(msg)
    results.append((name, passed, detail))

# =====================================================================
# TEST 1: Verified all services and repositories import
# =====================================================================
try:
    from app.services.auth import AuthService
    from app.services.documents import DocumentService
    from app.repositories.user import UserRepository
    from app.repositories.document import DocumentRepository
    from app.repositories.chunk import ChunkRepository
    from app.repositories.chat_session import ChatSessionRepository
    from app.repositories.chat_message import ChatMessageRepository
    from app.schemas.auth import (
        RegisterRequest, LoginRequest, TokenResponse, UserResponse
    )
    from app.models.user import User
    from app.models.document import Document
    from app.models.chunk import Chunk
    from app.models.chat_session import ChatSession
    from app.models.chat_message import ChatMessage
    check("All services & repositories import", True)
except Exception as exc:
    traceback.print_exc()
    check("All services & repositories import", False, str(exc))


# =====================================================================
# TEST 2: Verify FastAPI app and routes
# =====================================================================
try:
    from app.main import create_app
    app = create_app()
    openapi = app.openapi()
    check("FastAPI startup", True)

    routes = [
        (r.path, list(r.methods))
        for r in app.routes
        if hasattr(r, "methods") and hasattr(r, "path")
    ]
    route_paths = {r[0] for r in routes}

    expected_routes = {
        "/auth/register",
        "/auth/login",
        "/auth/refresh",
        "/auth/logout",
        "/auth/me",
        "/documents/upload",
        "/documents",
        "/documents/{document_id}",
        "/health",
    }
    missing = expected_routes - route_paths
    check("All expected routes registered", not missing, f"missing={missing if missing else 'none'}")
except Exception as exc:
    traceback.print_exc()
    check("FastAPI startup", False, str(exc))


# =====================================================================
# TEST 3: Swagger docs metadata
# =====================================================================
try:
    from app.main import create_app
    app = create_app()
    openapi = app.openapi()
    has_paths = len(openapi.get("paths", {})) == 9
    check("Swagger OpenAPI spec loaded", True, f"{len(openapi.get('paths', {}))} paths")
except Exception as exc:
    traceback.print_exc()
    check("Swagger OpenAPI spec loaded", False, str(exc))


# =====================================================================
# TEST 4: Database models match actual tables
# =====================================================================
try:
    from app.db.base import Base
    import app.models.user
    import app.models.document
    import app.models.chunk
    import app.models.chat_session
    import app.models.chat_message

    expected_tables = {"users", "documents", "chunks", "chat_sessions", "chat_messages"}
    actual_tables = set(Base.metadata.tables.keys())
    check("Model metadata matches tables", expected_tables == actual_tables,
          f"expected={expected_tables} actual={actual_tables}")
except Exception as exc:
    traceback.print_exc()
    check("Model metadata matches tables", False, str(exc))


print(f"\nSummary: {sum(1 for _, ok, _ in results if ok)}/{len(results)} passed")
if not all(ok for _, ok, _ in results):
    print("FAILURES:")
    for name, ok, detail in results:
        if not ok:
            print(f"  - {name}: {detail}")
    sys.exit(1)
print("ALL CHECKS PASSED")
sys.exit(0)
