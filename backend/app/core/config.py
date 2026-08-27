from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application Settings
    Centralized configuration using Pydantic BaseSettings.
    Allows easy environment variable overrides while maintaining sensible defaults.
    """
    PROJECT_NAME: str = "Fleet Management API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration (SQLite local file by default, future-proof for PostgreSQL)
    # SQLite URL: sqlite:///./fleet.db
    # PostgreSQL URL example: postgresql://user:password@localhost:5432/fleet_db
    DATABASE_URL: str = "sqlite:///./fleet.db"
    
    # CORS Origins allowed for React + TypeScript frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite dev server default
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()
