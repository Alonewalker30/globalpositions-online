from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings"""
    anthropic_api_key: str = ""
    groq_api_key: str = ""
    environment: str = "development"
    port: int = 8000
    cors_origins: list = ["http://localhost:3000", "http://localhost:5173", "https://globalpositions.online", "https://www.globalpositions.online"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
