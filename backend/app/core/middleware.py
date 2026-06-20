"""Application middleware registration."""

from __future__ import annotations

import logging
import time
import uuid
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings


class RequestIdMiddleware:
    """Attach a request ID to each request/response and log request metrics."""

    def __init__(self, app: Callable, settings: Settings) -> None:
        self.app = app
        self.settings = settings
        self.logger = logging.getLogger("scholarmind.http")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = uuid.uuid4().hex
        start = time.perf_counter()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                headers.append((self.settings.request_id_header.encode(), request_id.encode()))
            await send(message)

        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["request_id"] = request_id

        await self.app(scope, receive, send_wrapper)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        path = scope.get("path")
        method = scope.get("method")
        client = scope.get("client")
        client_ip = client[0] if client else None
        self.logger.info(
            "request completed",
            extra={
                "request_id": request_id,
                "method": method,
                "path": path,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
            },
        )


def register_middleware(app: FastAPI, settings: Settings) -> None:
    """Register middleware with the FastAPI app."""
    # NOTE: Starlette applies middleware in reverse registration order.
    # The LAST middleware added becomes the OUTERMOST wrapper.
    # CORS must be outermost so it can intercept OPTIONS preflight before anything else.
    app.add_middleware(RequestIdMiddleware, settings=settings)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )
