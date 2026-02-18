from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # App
    APP_NAME: str = "DiabetesDiet API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list = ["http://localhost:5173"]
    
    # ML
    ML_MODEL_PATH: str = "ml/diet_model.pkl"
    ML_SCALER_PATH: str = "ml/scaler.pkl"
    ML_ENCODER_PATH: str = "ml/label_encoder.pkl"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()