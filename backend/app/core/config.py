import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Recovery Copilot"
    VERSION: str = "2.4.0"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database
    DATABASE_URL: str = "sqlite:///./recovery_copilot.db"

    # LLM Providers (Gemini 2.5 Flash is Primary, Claude is Optional)
    GEMINI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    # Razorpay Test API Keys
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None

    # RBAC API Keys
    ADMIN_API_KEY: str = "rc-admin-secret-key-2026"
    OPS_API_KEY: str = "rc-ops-secret-key-2026"

    # Outage Simulation Flag for "What Broke" narrative
    SIMULATE_MESSAGING_OUTAGE: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

settings = Settings()
