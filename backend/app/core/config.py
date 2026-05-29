from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_name: str = "ZETTA Bergmann API"
    api_v1_prefix: str = ""
    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    cors_origins: str = ""
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    ai_temperature: float = 0.7
    ai_timeout_seconds: int = 30
    super_admin_email: str = "admin@bergmann.local"
    super_admin_password: str | None = None
    super_admin_bootstrap_on_startup: bool = False
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    password_reset_url: str = "bergmann://reset-password"
    public_api_url: str | None = None
    billing_webhooks_enabled: bool = False
    billing_webhook_secret: str | None = None
    mercado_pago_access_token: str | None = None
    mercado_pago_public_key: str | None = None
    mercado_pago_webhook_secret: str | None = None
    mercado_pago_sandbox_mode: bool = True
    mercado_pago_success_url: str | None = None
    mercado_pago_failure_url: str | None = None
    mercado_pago_pending_url: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from_email)

    @property
    def mercado_pago_configured(self) -> bool:
        return bool(self.mercado_pago_access_token and self.mercado_pago_public_key)

    @property
    def mercado_pago_webhook_configured(self) -> bool:
        return bool(self.mercado_pago_webhook_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
