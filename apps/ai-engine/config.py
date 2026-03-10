"""Configuration for AI Engine — merged with ATS config fields"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # -- App --
    APP_NAME: str = "ViraWorkX ATS"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"
    API_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"

    # API Keys
    anthropic_api_key: str = ""
    ANTHROPIC_API_KEY: str = ""

    # -- Database (async for ATS models) --
    DATABASE_URL: str = "postgresql+asyncpg://viraworkx:viraworkx123@localhost:5432/viraworkx"
    DATABASE_URL_SYNC: str = "postgresql://viraworkx:viraworkx123@localhost:5432/viraworkx"

    # Legacy database_url for existing ai-engine code
    database_url: str = "postgresql://viraworkx:viraworkx123@localhost:5432/viraworkx"

    # -- Redis --
    redis_url: str = "redis://localhost:6379"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"

    # -- Auth (JWT) --
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # -- Email (IMAP Intake) --
    IMAP_HOST: str = "imap.gmail.com"
    IMAP_PORT: int = 993
    IMAP_EMAIL: str = "jobs@viraworkx.ai"
    IMAP_PASSWORD: str = ""

    # -- Email (SendGrid) --
    FROM_EMAIL: str = "noreply@viraworkx.ai"
    FROM_NAME: str = "ViraWorkX"
    SENDGRID_API_KEY: str = ""

    # -- S3 / File Storage --
    S3_BUCKET: str = "viraworkx-ats-files"
    S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_ENDPOINT_URL: str = ""

    # -- Scoring Weights --
    CODING_WEIGHT: float = 0.50
    COMMUNICATION_WEIGHT: float = 0.30
    PSYCHOMETRIC_WEIGHT: float = 0.20

    # -- Tier Thresholds --
    TIER_1_MIN: int = 85
    TIER_2_MIN: int = 70
    TIER_3_MIN: int = 60

    # -- API Settings (existing ai-engine) --
    api_host: str = "0.0.0.0"
    api_port: int = 5001

    # Node.js API for callbacks
    node_api_url: str = "http://localhost:4000"

    # AI Model Settings
    default_model: str = "claude-opus-4-6"
    max_tokens: int = 4096
    temperature: float = 0.3

    # HITL Settings
    require_approval_threshold: int = 70
    auto_reject_threshold: int = 40

    model_config = {
        "env_file": "../../.env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
