"""Configuration for AI Engine"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # API Keys
    anthropic_api_key: str = ""

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/viraworkx"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # API Settings
    api_host: str = "0.0.0.0"
    api_port: int = 5001

    # Node.js API for callbacks
    node_api_url: str = "http://localhost:4000"

    # AI Model Settings
    default_model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 4096
    temperature: float = 0.3

    # HITL Settings
    require_approval_threshold: int = 70  # Require HR approval for match scores below this
    auto_reject_threshold: int = 40  # Auto-reject candidates below this score

    model_config = {
        "env_file": "../../.env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"  # Ignore extra env vars not defined in Settings
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
