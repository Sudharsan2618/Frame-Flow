"""Application configuration using Pydantic Settings."""

import secrets
import logging

from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
import os
load_dotenv()

_config_logger = logging.getLogger(__name__)


def _get_secret_key() -> str:
    """Return SECRET_KEY from env, or generate a secure random one with a warning."""
    key = os.getenv("SECRET_KEY", "")
    if not key or key in ("dev-secret-key-change-in-production", "your-super-secret-key-change-this"):
        generated = secrets.token_urlsafe(64)
        _config_logger.warning(
            "[SECURITY] Using auto-generated SECRET_KEY — set SECRET_KEY env var for production! "
            "Tokens will be invalidated on restart."
        )
        return generated
    return key


class Settings(BaseSettings):
    # ── App ──
    APP_NAME: str = "RecruitLMS"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # ── Security ──
    SECRET_KEY: str = _get_secret_key()
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_HOURS_USER: int = 24    # Student/Company refresh token: 1 day
    REFRESH_TOKEN_EXPIRE_HOURS_ADMIN: int = 3    # Admin refresh token: 3 hours
    ALGORITHM: str = "HS256"

    # ── PostgreSQL ──
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST")
    POSTGRES_PORT: int = os.getenv("POSTGRES_PORT")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB")

    # ── GCP Cloud Storage ──
    GCS_BUCKET_NAME: str = os.getenv("GCS_BUCKET_NAME")
    GCS_PROJECT_ID: str = os.getenv("GCS_PROJECT_ID")
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL")
    COURSE_ASSET_PREFIX: str = os.getenv("COURSE_ASSET_PREFIX", "courses")
    # ── MongoDB (Learning Analytics & xAPI) ──
    MONGODB_URL: str = os.getenv("MONGODB_URL")
    MONGODB_DB: str = os.getenv("MONGODB_DB")

    # ── Frontend (CORS) ──
    FRONTEND_URL: str = os.getenv("FRONTEND_URL")

    # ── Razorpay (Payment Gateway) ──
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")

    # ── Novu (Notification System) ──
    NOVU_API_KEY: str = os.getenv("NOVU_API_KEY", "")

    # ── SMTP (Password Reset Emails) ──
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "SkillBridge")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Synchronous URL for Alembic migrations and seed scripts."""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
