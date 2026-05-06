from typing import Union
from pydantic import field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings"""
    # Job sources
    adzuna_app_id: str = ""
    adzuna_api_key: str = ""
    # AI providers — priority: cerebras → nvidia → groq → together → anthropic
    cerebras_api_key: str = ""
    together_api_key: str = ""
    tinyfish_api_key: str = ""
    anthropic_api_key: str = ""
    groq_api_key: str = ""
    nvidia_api_key: str = ""
    nvidia_model: str = "meta/llama-3.3-70b-instruct"
    nvidia_fast_model: str = "meta/llama-3.1-8b-instruct"
    environment: str = "development"
    port: int = 8000
    cors_origins: Union[str, list] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://globalpositions.online",
        "https://www.globalpositions.online",
        "https://globalpositions-online.vercel.app",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
