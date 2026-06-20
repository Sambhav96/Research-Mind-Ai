"""Application-level errors."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class AppError(Exception):
    """Base application exception."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Any | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)
