from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/nyaysetu"
    
    # Ollama configurations
    ollama_host: str = "http://localhost:11434"
    drafter_model: str = "nyaysetu-drafter"
    fact_extractor_model: str = "qwen2.5:3B-instruct"
    vision_model: str = "qwen2.5vl:7b"
    embedding_model: str = "qwen3-embedding:0.6b"    
    # Thresholds
    evidence_strength_threshold: int = 60

    debug: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
