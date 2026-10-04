"""Application configuration."""
from pydantic import ConfigDict
import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    APP_NAME: str = "Geospatial File Measurement API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./geo_api.db"

    # File storage
    UPLOAD_DIR: Path = Path("uploads")
    MAX_FILE_SIZE_MB: int = 100

    # Allowed file extensions
    ALLOWED_EXTENSIONS: list[str] = [".zip", ".kml"]

    model_config = ConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()

# Ensure upload directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
