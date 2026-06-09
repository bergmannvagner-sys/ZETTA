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
    data_encryption_key: str | None = None
    cors_origins: str = ""
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    ai_temperature: float = 0.7
    ai_timeout_seconds: int = 30
    super_admin_email: str = "admin@example.com"
    super_admin_password: str | None = None
    super_admin_bootstrap_on_startup: bool = False
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    admin_alert_email: str | None = None
    password_reset_url: str = "meuapp://reset-password"
    public_api_url: str | None = None
    billing_webhooks_enabled: bool = False
    billing_webhook_secret: str | None = None
    mercado_pago_access_token: str | None = None
    mercado_pago_public_key: str | None = None
    mercado_pago_webhook_secret: str | None = None
    mercado_pago_success_url: str | None = "meuapp://pagamento/sucesso"
    mercado_pago_pending_url: str | None = "meuapp://pagamento/pendente"
    mercado_pago_failure_url: str | None = "meuapp://pagamento/erro"
    daily_api_key: str | None = None
    daily_api_url: str = "https://api.daily.co/v1"
    daily_room_expire_hours: int = 8
    daily_join_token_expire_minutes: int = 180
    billing_pending_alerts_auto_enabled: bool = False
    billing_pending_alerts_auto_days: int = 7
    billing_pending_alerts_auto_interval_hours: int = 24
    billing_pending_alerts_auto_limit: int = 50
    auth_rate_limit_requests: int = 20
    auth_rate_limit_window_seconds: int = 300
    password_reset_rate_limit_requests: int = 5
    password_reset_rate_limit_window_seconds: int = 900
    chat_rate_limit_requests: int = 30
    chat_rate_limit_window_seconds: int = 60
    sos_rate_limit_requests: int = 6
    sos_rate_limit_window_seconds: int = 300

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
    def admin_alert_recipient(self) -> str | None:
        if self.admin_alert_email:
            return self.admin_alert_email
        if self.super_admin_email != "admin@example.com":
            return self.super_admin_email
        return None

    @property
    def mercado_pago_configured(self) -> bool:
        return bool(
            self.mercado_pago_access_token
            and self.mercado_pago_public_key
            and self.mercado_pago_webhook_secret
        )

    @property
    def daily_configured(self) -> bool:
        return bool(self.daily_api_key)

    @property
    def data_encryption_secret(self) -> str:
        secret = (self.data_encryption_key or "").strip()
        if secret:
            return secret
        if self.is_production:
            raise RuntimeError("DATA_ENCRYPTION_KEY is required in production")
        return self.jwt_secret_key


@lru_cache
def get_settings() -> Settings:
    return Settings()
