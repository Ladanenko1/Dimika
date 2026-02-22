from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus
from typing import List, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    project_name: str = "DB Magaz Catalog API"
    api_v1_str: str = "/api/v1"

    # Optional full DSN. If not provided, it is built from PG_* variables.
    database_url: Optional[str] = None
    pg_host: str = "localhost"
    pg_port: int = 5432
    pg_name: str = "postgres"
    pg_password: str = "postgres"
    pg_db: str = "db_magaz"

    jwt_secret_key: str = "change_this_secret_in_production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_use_tls: bool = True
    feedback_to_email: str = "mail@mail.ru"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @model_validator(mode="after")
    def build_database_url_from_pg(self) -> "Settings":
        if self.database_url:
            return self

        user = quote_plus(self.pg_name)
        password = quote_plus(self.pg_password)
        self.database_url = (
            f"postgresql+psycopg://{user}:{password}@{self.pg_host}:{self.pg_port}/{self.pg_db}"
        )
        return self

    @property
    def cors_origins_list(self) -> List[str]:   # вместо list[str]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
