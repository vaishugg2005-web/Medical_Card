import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "DEVELOPMENT"
    DEBUG: bool = True
    APP_NAME: str = "Secure Emergency Medical Access System"
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "dev-insecure-secret-key-change-in-production-0123456789abcdef0123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    EMERGENCY_SESSION_EXPIRE_MINUTES: int = 15
    LOCAL_ENCRYPTION_KEY: str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

    # Database
    DATABASE_URL: str = "sqlite:///./medical_system.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000"

    # AI Provider
    AI_PROVIDER: str = "rule_based"  # rule_based | openai | ollama
    AI_API_KEY: str = ""
    AI_SERVICE_URL: str = "https://api.openai.com/v1"
    AI_MODEL_NAME: str = "gpt-4o-mini"

    # Storage
    STORAGE_PROVIDER: str = "local"
    LOCAL_STORAGE_DIR: str = "./storage/medical_documents"
    AWS_S3_BUCKET_NAME: str = ""
    AWS_REGION: str = "us-east-1"

    # Notifications
    NOTIFICATION_PROVIDER: str = "mock"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    EMERGENCY_SCAN_RATE_LIMIT_PER_MINUTE: int = 15

    # Demo Seed Passwords
    DEMO_PATIENT_PASSWORD: str = "PatientDemo123!"
    DEMO_DOCTOR_PASSWORD: str = "DoctorDemo123!"
    DEMO_ADMIN_PASSWORD: str = "AdminSecure123!"

    # Admin Registration Invite Secret
    # Set ADMIN_INVITE_SECRET in .env for production. Anyone with this secret can create a new admin.
    # Leave blank to disable public admin registration (use seeder admin account instead).
    ADMIN_INVITE_SECRET: str = "MEDORA-ADMIN-SETUP-2026"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
