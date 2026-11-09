from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    APP_NAME: str = "The Desi Muchads Agency OS"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Database
    POSTGRES_USER: str = "muchad_admin"
    POSTGRES_PASSWORD: str = "muchad_secret_password_2026"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "muchadcrm_db"
    DATABASE_URL: str = "postgresql+asyncpg://muchad_admin:muchad_secret_password_2026@localhost:5432/muchadcrm_db"
    DATABASE_URL_SYNC: str = "postgresql://muchad_admin:muchad_secret_password_2026@localhost:5432/muchadcrm_db"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # JWT Authentication
    JWT_SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    JWT_REFRESH_SECRET_KEY: str = "8f4e2c9a1b3d5f7e6a8c0e2b4d6f8a0c2e4b6d8f0a2c4e6a8b0d2f4e6a8c0e2b"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Cryptography
    FERNET_ENCRYPTION_KEY: str = "yvG8s1n3M4u5n8w1x4b8k2n9m1p4q7r2s5t8u1v4w7x="

    # Storage (AWS S3)
    AWS_ACCESS_KEY_ID: str = "mock_aws_access_key"
    AWS_SECRET_ACCESS_KEY: str = "mock_aws_secret_key"
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET: str = "desi-muchads-media-vault"
    AWS_PRESIGNED_EXPIRATION_SECONDS: int = 3600

    # Resend Email
    RESEND_API_KEY: str = "re_mock_key_for_development"
    SYSTEM_EMAIL_SENDER: str = "notifications@thedesimuchads.com"

    # Stripe
    STRIPE_SECRET_KEY: str = "sk_test_mock_stripe_key"
    STRIPE_WEBHOOK_SECRET: str = "whsec_mock_stripe_webhook"
    DEFAULT_CURRENCY: str = "INR"

    # Google Gemini AI
    GEMINI_API_KEY: str = "mock_gemini_api_key"

    # Operational SLAs
    DEFAULT_SLA_RESPONSE_HOURS: int = 24
    CRITICAL_TASK_OVERDUE_ALERT_HOURS: int = 4
    IDLE_SESSION_REGULARIZATION_HOURS: int = 12
    LEAD_FOLLOW_UP_DECAY_HOURS: int = 48


settings = Settings()

