"""Global exception handlers."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import AppError


def register_exception_handlers(app: FastAPI) -> None:
    """Register exception handlers on the FastAPI app."""

    logger = logging.getLogger("scholarmind.errors")

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = request.state.__dict__.get("request_id")
        logger.warning(
            "Validation error",
            extra={"request_id": request_id, "details": exc.errors()},
        )
        from fastapi.encoders import jsonable_encoder
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed",
                    "details": jsonable_encoder(exc.errors()),
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        request_id = request.state.__dict__.get("request_id")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": "http_error",
                    "message": exc.detail,
                    "details": None,
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        request_id = request.state.__dict__.get("request_id")
        logger.error(
            "Application error",
            extra={"request_id": request_id, "code": exc.code, "error_message": exc.message},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = request.state.__dict__.get("request_id")
        logger.exception("Unhandled exception", extra={"request_id": request_id})
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_server_error",
                    "message": "An unexpected error occurred",
                    "details": None,
                    "request_id": request_id,
                }
            },
        )
