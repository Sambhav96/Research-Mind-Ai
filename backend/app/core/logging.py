"""Structured logging setup."""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone

from app.core.config import Settings


class JSONFormatter(logging.Formatter):
    """JSON log formatter for structured logs."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key in (
            "request_id",
            "method",
            "path",
            "status_code",
            "duration_ms",
            "client_ip",
            "environment",
        ):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        return json.dumps(payload)


def setup_logging(settings: Settings) -> None:
    """Configure application logging."""
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    if settings.log_json:
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S%z",
            )
        )

    root_logger.addHandler(handler)

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(name)
        logger.handlers = []
        logger.propagate = True
        logger.setLevel(level)
