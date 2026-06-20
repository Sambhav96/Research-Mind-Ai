"""Application configuration using Pydantic Settings."""

from __future__ import annotations

import os
import secrets
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Base application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="ScholarMind AI", validation_alias="APP_NAME")
    app_version: str = Field(default="0.1.0", validation_alias="APP_VERSION")
    environment: Literal["development", "production"] = Field(
        default="development",
        validation_alias="ENVIRONMENT",
    )
    debug: bool = Field(default=False, validation_alias="DEBUG")

    host: str = Field(default="0.0.0.0", validation_alias="HOST")
    port: int = Field(default=8000, validation_alias="PORT")

    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")
    log_json: bool = Field(default=True, validation_alias="LOG_JSON")

    request_id_header: str = Field(
        default="X-Request-ID",
        validation_alias="REQUEST_ID_HEADER",
    )

    cors_allow_origins: list[str] = Field(
        default_factory=list,
        validation_alias="CORS_ALLOW_ORIGINS",
    )
    cors_allow_credentials: bool = Field(
        default=True,
        validation_alias="CORS_ALLOW_CREDENTIALS",
    )
    cors_allow_methods: list[str] = Field(
        default_factory=lambda: ["*"],
        validation_alias="CORS_ALLOW_METHODS",
    )
    cors_allow_headers: list[str] = Field(
        default_factory=lambda: ["*"],
        validation_alias="CORS_ALLOW_HEADERS",
    )

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@db:5432/scholarmind",
        validation_alias="DATABASE_URL",
    )

    db_pool_size: int = Field(default=10, validation_alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, validation_alias="DB_MAX_OVERFLOW")
    db_pool_timeout: int = Field(default=30, validation_alias="DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(default=1800, validation_alias="DB_POOL_RECYCLE")
    db_echo: bool = Field(default=False, validation_alias="DB_ECHO")

    db_connection_retry_attempts: int = Field(
        default=5,
        validation_alias="DB_CONNECTION_RETRY_ATTEMPTS",
    )
    db_connection_retry_min_seconds: float = Field(
        default=0.5,
        validation_alias="DB_CONNECTION_RETRY_MIN_SECONDS",
    )
    db_connection_retry_max_seconds: float = Field(
        default=5.0,
        validation_alias="DB_CONNECTION_RETRY_MAX_SECONDS",
    )

    jwt_secret_key: str = Field(
        default_factory=lambda: secrets.token_urlsafe(48),
        validation_alias="JWT_SECRET_KEY",
    )
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    jwt_access_token_minutes: int = Field(
        default=15,
        validation_alias="JWT_ACCESS_TOKEN_MINUTES",
    )
    jwt_refresh_token_days: int = Field(
        default=7,
        validation_alias="JWT_REFRESH_TOKEN_DAYS",
    )
    jwt_issuer: str = Field(default="scholarmind.ai", validation_alias="JWT_ISSUER")
    jwt_audience: str = Field(default="scholarmind.api", validation_alias="JWT_AUDIENCE")
    password_hash_rounds: int = Field(default=10, validation_alias="PASSWORD_HASH_ROUNDS")

    storage_root: str = Field(default="./storage", validation_alias="STORAGE_ROOT")
    upload_max_size_mb: int = Field(default=25, validation_alias="UPLOAD_MAX_SIZE_MB")

    openai_api_key: str = Field(default="", validation_alias="OPENAI_API_KEY")  # kept for rollback only
    gemini_api_key: str = Field(default="", validation_alias="GEMINI_API_KEY")
    smtp_server: str = Field(default="smtp.gmail.com", validation_alias="SMTP_SERVER")
    smtp_port: int = Field(default=587, validation_alias="SMTP_PORT")
    smtp_username: str = Field(default="", validation_alias="SMTP_USERNAME")
    smtp_password: str = Field(default="", validation_alias="SMTP_PASSWORD")
    smtp_from_email: str = Field(default="", validation_alias="SMTP_FROM_EMAIL")
    ai_provider: str = Field(default="gemini", validation_alias="AI_PROVIDER")

    # Gemini generation settings
    gemini_model: str = Field(default="models/gemini-2.5-flash", validation_alias="GEMINI_MODEL")
    gemini_temperature: float = Field(default=0.2, validation_alias="GEMINI_TEMPERATURE")
    gemini_max_tokens: int = Field(default=4096, validation_alias="GEMINI_MAX_TOKENS")

    # OpenRouter fallback settings
    openrouter_api_key: str = Field(default="", validation_alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(default="meta-llama/llama-3-8b-instruct", validation_alias="OPENROUTER_MODEL")

    # Gemini embedding settings
    gemini_embedding_model: str = Field(default="models/gemini-embedding-001", validation_alias="GEMINI_EMBEDDING_MODEL")
    embedding_model: str = Field(default="models/gemini-embedding-001", validation_alias="EMBEDDING_MODEL")
    embedding_dimensions: int = Field(default=3072, validation_alias="EMBEDDING_DIMENSIONS")
    embedding_batch_size: int = Field(default=10, validation_alias="EMBEDDING_BATCH_SIZE")
    embedding_max_retries: int = Field(default=3, validation_alias="EMBEDDING_MAX_RETRIES")
    embedding_retry_min_seconds: float = Field(default=5.0, validation_alias="EMBEDDING_RETRY_MIN_SECONDS")
    embedding_retry_max_seconds: float = Field(default=60.0, validation_alias="EMBEDDING_RETRY_MAX_SECONDS")
    embedding_cost_per_million_tokens: float = Field(default=0.0, validation_alias="EMBEDDING_COST_PER_MILLION_TOKENS")

    chat_max_context_chunks: int = Field(default=5, validation_alias="CHAT_MAX_CONTEXT_CHUNKS")
    chat_similarity_threshold: float = Field(default=0.3, validation_alias="CHAT_SIMILARITY_THRESHOLD")
    chat_max_history_messages: int = Field(default=20, validation_alias="CHAT_MAX_HISTORY_MESSAGES")

    @field_validator("cors_allow_origins", "cors_allow_methods", "cors_allow_headers", mode="before")
    @classmethod
    def _split_csv(cls, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return []


class DevSettings(Settings):
    """Development configuration overrides."""

    debug: bool = True
    log_level: str = "DEBUG"
    log_json: bool = False
    cors_allow_origins: list[str] = ["*"]


class ProdSettings(Settings):
    """Production configuration overrides."""

    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = True


import logging
logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings based on environment."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env == "production":
        settings = ProdSettings()
    else:
        settings = DevSettings()
        
    logger.warning(f"Config loaded key prefix: {settings.gemini_api_key[:12]}")
    return settings
