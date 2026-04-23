from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings"""
    anthropic_api_key: str = ""
    groq_api_key: str = ""
    nvidia_api_key: str = ""
    nvidia_model: str = "deepseek-ai/deepseek-v3.2"
    environment: str = "development"
    port: int = 8000
    cors_origins: list = ["http://localhost:3000", "http://localhost:5173", "https://globalpositions.online", "https://www.globalpositions.online", "https://globalpositions-online.vercel.app"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
