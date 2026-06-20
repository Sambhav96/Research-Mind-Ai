"""Environment loader."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv


def load_environment() -> None:
    """Load environment variables from a .env file if present."""
    root = Path(__file__).resolve().parents[2]
    env_path = root / ".env"
    if env_path.exists():
        # Force override so uvicorn reloads pick up .env changes
        load_dotenv(dotenv_path=env_path, override=True)
